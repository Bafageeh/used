<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ModerationController extends Controller
{
    private const REASONS = ['scam','prohibited','offensive','harassment','misleading','spam','other'];

    public function reportListing(Request $request, Listing $listing)
    {
        $user = $request->user();
        abort_if($listing->user_id === $user->id, 422, 'لا يمكنك الإبلاغ عن إعلانك.');
        $data = $this->validatedReport($request);
        $this->createReport($user->id, 'listing', $listing->user_id, $listing->id, null, $data);
        return response()->json(['message' => 'تم استلام البلاغ وسيتم مراجعته.'], 201);
    }

    public function reportUser(Request $request, User $user)
    {
        abort_if($request->user()->id === $user->id, 422, 'لا يمكنك الإبلاغ عن نفسك.');
        $data = $this->validatedReport($request);
        $this->createReport($request->user()->id, 'user', $user->id, null, null, $data);
        return response()->json(['message' => 'تم استلام البلاغ وسيتم مراجعته.'], 201);
    }

    public function reportMessage(Request $request, Message $message)
    {
        $viewer = $request->user();
        $message->load('conversation:id,buyer_id,seller_id');
        abort_unless($message->conversation && in_array($viewer->id, [$message->conversation->buyer_id, $message->conversation->seller_id], true), 403);
        abort_if($message->sender_id === $viewer->id, 422, 'لا يمكنك الإبلاغ عن رسالتك.');
        $data = $this->validatedReport($request);
        $this->createReport($viewer->id, 'message', $message->sender_id, null, $message->id, $data);
        return response()->json(['message' => 'تم استلام بلاغ الرسالة وسيتم مراجعته.'], 201);
    }

    public function blocks(Request $request)
    {
        return DB::table('user_blocks')
            ->join('users', 'users.id', '=', 'user_blocks.blocked_id')
            ->where('user_blocks.blocker_id', $request->user()->id)
            ->orderByDesc('user_blocks.created_at')
            ->get(['users.id','users.name','users.phone','user_blocks.created_at as blocked_at']);
    }

    public function block(Request $request, User $user)
    {
        $viewer = $request->user();
        abort_if($viewer->id === $user->id, 422, 'لا يمكنك حظر نفسك.');
        DB::table('user_blocks')->updateOrInsert(
            ['blocker_id' => $viewer->id, 'blocked_id' => $user->id],
            ['updated_at' => now(), 'created_at' => now()]
        );
        return response()->json(['message' => 'تم حظر المستخدم. لن تظهر إعلاناته ولن يتمكن الطرفان من بدء أو متابعة المحادثة.']);
    }

    public function unblock(Request $request, User $user)
    {
        DB::table('user_blocks')->where('blocker_id', $request->user()->id)->where('blocked_id', $user->id)->delete();
        return response()->noContent();
    }

    private function validatedReport(Request $request): array
    {
        return $request->validate([
            'reason' => ['required', Rule::in(self::REASONS)],
            'details' => ['nullable','string','max:1000'],
        ]);
    }

    private function createReport(int $reporterId, string $targetType, ?int $reportedUserId, ?int $listingId, ?int $messageId, array $data): void
    {
        DB::table('content_reports')->insert([
            'reporter_id' => $reporterId,
            'reported_user_id' => $reportedUserId,
            'listing_id' => $listingId,
            'message_id' => $messageId,
            'target_type' => $targetType,
            'reason' => $data['reason'],
            'details' => $data['details'] ?? null,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
