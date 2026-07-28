<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
 public function up(): void {
  if (!Schema::hasTable('categories')) {
   Schema::create('categories', function (Blueprint $table) {
    $table->id(); $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
    $table->string('name'); $table->string('slug')->unique(); $table->string('icon')->nullable();
    $table->boolean('is_active')->default(true); $table->unsignedInteger('sort_order')->default(0); $table->timestamps();
   });
  }

  if (!Schema::hasTable('listings')) {
   Schema::create('listings', function (Blueprint $table) {
    $table->id(); $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->foreignId('category_id')->constrained()->restrictOnDelete();
    $table->string('title',120); $table->text('description'); $table->decimal('price',12,2)->nullable();
    $table->string('city',80); $table->decimal('latitude',10,7)->nullable(); $table->decimal('longitude',10,7)->nullable();
    $table->enum('status',['draft','published','sold','archived'])->default('draft'); $table->timestamp('published_at')->nullable();
    $table->timestamps(); $table->index(['status','published_at']); $table->index(['category_id','status']);
   });
  }

  if (!Schema::hasTable('listing_images')) {
   Schema::create('listing_images', function (Blueprint $table) {
    $table->id(); $table->foreignId('listing_id')->constrained()->cascadeOnDelete();
    $table->string('path'); $table->unsignedInteger('sort_order')->default(0); $table->timestamps();
   });
  }
 }

 public function down(): void {
  Schema::dropIfExists('listing_images');
  Schema::dropIfExists('listings');
  Schema::dropIfExists('categories');
 }
};
