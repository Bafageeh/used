<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\ListingImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

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
            // Keep the original permanently. The processed PNG is a second copy.
            $path = $image->store("listings/{$listing->id}/original", 'public');
            $record = $listing->images()->create([
                'path' => $path,
                'processing_status' => 'processing',
                'sort_order' => $listing->images()->count(),
            ]);

            $this->removeBackground($record);
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

    private function removeBackground(ListingImage $image): void
    {
        try {
            $disk = Storage::disk('public');
            $source = $disk->path($image->path);
            if (!is_file($source)) {
                throw new \RuntimeException('Original image file is missing.');
            }

            $response = Http::connectTimeout(3)
                ->timeout(120)
                ->attach('file', file_get_contents($source), basename($source))
                ->post('http://127.0.0.1:8092/api/remove');

            if (!$response->successful() || strlen($response->body()) < 100) {
                throw new \RuntimeException('Background removal service returned '.$response->status().'.');
            }

            $processedPath = "listings/{$image->listing_id}/processed/".Str::uuid().'.png';
            $disk->put($processedPath, $response->body());

            if (!$disk->exists($processedPath) || $disk->size($processedPath) < 100) {
                $disk->delete($processedPath);
                throw new \RuntimeException('Processed image was not saved correctly.');
            }

            if ($image->processed_path && $image->processed_path !== $processedPath) {
                $disk->delete($image->processed_path);
            }

            $image->forceFill([
                'processed_path' => $processedPath,
                'processing_status' => 'done',
                'processed_at' => now(),
            ])->save();
        } catch (Throwable $e) {
            // Background removal must never block publishing. The original remains usable.
            $image->forceFill([
                'processing_status' => 'failed',
                'processed_at' => null,
            ])->save();

            Log::warning('Used listing background removal failed', [
                'listing_image_id' => $image->id,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
