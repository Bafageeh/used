<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('listings', 'item_condition')) {
            Schema::table('listings', function (Blueprint $table) {
                $table->string('item_condition', 24)->default('used_good')->after('description');
            });
        }

        DB::table('listings')->whereNull('item_condition')->update(['item_condition' => 'used_good']);
    }

    public function down(): void
    {
        if (Schema::hasColumn('listings', 'item_condition')) {
            Schema::table('listings', function (Blueprint $table) {
                $table->dropColumn('item_condition');
            });
        }
    }
};
