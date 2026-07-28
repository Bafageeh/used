<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->unique()->after('name');
            $table->string('pin')->nullable()->after('password');
            $table->enum('role', ['user', 'moderator', 'admin'])->default('user');
            $table->boolean('is_active')->default(true);
            $table->timestamp('phone_verified_at')->nullable();
        });

        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->index();
            $table->string('code_hash');
            $table->enum('purpose', ['register', 'login', 'reset_pin'])->default('login');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->timestamp('expires_at');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();
        });

        Schema::table('listings', function (Blueprint $table) {
            $table->boolean('show_phone')->default(true);
            $table->unsignedBigInteger('views_count')->default(0);
        });
    }

    public function down(): void
    {
        Schema::table('listings', function (Blueprint $table) {
            $table->dropColumn(['show_phone', 'views_count']);
        });
        Schema::dropIfExists('otp_codes');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->dropColumn(['phone', 'pin', 'role', 'is_active', 'phone_verified_at']);
        });
    }
};
