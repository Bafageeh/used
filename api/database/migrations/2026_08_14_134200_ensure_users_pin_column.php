<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'pin')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('pin')->nullable()->after('password');
            });
        }

        // Existing accounts used the password column for the numeric secret.
        // Reuse the existing hash so users keep the same PIN without a reset.
        DB::table('users')
            ->whereNull('pin')
            ->whereNotNull('password')
            ->update(['pin' => DB::raw('password')]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'pin')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('pin');
            });
        }
    }
};
