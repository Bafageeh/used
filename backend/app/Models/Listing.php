<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Listing extends Model
{
    use HasFactory;

    protected $fillable = ['user_id','category_id','title','description','price','city','latitude','longitude','status','published_at','show_phone','views_count'];
    protected $casts = ['price'=>'decimal:2','latitude'=>'decimal:7','longitude'=>'decimal:7','published_at'=>'datetime','show_phone'=>'boolean'];

    public function user() { return $this->belongsTo(User::class); }
    public function category() { return $this->belongsTo(Category::class); }
    public function images() { return $this->hasMany(ListingImage::class)->orderBy('sort_order'); }
}
