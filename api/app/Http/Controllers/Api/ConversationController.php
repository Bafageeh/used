<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use Illuminate\Http\Request;

class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $rows = Conversation::query()
            ->where(fn ($q) => $q->where('buyer_id', $userId)->orWhere('seller_id', $userId))
            ->with([
                'listing:id,user_id,title,status',
                'listing.images',
                'buyer:id,name',
                'seller:id,name',
                'lastMessage.sender:id,name',
            ])
            ->withCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $userId)
                ->whereNull('read_at')])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json($rows);
    }

    public function start(Request $request, Listing $listing)
    {
        $user = $request->user();
        abort_unless($listing->status === 'published', 404);
        abort_if($listing->user_id === $user->id, 422, 'لا يمكنك مراسلة نفسك على إعلانك.');

        $conversation = Conversation::firstOrCreate([
            'listing_id' => $listing->id,
            'buyer_id' => $user->id,
            'seller_id' => $listing->user_id,
        ]);

        return response()->json($this->loadConversation($conversation, $user->id), $conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function messages(Request $request, Conversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);
        $userId = $request->user()->id;

        Message::query()
            ->where('conversation_id', $conversation->id)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->update(['read_at' => now(), 'updated_at' => now()]);

        $conversation->load(['listing:id,user_id,title,status', 'listing.images', 'buyer:id,name', 'seller:id,name']);
        $messages = $conversation->messages()
            ->with('sender:id,name')
            ->latest('id')
            ->limit(100)
            ->get()
            ->reverse()
            ->values();

        return response()->json([
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }

    public function send(Request $request, Conversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $body = trim($data['body']);
        abort_if($body === '', 422, 'اكتب الرسالة أولاً.');

        $message = $conversation->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $body,
        ]);
        $conversation->forceFill(['last_message_at' => $message->created_at])->save();

        return response()->json($message->load('sender:id,name'), 201);
    }

    public function unreadCount(Request $request)
    {
        $userId = $request->user()->id;
        $count = Message::query()
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->whereHas('conversation', fn ($q) => $q
                ->where('buyer_id', $userId)
                ->orWhere('seller_id', $userId))
            ->count();

        return response()->json(['count' => $count]);
    }

    public function notifications(Request $request)
    {
        $userId = $request->user()->id;
        $rows = Message::query()
            ->where('sender_id', '!=', $userId)
            ->whereHas('conversation', fn ($q) => $q
                ->where('buyer_id', $userId)
                ->orWhere('seller_id', $userId))
            ->with([
                'sender:id,name',
                'conversation:id,listing_id,buyer_id,seller_id,last_message_at',
                'conversation.listing:id,user_id,title,status',
                'conversation.listing.images',
                'conversation.buyer:id,name',
                'conversation.seller:id,name',
            ])
            ->latest('id')
            ->limit(30)
            ->get();

        return response()->json($rows);
    }

    private function authorizeParticipant(Request $request, Conversation $conversation): void
    {
        $userId = $request->user()->id;
        abort_unless($conversation->buyer_id === $userId || $conversation->seller_id === $userId, 403);
    }

    private function loadConversation(Conversation $conversation, int $userId): Conversation
    {
        return $conversation
            ->load(['listing:id,user_id,title,status', 'listing.images', 'buyer:id,name', 'seller:id,name', 'lastMessage.sender:id,name'])
            ->loadCount(['messages as unread_count' => fn ($q) => $q
                ->where('sender_id', '!=', $userId)
                ->whereNull('read_at')]);
    }
}
