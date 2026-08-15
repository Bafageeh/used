<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('user_blocks')) {
            Schema::create('user_blocks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('blocker_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('blocked_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['blocker_id', 'blocked_id']);
                $table->index(['blocked_id', 'blocker_id']);
            });
        }

        if (!Schema::hasTable('content_reports')) {
            Schema::create('content_reports', function (Blueprint $table) {
                $table->id();
                $table->foreignId('reporter_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('listing_id')->nullable()->constrained('listings')->nullOnDelete();
                $table->foreignId('message_id')->nullable()->constrained('messages')->nullOnDelete();
                $table->string('target_type', 20);
                $table->string('reason', 40);
                $table->text('details')->nullable();
                $table->enum('status', ['pending', 'reviewing', 'resolved', 'dismissed'])->default('pending');
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('reviewed_at')->nullable();
                $table->text('resolution_notes')->nullable();
                $table->timestamps();
                $table->index(['status', 'created_at']);
                $table->index(['target_type', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('content_reports');
        Schema::dropIfExists('user_blocks');
    }
};
