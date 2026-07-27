<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name','slug','icon','parent_id','is_active','sort_order'];
    protected $casts = ['is_active'=>'boolean'];
    public function listings() { return $this->hasMany(Listing::class); }
}
