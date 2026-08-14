<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('listing_images', 'processed_path')) {
            Schema::table('listing_images', function (Blueprint $table) {
                $table->string('processed_path')->nullable()->after('path');
            });
        }

        if (!Schema::hasColumn('listing_images', 'processing_status')) {
            Schema::table('listing_images', function (Blueprint $table) {
                $table->string('processing_status', 20)->default('original')->after('processed_path');
            });
        }

        if (!Schema::hasColumn('listing_images', 'processed_at')) {
            Schema::table('listing_images', function (Blueprint $table) {
                $table->timestamp('processed_at')->nullable()->after('processing_status');
            });
        }
    }

    public function down(): void
    {
        $columns = array_values(array_filter(
            ['processed_path', 'processing_status', 'processed_at'],
            fn (string $column) => Schema::hasColumn('listing_images', $column)
        ));

        if ($columns) {
            Schema::table('listing_images', function (Blueprint $table) use ($columns) {
                $table->dropColumn($columns);
            });
        }
    }
};
