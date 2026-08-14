<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversation extends Model
{
    protected $fillable = ['listing_id', 'buyer_id', 'seller_id', 'last_message_at'];
    protected $casts = ['last_message_at' => 'datetime'];

    public function listing() { return $this->belongsTo(Listing::class); }
    public function buyer() { return $this->belongsTo(User::class, 'buyer_id'); }
    public function seller() { return $this->belongsTo(User::class, 'seller_id'); }
    public function messages() { return $this->hasMany(Message::class); }
    public function lastMessage() { return $this->hasOne(Message::class)->latestOfMany(); }
}
