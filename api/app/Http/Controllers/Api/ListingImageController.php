<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RemoveListingImageBackground;
use App\Models\Listing;
use App\Models\ListingImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ListingImageController extends Controller
{
    public function store(Request $request, Listing $listing)
    {
        abort_unless($request->user()->id === $listing->user_id, 403);
        $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:8'],
            'images.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);
        abort_if($listing->images()->count() + count($request->file('images')) > 8, 422, 'الحد الأعلى 8 صور.');

        $created = [];
        foreach ($request->file('images') as $image) {
            // Keep the original permanently. Background removal runs after the HTTP response.
            $path = $image->store("listings/{$listing->id}/original", 'public');
            $record = $listing->images()->create([
                'path' => $path,
                'processing_status' => 'processing',
                'sort_order' => $listing->images()->count(),
            ]);

            RemoveListingImageBackground::dispatchAfterResponse($record->id);
            $created[] = $record->fresh();
        }

        return response()->json($created, 201);
    }

    public function destroy(Request $request, ListingImage $image)
    {
        abort_unless($request->user()->id === $image->listing->user_id, 403);
        Storage::disk('public')->delete($image->path);
        if ($image->processed_path) {
            Storage::disk('public')->delete($image->processed_path);
        }
        $image->delete();
        return response()->noContent();
    }
}
