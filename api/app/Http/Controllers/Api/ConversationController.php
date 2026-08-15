<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use App\Models\Listing;
use App\Models\Message;
use App\Services\ContentSafety;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ConversationController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;
        $blocked = $this->blockedUserIds($userId);
        $rows = Conversation::query()
            ->where(fn ($q) => $q->where('buyer_id', $userId)->orWhere('seller_id', $userId))
            ->when($blocked, fn($q)=>$q->whereNotIn('buyer_id',$blocked)->whereNotIn('seller_id',$blocked))
            ->with(['listing:id,user_id,title,status','listing.images','buyer:id,name','seller:id,name','lastMessage.sender:id,name'])
            ->withCount(['messages as unread_count' => fn ($q) => $q->where('sender_id', '!=', $userId)->whereNull('read_at')])
            ->orderByDesc('last_message_at')->orderByDesc('updated_at')->get();
        return response()->json($rows);
    }

    public function start(Request $request, Listing $listing)
    {
        $user = $request->user();
        abort_unless($listing->status === 'published', 404);
        abort_if($listing->user_id === $user->id, 422, 'لا يمكنك مراسلة نفسك على إعلانك.');
        abort_if($this->blockedBetween($user->id,$listing->user_id), 403, 'لا يمكن بدء محادثة مع مستخدم محظور.');
        $conversation = Conversation::firstOrCreate(['listing_id'=>$listing->id,'buyer_id'=>$user->id,'seller_id'=>$listing->user_id]);
        return response()->json($this->loadConversation($conversation, $user->id), $conversation->wasRecentlyCreated ? 201 : 200);
    }

    public function messages(Request $request, Conversation $conversation)
    {
        $this->authorizeParticipant($request, $conversation);
        $userId = $request->user()->id; $other=$conversation->buyer_id===$userId?$conversation->seller_id:$conversation->buyer_id;
        abort_if($this->blockedBetween($userId,$other),403,'هذه المحادثة متوقفة بسبب الحظر.');
        Message::query()->where('conversation_id',$conversation->id)->where('sender_id','!=',$userId)->whereNull('read_at')->update(['read_at'=>now(),'updated_at'=>now()]);
        $conversation->load(['listing:id,user_id,title,status','listing.images','buyer:id,name','seller:id,name']);
        $messages=$conversation->messages()->with('sender:id,name')->latest('id')->limit(100)->get()->reverse()->values();
        return response()->json(['conversation'=>$conversation,'messages'=>$messages]);
    }

    public function send(Request $request, Conversation $conversation, ContentSafety $safety)
    {
        $this->authorizeParticipant($request, $conversation);
        $userId=$request->user()->id; $other=$conversation->buyer_id===$userId?$conversation->seller_id:$conversation->buyer_id;
        abort_if($this->blockedBetween($userId,$other),403,'لا يمكن إرسال رسائل إلى مستخدم محظور.');
        $data=$request->validate(['body'=>['required','string','max:2000']]);
        $body=trim($data['body']); abort_if($body==='',422,'اكتب الرسالة أولاً.'); $safety->ensureAllowed($body);
        $message=$conversation->messages()->create(['sender_id'=>$userId,'body'=>$body]);
        $conversation->forceFill(['last_message_at'=>$message->created_at])->save();
        return response()->json($message->load('sender:id,name'),201);
    }

    public function unreadCount(Request $request)
    {
        $userId=$request->user()->id; $blocked=$this->blockedUserIds($userId);
        $count=Message::query()->where('sender_id','!=',$userId)->whereNull('read_at')
            ->whereHas('conversation',fn($q)=>$q->where(fn($x)=>$x->where('buyer_id',$userId)->orWhere('seller_id',$userId))->when($blocked,fn($x)=>$x->whereNotIn('buyer_id',$blocked)->whereNotIn('seller_id',$blocked)))->count();
        return response()->json(['count'=>$count]);
    }

    public function notifications(Request $request)
    {
        $userId=$request->user()->id; $blocked=$this->blockedUserIds($userId);
        $rows=Message::query()->where('sender_id','!=',$userId)
            ->whereHas('conversation',fn($q)=>$q->where(fn($x)=>$x->where('buyer_id',$userId)->orWhere('seller_id',$userId))->when($blocked,fn($x)=>$x->whereNotIn('buyer_id',$blocked)->whereNotIn('seller_id',$blocked)))
            ->with(['sender:id,name','conversation:id,listing_id,buyer_id,seller_id,last_message_at','conversation.listing:id,user_id,title,status','conversation.listing.images','conversation.buyer:id,name','conversation.seller:id,name'])
            ->latest('id')->limit(30)->get();
        return response()->json($rows);
    }

    private function authorizeParticipant(Request $request, Conversation $conversation): void
    { $userId=$request->user()->id; abort_unless($conversation->buyer_id===$userId || $conversation->seller_id===$userId,403); }
    private function loadConversation(Conversation $conversation,int $userId): Conversation
    { return $conversation->load(['listing:id,user_id,title,status','listing.images','buyer:id,name','seller:id,name','lastMessage.sender:id,name'])->loadCount(['messages as unread_count'=>fn($q)=>$q->where('sender_id','!=',$userId)->whereNull('read_at')]); }
    private function blockedUserIds(int $userId): array
    { $a=DB::table('user_blocks')->where('blocker_id',$userId)->pluck('blocked_id')->all(); $b=DB::table('user_blocks')->where('blocked_id',$userId)->pluck('blocker_id')->all(); return array_values(array_unique(array_map('intval',array_merge($a,$b)))); }
    private function blockedBetween(int $a,int $b): bool
    { return DB::table('user_blocks')->where(fn($q)=>$q->where('blocker_id',$a)->where('blocked_id',$b))->orWhere(fn($q)=>$q->where('blocker_id',$b)->where('blocked_id',$a))->exists(); }
}
