<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ListingImage extends Model
{
    protected $fillable = ['listing_id','path','sort_order'];
    protected $appends = ['url'];
    public function listing() { return $this->belongsTo(Listing::class); }
    public function getUrlAttribute(): string { return asset('storage/'.$this->path); }
}
