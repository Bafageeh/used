<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ListingImage extends Model
{
    protected $fillable = [
        'listing_id',
        'path',
        'processed_path',
        'processing_status',
        'processed_at',
        'sort_order',
    ];

    protected $casts = [
        'processed_at' => 'datetime',
    ];

    protected $appends = ['url', 'original_url', 'processed_url'];

    public function listing()
    {
        return $this->belongsTo(Listing::class);
    }

    public function getUrlAttribute(): string
    {
        return asset('storage/'.($this->processed_path ?: $this->path));
    }

    public function getOriginalUrlAttribute(): string
    {
        return asset('storage/'.$this->path);
    }

    public function getProcessedUrlAttribute(): ?string
    {
        return $this->processed_path ? asset('storage/'.$this->processed_path) : null;
    }
}
