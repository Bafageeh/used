from pathlib import Path

ROOT = Path('.')

def write(path: str, content: str):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding='utf-8')

write('api/database/migrations/2026_08_14_153300_create_admin_system.php', r'''<?php

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
''')

write('api/app/Models/AppSetting.php', r'''<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppSetting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';
    protected $fillable = ['key', 'value', 'label', 'group', 'type'];
}
''')

write('api/app/Http/Controllers/Api/AuthController.php', r'''<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OtpCode;
use App\Models\User;
use App\Services\WhatsAppOtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function requestOtp(Request $request, WhatsAppOtpService $whatsApp)
    {
        $data = $request->validate([
            'phone' => ['required', 'regex:/^9665[0-9]{8}$/'],
            'purpose' => ['required', Rule::in(['register', 'login', 'reset_pin'])],
        ]);
        $user = User::where('phone', $data['phone'])->first();
        if ($data['purpose'] === 'register' && $user) return response()->json(['message' => 'رقم الجوال مسجل مسبقًا.'], 422);
        if ($data['purpose'] !== 'register' && !$user) return response()->json(['message' => 'رقم الجوال غير مسجل.'], 404);
        if (OtpCode::where('phone', $data['phone'])->where('created_at', '>', now()->subMinute())->exists()) {
            return response()->json(['message' => 'انتظر دقيقة قبل طلب رمز جديد.'], 429);
        }
        $code = (string) random_int(100000, 999999);
        OtpCode::where('phone', $data['phone'])->whereNull('verified_at')->delete();
        OtpCode::create(['phone'=>$data['phone'],'purpose'=>$data['purpose'],'code_hash'=>Hash::make($code),'expires_at'=>now()->addMinutes(5)]);
        $whatsApp->send($data['phone'], $code);
        return ['message' => 'تم إرسال رمز التحقق عبر واتساب.', 'expires_in' => 300];
    }

    public function verifyOtp(Request $request)
    {
        $data = $request->validate([
            'phone'=>['required','regex:/^9665[0-9]{8}$/'], 'purpose'=>['required',Rule::in(['register','login','reset_pin'])],
            'code'=>['required','digits:6'], 'name'=>['required_if:purpose,register','nullable','string','max:100'],
            'pin'=>['required_if:purpose,register,reset_pin','nullable','digits_between:4,8'], 'device_name'=>['nullable','string','max:100'],
        ]);
        $otp = OtpCode::where('phone',$data['phone'])->where('purpose',$data['purpose'])->whereNull('verified_at')->latest()->first();
        if (!$otp || $otp->expires_at->isPast() || $otp->attempts >= 5) return response()->json(['message'=>'انتهت صلاحية الرمز، اطلب رمزًا جديدًا.'],422);
        $otp->increment('attempts');
        if (!Hash::check($data['code'],$otp->code_hash)) return response()->json(['message'=>'رمز التحقق غير صحيح.'],422);
        return DB::transaction(function () use ($data,$otp) {
            $otp->update(['verified_at'=>now()]);
            $user = User::where('phone',$data['phone'])->first();
            if ($data['purpose']==='register') $user = User::create(['name'=>$data['name'],'phone'=>$data['phone'],'pin'=>$data['pin'],'phone_verified_at'=>now()]);
            elseif ($data['purpose']==='reset_pin') $user->update(['pin'=>$data['pin'],'phone_verified_at'=>now()]);
            abort_if(!$user || !$user->is_active,403,'الحساب موقوف.');
            return ['token'=>$user->createToken($data['device_name'] ?? 'mobile')->plainTextToken,'user'=>$user];
        });
    }

    public function loginWithPin(Request $request)
    {
        $data = $request->validate(['phone'=>['required','regex:/^9665[0-9]{8}$/'],'pin'=>['required','digits_between:4,8'],'device_name'=>['nullable','string','max:100']]);
        $user = User::where('phone',$data['phone'])->first();
        if (!$user || !$user->pin || !Hash::check($data['pin'],$user->pin)) return response()->json(['message'=>'رقم الجوال أو الرقم السري غير صحيح.'],422);
        abort_unless($user->is_active,403,'الحساب موقوف.');
        return ['token'=>$user->createToken($data['device_name'] ?? 'mobile')->plainTextToken,'user'=>$user];
    }

    public function adminLogin(Request $request)
    {
        $data = $request->validate(['username'=>['required','string','max:80'],'password'=>['required','string','max:100'],'device_name'=>['nullable','string','max:100']]);
        $user = User::where('username',$data['username'])->first();
        if (!$user || $user->role !== 'admin' || !$user->password || !Hash::check($data['password'],$user->password)) {
            return response()->json(['message'=>'اسم المستخدم أو كلمة المرور غير صحيحة.'],422);
        }
        abort_unless($user->is_active,403,'حساب الإدارة موقوف.');
        return ['token'=>$user->createToken($data['device_name'] ?? 'admin-mobile')->plainTextToken,'user'=>$user];
    }

    public function me(Request $request) { return $request->user(); }
    public function logout(Request $request) { $request->user()->currentAccessToken()?->delete(); return response()->noContent(); }
}
''')

write('api/app/Http/Controllers/Api/AdminController.php', r'''<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    private function authorizeAdmin(Request $request): void { abort_unless($request->user()?->role === 'admin', 403, 'هذه الصلاحية للمدير فقط.'); }

    public function dashboard(Request $request)
    {
        $this->authorizeAdmin($request);
        return [
            'users'=>User::count(), 'active_users'=>User::where('is_active',true)->count(),
            'admins'=>User::where('role','admin')->count(), 'categories'=>Category::count(),
            'published_listings'=>Listing::where('status','published')->count(), 'draft_listings'=>Listing::where('status','draft')->count(),
            'sold_listings'=>Listing::where('status','sold')->count(), 'archived_listings'=>Listing::where('status','archived')->count(),
        ];
    }

    public function users(Request $request)
    {
        $this->authorizeAdmin($request);
        return User::query()->when($request->filled('q'), function ($query) use ($request) {
            $term='%'.$request->string('q')->trim().'%';
            $query->where(fn($q)=>$q->where('name','like',$term)->orWhere('phone','like',$term)->orWhere('username','like',$term)->orWhere('email','like',$term));
        })->latest()->paginate(100);
    }

    public function storeUser(Request $request)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate([
            'name'=>['required','string','max:100'], 'username'=>['nullable','string','max:80','alpha_dash','unique:users,username'],
            'phone'=>['nullable','regex:/^9665[0-9]{8}$/','unique:users,phone'], 'email'=>['nullable','email','max:150','unique:users,email'],
            'password'=>['nullable','string','min:4','max:100'], 'pin'=>['nullable','digits_between:4,8'],
            'role'=>['required',Rule::in(['user','moderator','admin'])], 'is_active'=>['sometimes','boolean'],
        ]);
        if (empty($data['email'])) $data['email'] = ($data['username'] ?: 'user'.time()).'@used.local';
        if (!array_key_exists('is_active',$data)) $data['is_active']=true;
        return response()->json(User::create($data),201);
    }

    public function updateUser(Request $request, User $user)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate([
            'name'=>['sometimes','string','max:100'], 'username'=>['sometimes','nullable','string','max:80','alpha_dash',Rule::unique('users','username')->ignore($user->id)],
            'phone'=>['sometimes','nullable','regex:/^9665[0-9]{8}$/',Rule::unique('users','phone')->ignore($user->id)],
            'email'=>['sometimes','nullable','email','max:150',Rule::unique('users','email')->ignore($user->id)],
            'password'=>['sometimes','nullable','string','min:4','max:100'], 'pin'=>['sometimes','nullable','digits_between:4,8'],
            'role'=>['sometimes',Rule::in(['user','moderator','admin'])], 'is_active'=>['sometimes','boolean'],
        ]);
        if ($request->user()->is($user)) {
            if (($data['role'] ?? 'admin') !== 'admin' || (array_key_exists('is_active',$data) && !$data['is_active'])) abort(422,'لا يمكنك إزالة صلاحية الإدارة أو إيقاف حسابك الحالي.');
        }
        foreach (['password','pin'] as $field) if (array_key_exists($field,$data) && !$data[$field]) unset($data[$field]);
        $user->update($data);
        return $user->fresh();
    }

    public function destroyUser(Request $request, User $user)
    {
        $this->authorizeAdmin($request);
        abort_if($request->user()->is($user),422,'لا يمكنك حذف حساب الإدارة الذي تستخدمه الآن.');
        foreach ($user->listings()->get(['id']) as $listing) Storage::disk('public')->deleteDirectory('listings/'.$listing->id);
        $user->tokens()->delete();
        $user->delete();
        return response()->noContent();
    }

    public function listings(Request $request)
    {
        $this->authorizeAdmin($request);
        return Listing::with(['user:id,name,phone,username','category:id,name','images'])
            ->when($request->filled('q'),function($query) use($request){$term='%'.$request->string('q')->trim().'%';$query->where(fn($q)=>$q->where('title','like',$term)->orWhere('description','like',$term));})
            ->when($request->filled('status'),fn($q)=>$q->where('status',$request->string('status')))->latest()->paginate(100);
    }

    public function updateListing(Request $request, Listing $listing)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate([
            'title'=>['sometimes','string','max:120'],'description'=>['sometimes','string','max:5000'],'price'=>['sometimes','nullable','numeric','min:0'],
            'city'=>['sometimes','string','max:80'],'category_id'=>['sometimes','exists:categories,id'],'show_phone'=>['sometimes','boolean'],
            'status'=>['sometimes',Rule::in(['draft','published','sold','archived'])],
        ]);
        if (($data['status'] ?? null)==='published') $data['published_at']=$listing->published_at ?? now();
        $listing->update($data);
        return $listing->fresh(['user:id,name,phone,username','category:id,name','images']);
    }

    public function destroyListing(Request $request, Listing $listing)
    {
        $this->authorizeAdmin($request);
        Storage::disk('public')->deleteDirectory('listings/'.$listing->id);
        $listing->delete();
        return response()->noContent();
    }

    public function storeCategory(Request $request)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['required','string','max:80'],'slug'=>['required','alpha_dash','max:100','unique:categories'],'icon'=>['nullable','string','max:50'],'parent_id'=>['nullable','exists:categories,id'],'sort_order'=>['nullable','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        return response()->json(Category::create($data),201);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['sometimes','string','max:80'],'slug'=>['sometimes','alpha_dash','max:100',Rule::unique('categories','slug')->ignore($category->id)],'icon'=>['sometimes','nullable','string','max:50'],'sort_order'=>['sometimes','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        $category->update($data); return $category;
    }

    public function destroyCategory(Request $request, Category $category)
    {
        $this->authorizeAdmin($request);
        abort_if($category->listings()->exists() || $category->children()->exists(),422,'لا يمكن حذف تصنيف مرتبط بإعلانات أو تصنيفات فرعية.');
        $category->delete(); return response()->noContent();
    }

    public function settings(Request $request)
    {
        $this->authorizeAdmin($request);
        return AppSetting::orderBy('group')->orderBy('key')->get();
    }

    public function storeSetting(Request $request)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['key'=>['required','alpha_dash','max:120','unique:app_settings,key'],'value'=>['nullable','string'],'label'=>['nullable','string','max:120'],'group'=>['nullable','string','max:80'],'type'=>['nullable',Rule::in(['text','number','boolean','color'])]]);
        return response()->json(AppSetting::create($data),201);
    }

    public function updateSetting(Request $request, AppSetting $setting)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['value'=>['nullable','string'],'label'=>['sometimes','nullable','string','max:120'],'group'=>['sometimes','string','max:80'],'type'=>['sometimes',Rule::in(['text','number','boolean','color'])]]);
        $setting->update($data); return $setting;
    }

    public function destroySetting(Request $request, AppSetting $setting)
    {
        $this->authorizeAdmin($request); $setting->delete(); return response()->noContent();
    }
}
''')

write('api/routes/api.php', r'''<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ListingController;
use App\Http\Controllers\Api\ListingImageController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status'=>'ok','service'=>'مستعمل مجاني']));
Route::get('/categories',[CategoryController::class,'index']);
Route::get('/listings',[ListingController::class,'index']);
Route::get('/listings/{listing}',[ListingController::class,'show']);
Route::post('/auth/request-otp',[AuthController::class,'requestOtp'])->middleware('throttle:5,1');
Route::post('/auth/verify-otp',[AuthController::class,'verifyOtp'])->middleware('throttle:10,1');
Route::post('/auth/login',[AuthController::class,'loginWithPin'])->middleware('throttle:10,1');
Route::post('/auth/admin-login',[AuthController::class,'adminLogin'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',[AuthController::class,'me']); Route::post('/logout',[AuthController::class,'logout']);
    Route::get('/my/listings',[ListingController::class,'mine']); Route::post('/listings',[ListingController::class,'store']);
    Route::patch('/listings/{listing}',[ListingController::class,'update']); Route::post('/listings/{listing}/refresh',[ListingController::class,'refresh']);
    Route::delete('/listings/{listing}',[ListingController::class,'destroy']); Route::post('/listings/{listing}/images',[ListingImageController::class,'store']);
    Route::delete('/listing-images/{image}',[ListingImageController::class,'destroy']);

    Route::prefix('admin')->group(function () {
        Route::get('/dashboard',[AdminController::class,'dashboard']);
        Route::get('/users',[AdminController::class,'users']); Route::post('/users',[AdminController::class,'storeUser']);
        Route::patch('/users/{user}',[AdminController::class,'updateUser']); Route::delete('/users/{user}',[AdminController::class,'destroyUser']);
        Route::get('/listings',[AdminController::class,'listings']); Route::patch('/listings/{listing}',[AdminController::class,'updateListing']); Route::delete('/listings/{listing}',[AdminController::class,'destroyListing']);
        Route::post('/categories',[AdminController::class,'storeCategory']); Route::patch('/categories/{category}',[AdminController::class,'updateCategory']); Route::delete('/categories/{category}',[AdminController::class,'destroyCategory']);
        Route::get('/settings',[AdminController::class,'settings']); Route::post('/settings',[AdminController::class,'storeSetting']);
        Route::patch('/settings/{setting}',[AdminController::class,'updateSetting']); Route::delete('/settings/{setting}',[AdminController::class,'destroySetting']);
    });
});
''')

# Patch User model
user_path = ROOT / 'api/app/Models/User.php'
user = user_path.read_text(encoding='utf-8')
if "'username'" not in user:
    user = user.replace("'name', 'email', 'phone',", "'name', 'username', 'email', 'phone',")
user_path.write_text(user, encoding='utf-8')

write('mobile/AdminPanel.tsx', r'''import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const API = 'https://used.pm.sa/api';
const P = '#6426C8';
const PL = '#F2EBFF';
const TEXT = '#18181B';
const MUTED = '#71717A';
const BORDER = '#E7E2EF';

type Tab = 'dashboard'|'users'|'listings'|'categories'|'settings';
type User = { id:number; name:string; username?:string|null; phone?:string|null; email?:string|null; role:string; is_active:boolean };
type Listing = { id:number; title:string; status:string; city:string; price?:string|number|null; user?:{name:string;phone?:string|null;username?:string|null}; category?:{name:string} };
type Category = { id:number; name:string; slug:string; is_active?:boolean };
type Setting = { key:string; value?:string|null; label?:string|null; group:string; type:string };

async function api<T>(path:string, token:string, init:RequestInit={}) : Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`,...(init.headers||{}) } });
  const text = await res.text(); let body:any={}; try { body=text?JSON.parse(text):{}; } catch { body={message:text}; }
  if (!res.ok) { const errors=body?.errors?Object.values(body.errors).flat().join('، '):''; throw new Error(errors || body?.message || `HTTP ${res.status}`); }
  return body as T;
}

export default function AdminPanel({ token }: { token:string }) {
  const [tab,setTab]=useState<Tab>('dashboard'); const [busy,setBusy]=useState(false);
  const [dash,setDash]=useState<any>({}); const [users,setUsers]=useState<User[]>([]); const [listings,setListings]=useState<Listing[]>([]); const [categories,setCategories]=useState<Category[]>([]); const [settings,setSettings]=useState<Setting[]>([]);
  const [q,setQ]=useState(''); const [editUser,setEditUser]=useState<User|null>(null); const [newUser,setNewUser]=useState(false);
  const [uf,setUf]=useState({name:'',username:'',phone:'',email:'',password:'',pin:'',role:'user',is_active:true});
  const [catName,setCatName]=useState(''); const [catSlug,setCatSlug]=useState('');
  const [newSetting,setNewSetting]=useState({key:'',value:'',label:'',group:'general',type:'text'});

  const load = useCallback(async () => {
    setBusy(true); try {
      if(tab==='dashboard') setDash(await api('/admin/dashboard',token));
      if(tab==='users') { const r=await api<{data:User[]}>(`/admin/users${q?`?q=${encodeURIComponent(q)}`:''}`,token); setUsers(r.data||[]); }
      if(tab==='listings') { const r=await api<{data:Listing[]}>(`/admin/listings${q?`?q=${encodeURIComponent(q)}`:''}`,token); setListings(r.data||[]); }
      if(tab==='categories') { const r=await api<Category[]>('/categories',token); setCategories(Array.isArray(r)?r:[]); }
      if(tab==='settings') setSettings(await api<Setting[]>('/admin/settings',token));
    } catch(e){ Alert.alert('الإدارة',e instanceof Error?e.message:'تعذر التحميل'); } finally { setBusy(false); }
  },[tab,token,q]);
  useEffect(()=>{load();},[load]);

  const beginUser=(u?:User)=>{ if(u){setEditUser(u);setNewUser(false);setUf({name:u.name||'',username:u.username||'',phone:u.phone||'',email:u.email||'',password:'',pin:'',role:u.role||'user',is_active:u.is_active!==false});} else {setEditUser(null);setNewUser(true);setUf({name:'',username:'',phone:'',email:'',password:'',pin:'',role:'user',is_active:true});} };
  const saveUser=async()=>{ try { setBusy(true); const body:any={name:uf.name,username:uf.username||null,phone:uf.phone||null,email:uf.email||null,role:uf.role,is_active:uf.is_active}; if(uf.password) body.password=uf.password; if(uf.pin) body.pin=uf.pin; await api(editUser?`/admin/users/${editUser.id}`:'/admin/users',token,{method:editUser?'PATCH':'POST',body:JSON.stringify(body)}); setEditUser(null);setNewUser(false);await load(); } catch(e){Alert.alert('الحساب',e instanceof Error?e.message:'تعذر الحفظ');} finally{setBusy(false);} };
  const removeUser=(u:User)=>Alert.alert('حذف الحساب',`حذف ${u.name} وجميع إعلاناته؟`,[{text:'إلغاء',style:'cancel'},{text:'حذف نهائي',style:'destructive',onPress:async()=>{try{await api(`/admin/users/${u.id}`,token,{method:'DELETE'});await load();}catch(e){Alert.alert('الحذف',e instanceof Error?e.message:'تعذر الحذف');}}}]);
  const patchUser=async(u:User,body:any)=>{try{await api(`/admin/users/${u.id}`,token,{method:'PATCH',body:JSON.stringify(body)});await load();}catch(e){Alert.alert('الحساب',e instanceof Error?e.message:'تعذر التعديل');}};
  const patchListing=async(l:Listing,status:string)=>{try{await api(`/admin/listings/${l.id}`,token,{method:'PATCH',body:JSON.stringify({status})});await load();}catch(e){Alert.alert('الإعلان',e instanceof Error?e.message:'تعذر التعديل');}};
  const removeListing=(l:Listing)=>Alert.alert('حذف الإعلان',`حذف «${l.title}» نهائيًا؟`,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:async()=>{try{await api(`/admin/listings/${l.id}`,token,{method:'DELETE'});await load();}catch(e){Alert.alert('الحذف',e instanceof Error?e.message:'تعذر الحذف');}}}]);
  const addCategory=async()=>{try{await api('/admin/categories',token,{method:'POST',body:JSON.stringify({name:catName,slug:catSlug||catName.toLowerCase().replace(/\s+/g,'-')})});setCatName('');setCatSlug('');await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الإضافة');}};
  const removeCategory=(c:Category)=>Alert.alert('حذف التصنيف',`حذف ${c.name}؟`,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:async()=>{try{await api(`/admin/categories/${c.id}`,token,{method:'DELETE'});await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الحذف');}}}]);
  const saveSetting=async(s:Setting)=>{try{await api(`/admin/settings/${encodeURIComponent(s.key)}`,token,{method:'PATCH',body:JSON.stringify({value:s.value??'',label:s.label,group:s.group,type:s.type})});Alert.alert('الإعدادات','تم الحفظ');}catch(e){Alert.alert('الإعدادات',e instanceof Error?e.message:'تعذر الحفظ');}};
  const addSetting=async()=>{try{await api('/admin/settings',token,{method:'POST',body:JSON.stringify(newSetting)});setNewSetting({key:'',value:'',label:'',group:'general',type:'text'});await load();}catch(e){Alert.alert('الإعدادات',e instanceof Error?e.message:'تعذر الإضافة');}};

  const tabs:[Tab,string,any][]=[['dashboard','الرئيسية','speedometer-outline'],['users','الحسابات','people-outline'],['listings','الإعلانات','albums-outline'],['categories','التصنيفات','grid-outline'],['settings','الإعدادات','settings-outline']];
  return <View style={s.root}>
    <View style={s.hero}><View><Text style={s.heroTitle}>لوحة الإدارة</Text><Text style={s.heroSub}>تحكم كامل بمستعمل مجاني</Text></View><View style={s.shield}><Ionicons name="shield-checkmark" size={28} color="#fff"/></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>{tabs.map(([k,l,i])=><Pressable key={k} onPress={()=>{setQ('');setTab(k)}} style={[s.tab,tab===k&&s.tabOn]}><Ionicons name={i} size={18} color={tab===k?'#fff':P}/><Text style={[s.tabText,tab===k&&s.tabTextOn]}>{l}</Text></Pressable>)}</ScrollView>
    <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
      {busy?<ActivityIndicator color={P} style={{margin:20}}/>:null}
      {tab==='dashboard'?<View><Text style={s.title}>نظرة عامة</Text><View style={s.stats}>{[
        ['المستخدمون',dash.users,'people'],['النشطون',dash.active_users,'checkmark-circle'],['الإعلانات',dash.published_listings,'megaphone'],['المباعة',dash.sold_listings,'cash'],['التصنيفات',dash.categories,'grid'],['المدراء',dash.admins,'shield']
      ].map(([l,v,i]:any)=><View key={l} style={s.stat}><Ionicons name={i} size={22} color={P}/><Text style={s.statNum}>{v??0}</Text><Text style={s.statLabel}>{l}</Text></View>)}</View></View>:null}

      {tab==='users'?<View><View style={s.headRow}><Pressable style={s.addBtn} onPress={()=>beginUser()}><Ionicons name="person-add" size={18} color="#fff"/><Text style={s.addText}>إضافة حساب</Text></Pressable><Text style={s.title}>الحسابات</Text></View><TextInput value={q} onChangeText={setQ} onSubmitEditing={load} placeholder="بحث بالاسم أو الجوال أو المستخدم" style={s.search} textAlign="right"/>
        {(newUser||editUser)?<View style={s.editor}><Text style={s.editorTitle}>{editUser?'تعديل الحساب':'حساب جديد'}</Text>{[['الاسم','name'],['اسم المستخدم','username'],['الجوال 9665...','phone'],['البريد','email'],['كلمة مرور جديدة','password'],['PIN جديد','pin']].map(([ph,key])=><TextInput key={key} placeholder={ph} value={(uf as any)[key]} onChangeText={v=>setUf(x=>({...x,[key]:v}))} secureTextEntry={key==='password'||key==='pin'} style={s.input} textAlign="right"/>)}<View style={s.roleRow}>{['user','moderator','admin'].map(r=><Pressable key={r} onPress={()=>setUf(x=>({...x,role:r}))} style={[s.role,uf.role===r&&s.roleOn]}><Text style={[s.roleText,uf.role===r&&s.roleTextOn]}>{r==='user'?'مستخدم':r==='moderator'?'مشرف':'مدير'}</Text></Pressable>)}</View><View style={s.switchRow}><Switch value={uf.is_active} onValueChange={v=>setUf(x=>({...x,is_active:v}))}/><Text>الحساب نشط</Text></View><View style={s.actionRow}><Pressable style={s.cancel} onPress={()=>{setEditUser(null);setNewUser(false)}}><Text>إلغاء</Text></Pressable><Pressable style={s.save} onPress={saveUser}><Text style={s.saveText}>حفظ</Text></Pressable></View></View>:null}
        {users.map(u=><View key={u.id} style={s.card}><View style={s.cardTop}><View style={[s.badge,u.is_active?s.good:s.bad]}><Text style={[s.badgeText,{color:u.is_active?'#16834A':'#B91C1C'}]}>{u.is_active?'نشط':'موقوف'}</Text></View><View style={{flex:1,alignItems:'flex-end'}}><Text style={s.cardTitle}>{u.name}</Text><Text style={s.meta}>{u.username?`@${u.username} • `:''}{u.phone||u.email||''}</Text><Text style={s.meta}>الصلاحية: {u.role}</Text></View></View><View style={s.actionRow}><Pressable style={s.small} onPress={()=>beginUser(u)}><Text style={s.smallText}>تعديل</Text></Pressable><Pressable style={s.small} onPress={()=>patchUser(u,{is_active:!u.is_active})}><Text style={s.smallText}>{u.is_active?'إيقاف':'تفعيل'}</Text></Pressable><Pressable style={s.del} onPress={()=>removeUser(u)}><Text style={s.delText}>حذف</Text></Pressable></View></View>)}
      </View>:null}

      {tab==='listings'?<View><Text style={s.title}>إدارة الإعلانات</Text><TextInput value={q} onChangeText={setQ} onSubmitEditing={load} placeholder="بحث في الإعلانات" style={s.search} textAlign="right"/>{listings.map(l=><View key={l.id} style={s.card}><Text style={s.cardTitle}>{l.title}</Text><Text style={s.meta}>{l.user?.name||'بدون بائع'} • {l.city} • {l.status}</Text><View style={s.actionRow}><Pressable style={s.small} onPress={()=>patchListing(l,'published')}><Text style={s.smallText}>نشر</Text></Pressable><Pressable style={s.small} onPress={()=>patchListing(l,'sold')}><Text style={s.smallText}>مباع</Text></Pressable><Pressable style={s.small} onPress={()=>patchListing(l,'archived')}><Text style={s.smallText}>أرشفة</Text></Pressable><Pressable style={s.del} onPress={()=>removeListing(l)}><Text style={s.delText}>حذف</Text></Pressable></View></View>)}</View>:null}

      {tab==='categories'?<View><Text style={s.title}>التصنيفات</Text><View style={s.editor}><TextInput value={catName} onChangeText={setCatName} placeholder="اسم التصنيف" style={s.input} textAlign="right"/><TextInput value={catSlug} onChangeText={setCatSlug} placeholder="slug مثل cars" autoCapitalize="none" style={s.input} textAlign="right"/><Pressable style={s.save} onPress={addCategory}><Text style={s.saveText}>إضافة تصنيف</Text></Pressable></View>{categories.map(c=><View key={c.id} style={s.simpleRow}><Pressable onPress={()=>removeCategory(c)}><Ionicons name="trash-outline" size={20} color="#DC2626"/></Pressable><View style={{flex:1,alignItems:'flex-end'}}><Text style={s.cardTitle}>{c.name}</Text><Text style={s.meta}>{c.slug}</Text></View></View>)}</View>:null}

      {tab==='settings'?<View><Text style={s.title}>إعدادات التطبيق</Text>{settings.map((st,i)=><View key={st.key} style={s.card}><Text style={s.cardTitle}>{st.label||st.key}</Text><Text style={s.meta}>{st.key} • {st.group}</Text><TextInput value={st.value??''} onChangeText={v=>setSettings(x=>x.map((a,j)=>j===i?{...a,value:v}:a))} style={s.input} textAlign="right"/><Pressable style={s.save} onPress={()=>saveSetting(st)}><Text style={s.saveText}>حفظ الإعداد</Text></Pressable></View>)}<View style={s.editor}><Text style={s.editorTitle}>إنشاء إعداد جديد</Text>{[['المفتاح','key'],['الاسم الظاهر','label'],['القيمة','value'],['المجموعة','group']].map(([ph,k])=><TextInput key={k} placeholder={ph} value={(newSetting as any)[k]} onChangeText={v=>setNewSetting(x=>({...x,[k]:v}))} style={s.input} textAlign="right"/>)}<Pressable style={s.save} onPress={addSetting}><Text style={s.saveText}>إنشاء الإعداد</Text></Pressable></View></View>:null}
    </ScrollView>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#F7F5FA'},hero:{backgroundColor:P,padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},heroTitle:{color:'#fff',fontSize:23,fontWeight:'900',textAlign:'right'},heroSub:{color:'#E9DCFF',marginTop:3,textAlign:'right'},shield:{width:48,height:48,borderRadius:24,backgroundColor:'rgba(255,255,255,.16)',alignItems:'center',justifyContent:'center'},tabs:{padding:10,gap:7,backgroundColor:'#fff'},tab:{minHeight:42,paddingHorizontal:13,borderRadius:12,borderWidth:1,borderColor:'#DDD1EE',flexDirection:'row-reverse',alignItems:'center',gap:6},tabOn:{backgroundColor:P,borderColor:P},tabText:{color:P,fontWeight:'800'},tabTextOn:{color:'#fff'},page:{padding:13,paddingBottom:40},title:{fontSize:20,fontWeight:'900',color:TEXT,textAlign:'right',marginBottom:12},stats:{flexDirection:'row-reverse',flexWrap:'wrap',gap:9},stat:{width:'31%',minHeight:105,backgroundColor:'#fff',borderRadius:16,borderWidth:1,borderColor:BORDER,alignItems:'center',justifyContent:'center'},statNum:{fontSize:24,fontWeight:'900',color:TEXT,marginTop:4},statLabel:{fontSize:11,color:MUTED,marginTop:2},headRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},addBtn:{backgroundColor:P,borderRadius:12,paddingHorizontal:12,minHeight:40,flexDirection:'row',alignItems:'center',gap:6},addText:{color:'#fff',fontWeight:'900'},search:{minHeight:50,backgroundColor:'#fff',borderWidth:1,borderColor:BORDER,borderRadius:13,paddingHorizontal:13,marginBottom:10},editor:{backgroundColor:PL,borderRadius:16,borderWidth:1,borderColor:'#D6C1F7',padding:12,marginBottom:12},editorTitle:{fontSize:16,fontWeight:'900',textAlign:'right',marginBottom:9},input:{minHeight:46,backgroundColor:'#fff',borderWidth:1,borderColor:BORDER,borderRadius:11,paddingHorizontal:11,marginTop:7},roleRow:{flexDirection:'row-reverse',gap:6,marginTop:9},role:{flex:1,borderRadius:10,borderWidth:1,borderColor:'#CFC5DA',paddingVertical:10,alignItems:'center',backgroundColor:'#fff'},roleOn:{backgroundColor:P,borderColor:P},roleText:{color:MUTED,fontWeight:'800'},roleTextOn:{color:'#fff'},switchRow:{flexDirection:'row',alignItems:'center',justifyContent:'flex-end',gap:8,marginTop:9},card:{backgroundColor:'#fff',borderRadius:15,borderWidth:1,borderColor:BORDER,padding:12,marginBottom:9},cardTop:{flexDirection:'row',gap:10,alignItems:'flex-start'},cardTitle:{fontSize:15,fontWeight:'900',color:TEXT,textAlign:'right'},meta:{fontSize:11,color:MUTED,textAlign:'right',marginTop:3},badge:{borderRadius:12,paddingHorizontal:8,paddingVertical:5},good:{backgroundColor:'#ECFDF3'},bad:{backgroundColor:'#FEF2F2'},badgeText:{fontSize:10,fontWeight:'900'},actionRow:{flexDirection:'row-reverse',gap:7,marginTop:10,flexWrap:'wrap'},small:{borderRadius:9,borderWidth:1,borderColor:'#D9C8F1',paddingHorizontal:11,paddingVertical:8,backgroundColor:'#FAF7FF'},smallText:{color:P,fontWeight:'800',fontSize:11},del:{borderRadius:9,borderWidth:1,borderColor:'#FECACA',paddingHorizontal:11,paddingVertical:8,backgroundColor:'#FEF2F2'},delText:{color:'#DC2626',fontWeight:'800',fontSize:11},save:{minHeight:42,borderRadius:10,backgroundColor:P,alignItems:'center',justifyContent:'center',paddingHorizontal:15,marginTop:9},saveText:{color:'#fff',fontWeight:'900'},cancel:{minHeight:42,borderRadius:10,backgroundColor:'#fff',borderWidth:1,borderColor:BORDER,alignItems:'center',justifyContent:'center',paddingHorizontal:15,marginTop:9},simpleRow:{minHeight:62,backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:BORDER,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:12}});
''')

# Patch mobile App.tsx
app_path = ROOT / 'mobile/App.tsx'
app = app_path.read_text(encoding='utf-8')
if "import AdminPanel from './AdminPanel';" not in app:
    app = app.replace("import * as SecureStore from 'expo-secure-store';", "import * as SecureStore from 'expo-secure-store';\nimport AdminPanel from './AdminPanel';")
app = app.replace("type User = { id: number; name: string; phone: string; role?: string };", "type User = { id: number; name: string; phone?: string | null; username?: string | null; role?: string };")
app = app.replace("type Screen = 'home' | 'favorites' | 'add' | 'notifications' | 'messages' | 'mine' | 'account';", "type Screen = 'home' | 'favorites' | 'add' | 'notifications' | 'messages' | 'mine' | 'account' | 'admin';")

start = app.index('function LoginPanel(')
end = app.index('function CreateListing(', start)
new_login = r'''function LoginPanel({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      let result: { token: string; user: User };
      if (mode === 'admin') {
        if (!username.trim() || !password) throw new Error('أدخل اسم المستخدم وكلمة المرور.');
        result = await request<{ token: string; user: User }>('/auth/admin-login', {
          method: 'POST', body: JSON.stringify({ username: username.trim(), password, device_name: 'Used Admin Expo Go' }),
        });
      } else {
        const normalized = phone.replace(/\D/g, '').replace(/^0?5/, '9665');
        if (!/^9665\d{8}$/.test(normalized)) throw new Error('أدخل رقم الجوال السعودي بشكل صحيح.');
        if (!/^\d{4,8}$/.test(pin)) throw new Error('أدخل الرقم السري من 4 إلى 8 أرقام.');
        result = await request<{ token: string; user: User }>('/auth/login', {
          method: 'POST', body: JSON.stringify({ phone: normalized, pin, device_name: 'Expo Go Android' }),
        });
      }
      onLogin(result.token, result.user);
    } catch (e) { Alert.alert('تعذر تسجيل الدخول', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.'); }
    finally { setBusy(false); }
  };
  return (
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <View style={styles.formIcon}><Ionicons name={mode === 'admin' ? 'shield-checkmark-outline' : 'person-outline'} size={34} color={PURPLE} /></View>
      <Text style={styles.sectionTitle}>{mode === 'admin' ? 'دخول الإدارة' : 'تسجيل الدخول'}</Text>
      <Text style={styles.help}>{mode === 'admin' ? 'دخول المدير للتحكم الكامل بالحسابات والإعلانات والإعدادات.' : 'سجّل الدخول لإضافة إعلان ومتابعة إعلاناتك.'}</Text>
      <View style={{ flexDirection: 'row-reverse', gap: 8, marginBottom: 14 }}>
        <Pressable onPress={() => setMode('user')} style={{ flex:1, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='user'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='user'?PURPLE:BORDER }}><Text style={{ color:mode==='user'?'#fff':PURPLE, fontWeight:'900' }}>مستخدم</Text></Pressable>
        <Pressable onPress={() => setMode('admin')} style={{ flex:1, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='admin'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='admin'?PURPLE:BORDER }}><Text style={{ color:mode==='admin'?'#fff':PURPLE, fontWeight:'900' }}>الإدارة</Text></Pressable>
      </View>
      {mode === 'admin' ? <>
        <View style={styles.inputShell}><Ionicons name="person-circle-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={username} onChangeText={setUsername} placeholder="اسم المستخدم" autoCapitalize="none" textAlign="right" /></View>
        <View style={styles.inputShell}><Ionicons name="key-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={password} onChangeText={setPassword} placeholder="كلمة المرور" secureTextEntry textAlign="right" /></View>
      </> : <>
        <View style={styles.inputShell}><Ionicons name="call-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" textAlign="right" /></View>
        <View style={styles.inputShell}><Ionicons name="lock-closed-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={pin} onChangeText={setPin} placeholder="الرقم السري" keyboardType="number-pad" secureTextEntry textAlign="right" /></View>
      </>}
      <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === 'admin' ? 'دخول لوحة الإدارة' : 'دخول'}</Text>}</Pressable>
    </ScrollView>
  );
}

'''
app = app[:start] + new_login + app[end:]

old_logged = """  const loggedIn = (nextToken: string, nextUser: User) => {\n    setToken(nextToken);\n    setUser(nextUser);\n    SecureStore.setItemAsync('used_auth_token', nextToken).catch(() => undefined);\n  };"""
new_logged = """  const loggedIn = (nextToken: string, nextUser: User) => {\n    setToken(nextToken);\n    setUser(nextUser);\n    SecureStore.setItemAsync('used_auth_token', nextToken).catch(() => undefined);\n    if (nextUser.role === 'admin') setScreen('admin');\n  };"""
if old_logged in app: app = app.replace(old_logged,new_logged)

needle = "  if (screen === 'account') content = token && user ? ("
# Admin screen insertion is placed after account block using the following stable marker.
marker = "  ) : <LoginPanel onLogin={loggedIn} />;\n\n  const isHome = screen === 'home';"
replacement = "  ) : <LoginPanel onLogin={loggedIn} />;\n  if (screen === 'admin') content = token && user?.role === 'admin' ? <AdminPanel token={token} /> : <LoginPanel onLogin={loggedIn} />;\n\n  const isHome = screen === 'home';"
if marker not in app: raise SystemExit('account/admin marker not found')
app = app.replace(marker,replacement,1)

old_title = "screen === 'messages' ? 'الرسائل' : screen === 'mine' ? 'إعلاناتي' : 'حسابي'"
new_title = "screen === 'messages' ? 'الرسائل' : screen === 'mine' ? 'إعلاناتي' : screen === 'admin' ? 'لوحة الإدارة' : 'حسابي'"
app = app.replace(old_title,new_title)

menu_marker = """            ))}\n            <View style={styles.sideDivider} />"""
menu_insert = """            ))}\n            {user?.role === 'admin' ? (\n              <Pressable style={[styles.sideMenuItem, { backgroundColor: PURPLE_LIGHT, borderRadius: 12 }]} onPress={() => { setScreen('admin'); setMenuOpen(false); }}><Ionicons name=\"shield-checkmark-outline\" size={22} color={PURPLE} /><Text style={[styles.sideMenuText, { color: PURPLE, fontWeight: '900' }]}>لوحة الإدارة</Text><Ionicons name=\"chevron-back\" size={18} color={PURPLE} /></Pressable>\n            ) : null}\n            <View style={styles.sideDivider} />"""
if menu_marker not in app: raise SystemExit('side menu marker not found')
app = app.replace(menu_marker,menu_insert,1)
app_path.write_text(app, encoding='utf-8')

print('ADMIN_SYSTEM_PATCHED')
