<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->string('username', 80)->nullable()->unique()->after('name');
            });
        }

        if (!Schema::hasTable('app_settings')) {
            Schema::create('app_settings', function (Blueprint $table) {
                $table->string('key', 120)->primary();
                $table->text('value')->nullable();
                $table->string('label', 120)->nullable();
                $table->string('group', 80)->default('general');
                $table->string('type', 30)->default('text');
                $table->timestamps();
            });
        }

        $now = now();
        $admin = DB::table('users')->where('username', 'admin')->first();
        $adminData = [
            'name' => 'مدير النظام',
            'username' => 'admin',
            'email' => 'admin@used.local',
            'password' => Hash::make('1234'),
            'pin' => Hash::make('1234'),
            'role' => 'admin',
            'is_active' => true,
            'updated_at' => $now,
        ];
        if ($admin) {
            DB::table('users')->where('id', $admin->id)->update($adminData);
        } else {
            DB::table('users')->insert($adminData + ['created_at' => $now]);
        }

        $defaults = [
            ['key'=>'app_name','value'=>'مستعمل مجاني','label'=>'اسم التطبيق','group'=>'general','type'=>'text'],
            ['key'=>'primary_color','value'=>'#6426C8','label'=>'اللون الأساسي','group'=>'appearance','type'=>'color'],
            ['key'=>'allow_registration','value'=>'1','label'=>'السماح بالتسجيل','group'=>'accounts','type'=>'boolean'],
            ['key'=>'max_images_per_listing','value'=>'8','label'=>'الحد الأعلى لصور الإعلان','group'=>'listings','type'=>'number'],
            ['key'=>'support_phone','value'=>'','label'=>'رقم الدعم','group'=>'general','type'=>'text'],
        ];
        foreach ($defaults as $setting) {
            DB::table('app_settings')->updateOrInsert(['key' => $setting['key']], $setting + ['created_at'=>$now,'updated_at'=>$now]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
        if (Schema::hasColumn('users', 'username')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique(['username']);
                $table->dropColumn('username');
            });
        }
    }
};
