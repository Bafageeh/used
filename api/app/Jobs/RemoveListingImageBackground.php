<?php

namespace App\Jobs;

use App\Models\ListingImage;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class RemoveListingImageBackground
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(public int $listingImageId)
    {
    }

    public function handle(): void
    {
        $image = ListingImage::find($this->listingImageId);
        if (!$image || $image->processed_path) {
            return;
        }

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

            $image->forceFill([
                'processed_path' => $processedPath,
                'processing_status' => 'done',
                'processed_at' => now(),
            ])->save();
        } catch (Throwable $e) {
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
