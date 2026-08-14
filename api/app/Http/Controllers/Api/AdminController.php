<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Category;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
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
            'title'=>['sometimes','string','max:120'],'description'=>['sometimes','string','max:5000'],
            'city'=>['sometimes','string','max:80'],'category_id'=>['sometimes','exists:categories,id'],'show_phone'=>['sometimes','boolean'],
            'status'=>['sometimes',Rule::in(['draft','published','sold','archived'])],
        ]);
        $data['price']=null;
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


    private function categorySlug(string $name, ?int $ignoreId = null): string
    {
        $name = trim($name);
        $known = [
            'جوالات' => 'mobile',
            'جوالات وأجهزة' => 'electronics',
            'هواتف وجوالات' => 'mobile-phones',
            'أجهزة' => 'electronics',
            'إلكترونيات' => 'electronics',
            'سيارات' => 'cars',
            'سيارات ومركبات' => 'vehicles',
            'مركبات' => 'vehicles',
            'عقار' => 'real-estate',
            'عقارات' => 'real-estate',
            'أثاث' => 'furniture',
            'أثاث ومستلزمات منزلية' => 'home-furniture',
            'مستلزمات منزلية' => 'home-supplies',
            'خدمات' => 'services',
            'أزياء' => 'fashion',
            'ملابس' => 'clothing',
            'حيوانات' => 'pets',
            'طيور' => 'birds',
            'رياضة' => 'sports',
            'ألعاب' => 'games',
            'كتب' => 'books',
            'أطفال' => 'kids',
            'مقتنيات' => 'collectibles',
            'أخرى' => 'other',
        ];

        $base = $known[$name] ?? Str::slug($name);
        if ($base === '') $base = 'category';

        $slug = $base;
        $suffix = 2;
        while (true) {
            $query = Category::where('slug', $slug);
            if ($ignoreId !== null) $query->where('id', '!=', $ignoreId);
            if (!$query->exists()) return $slug;
            $slug = $base.'-'.$suffix++;
        }
    }

    public function storeCategory(Request $request)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['required','string','max:80'],'icon'=>['nullable','string','max:50'],'parent_id'=>['nullable','exists:categories,id'],'sort_order'=>['nullable','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        $data['slug']=$this->categorySlug($data['name']);
        return response()->json(Category::create($data),201);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['sometimes','string','max:80'],'icon'=>['sometimes','nullable','string','max:50'],'sort_order'=>['sometimes','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        if (array_key_exists('name',$data)) $data['slug']=$this->categorySlug($data['name'],$category->id);
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
