<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    protected $fillable = ['phone', 'code_hash', 'purpose', 'attempts', 'expires_at', 'verified_at'];
    protected $hidden = ['code_hash'];
    protected $casts = ['expires_at' => 'datetime', 'verified_at' => 'datetime'];
}
