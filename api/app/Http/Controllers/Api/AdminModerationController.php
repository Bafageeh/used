<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminModerationController extends Controller
{
    private function admin(Request $request): void
    {
        abort_unless(in_array($request->user()?->role, ['admin','moderator'], true), 403, 'هذه الصلاحية للإدارة والإشراف فقط.');
    }

    public function index(Request $request)
    {
        $this->admin($request);
        $status = $request->string('status')->toString();
        $query = DB::table('content_reports as r')
            ->leftJoin('users as reporter', 'reporter.id', '=', 'r.reporter_id')
            ->leftJoin('users as reported', 'reported.id', '=', 'r.reported_user_id')
            ->leftJoin('listings as l', 'l.id', '=', 'r.listing_id')
            ->leftJoin('messages as m', 'm.id', '=', 'r.message_id')
            ->select([
                'r.id','r.target_type','r.reason','r.details','r.status','r.created_at','r.reviewed_at','r.resolution_notes',
                'r.reported_user_id','r.listing_id','r.message_id',
                'reporter.name as reporter_name','reported.name as reported_user_name',
                'l.title as listing_title','l.status as listing_status','m.body as message_body',
            ]);
        if (in_array($status, ['pending','reviewing','resolved','dismissed'], true)) $query->where('r.status', $status);
        else $query->whereIn('r.status', ['pending','reviewing']);
        return $query->orderByDesc('r.created_at')->paginate(100);
    }

    public function update(Request $request, int $report)
    {
        $this->admin($request);
        $row = DB::table('content_reports')->where('id', $report)->first();
        abort_unless($row, 404);
        $data = $request->validate([
            'status' => ['required', Rule::in(['reviewing','resolved','dismissed'])],
            'action' => ['nullable', Rule::in(['none','archive_listing','suspend_user'])],
            'resolution_notes' => ['nullable','string','max:2000'],
        ]);

        DB::transaction(function () use ($request, $row, $data, $report) {
            if (($data['action'] ?? 'none') === 'archive_listing' && $row->listing_id) {
                Listing::whereKey($row->listing_id)->update(['status' => 'archived']);
            }
            if (($data['action'] ?? 'none') === 'suspend_user' && $row->reported_user_id) {
                User::whereKey($row->reported_user_id)->where('role', '!=', 'admin')->update(['is_active' => false]);
            }
            DB::table('content_reports')->where('id', $report)->update([
                'status' => $data['status'],
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'resolution_notes' => $data['resolution_notes'] ?? null,
                'updated_at' => now(),
            ]);
        });

        return response()->json(['message' => 'تم تحديث البلاغ.']);
    }
}
