<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ListingVideoController extends Controller
{
    public function store(Request $request, Listing $listing)
    {
        abort_unless($request->user()->id === $listing->user_id, 403);

        $request->validate([
            'video' => ['required', 'file', 'mimetypes:video/mp4,video/quicktime,video/x-m4v,video/3gpp,video/webm', 'max:102400'],
        ]);

        if ($listing->video_path) {
            Storage::disk('public')->delete($listing->video_path);
        }

        $path = $request->file('video')->store("listings/{$listing->id}/video", 'public');
        $listing->forceFill(['video_path' => $path])->save();

        return response()->json([
            'video_path' => $path,
            'video_url' => Storage::disk('public')->url($path),
        ], 201);
    }

    public function destroy(Request $request, Listing $listing)
    {
        abort_unless($request->user()->id === $listing->user_id, 403);

        if ($listing->video_path) {
            Storage::disk('public')->delete($listing->video_path);
            $listing->forceFill(['video_path' => null])->save();
        }

        return response()->noContent();
    }
}
