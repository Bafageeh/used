<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        $categories = [
            ['name' => 'سيارات ومركبات', 'slug' => 'vehicles', 'icon' => 'car', 'sort_order' => 10],
            ['name' => 'عقارات', 'slug' => 'real-estate', 'icon' => 'home', 'sort_order' => 20],
            ['name' => 'جوالات وأجهزة', 'slug' => 'electronics', 'icon' => 'phone-portrait', 'sort_order' => 30],
            ['name' => 'أثاث ومستلزمات منزلية', 'slug' => 'home-furniture', 'icon' => 'bed', 'sort_order' => 40],
            ['name' => 'حيوانات وطيور', 'slug' => 'animals', 'icon' => 'paw', 'sort_order' => 50],
            ['name' => 'وظائف وخدمات', 'slug' => 'services', 'icon' => 'briefcase', 'sort_order' => 60],
            ['name' => 'أزياء ومقتنيات', 'slug' => 'fashion', 'icon' => 'shirt', 'sort_order' => 70],
            ['name' => 'أخرى', 'slug' => 'other', 'icon' => 'grid', 'sort_order' => 80],
        ];

        foreach ($categories as $category) {
            DB::table('categories')->updateOrInsert(
                ['slug' => $category['slug']],
                $category + ['is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }

    public function down(): void
    {
        DB::table('categories')->whereIn('slug', [
            'vehicles', 'real-estate', 'electronics', 'home-furniture',
            'animals', 'services', 'fashion', 'other',
        ])->delete();
    }
};
