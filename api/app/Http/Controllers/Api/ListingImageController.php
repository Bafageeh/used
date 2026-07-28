<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            $path = $image->store("listings/{$listing->id}", 'public');
            $created[] = $listing->images()->create([
                'path' => $path,
                'sort_order' => $listing->images()->count(),
            ]);
        }
        return response()->json($created, 201);
    }

    public function destroy(Request $request, ListingImage $image)
    {
        abort_unless($request->user()->id === $image->listing->user_id, 403);
        Storage::disk('public')->delete($image->path);
        $image->delete();
        return response()->noContent();
    }
}
