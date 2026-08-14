from pathlib import Path

# Mobile admin panel: show only the category name field and never expose the slug.
p = Path('mobile/AdminPanel.tsx')
s = p.read_text()
s = s.replace(
    "type Category = { id:number; name:string; slug:string; is_active?:boolean };",
    "type Category = { id:number; name:string; is_active?:boolean };"
)
s = s.replace(
    "  const [catName,setCatName]=useState(''); const [catSlug,setCatSlug]=useState('');",
    "  const [catName,setCatName]=useState('');"
)
s = s.replace(
    "  const addCategory=async()=>{try{await api('/admin/categories',token,{method:'POST',body:JSON.stringify({name:catName,slug:catSlug||catName.toLowerCase().replace(/\\s+/g,'-')})});setCatName('');setCatSlug('');await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الإضافة');}};",
    "  const addCategory=async()=>{const name=catName.trim();if(!name)return Alert.alert('التصنيف','اكتب اسم التصنيف.');try{await api('/admin/categories',token,{method:'POST',body:JSON.stringify({name})});setCatName('');await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الإضافة');}};"
)
old_block = """      {tab==='categories'?<View><Text style={s.title}>التصنيفات</Text><View style={s.editor}><TextInput value={catName} onChangeText={setCatName} placeholder=\"اسم التصنيف\" style={s.input} textAlign=\"right\"/><TextInput value={catSlug} onChangeText={setCatSlug} placeholder=\"slug مثل cars\" autoCapitalize=\"none\" style={s.input} textAlign=\"right\"/><Pressable style={s.save} onPress={addCategory}><Text style={s.saveText}>إضافة تصنيف</Text></Pressable></View>{categories.map(c=><View key={c.id} style={s.simpleRow}><Pressable onPress={()=>removeCategory(c)}><Ionicons name=\"trash-outline\" size={20} color=\"#DC2626\"/></Pressable><View style={{flex:1,alignItems:'flex-end'}}><Text style={s.cardTitle}>{c.name}</Text><Text style={s.meta}>{c.slug}</Text></View></View>)}</View>:null}"""
new_block = """      {tab==='categories'?<View><Text style={s.title}>التصنيفات</Text><View style={s.editor}><TextInput value={catName} onChangeText={setCatName} placeholder=\"اسم التصنيف\" style={s.input} textAlign=\"right\" returnKeyType=\"done\" onSubmitEditing={addCategory}/><Pressable style={s.save} onPress={addCategory}><Text style={s.saveText}>إضافة تصنيف</Text></Pressable></View>{categories.map(c=><View key={c.id} style={s.simpleRow}><Pressable onPress={()=>removeCategory(c)}><Ionicons name=\"trash-outline\" size={20} color=\"#DC2626\"/></Pressable><View style={{flex:1,alignItems:'flex-end'}}><Text style={s.cardTitle}>{c.name}</Text></View></View>)}</View>:null}"""
if old_block not in s:
    raise SystemExit('AdminPanel categories block not found')
s = s.replace(old_block, new_block)
p.write_text(s)

# API: slug is generated server-side from category name, never accepted from admin input.
p = Path('api/app/Http/Controllers/Api/AdminController.php')
s = p.read_text()
if 'use Illuminate\\Support\\Str;' not in s:
    s = s.replace('use Illuminate\\Support\\Facades\\Storage;\n', 'use Illuminate\\Support\\Facades\\Storage;\nuse Illuminate\\Support\\Str;\n')

helper = r'''
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

'''
needle = '    public function storeCategory(Request $request)\n'
if 'private function categorySlug(' not in s:
    if needle not in s:
        raise SystemExit('storeCategory marker not found')
    s = s.replace(needle, helper + needle)

old_store = r'''    public function storeCategory(Request $request)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['required','string','max:80'],'slug'=>['required','alpha_dash','max:100','unique:categories'],'icon'=>['nullable','string','max:50'],'parent_id'=>['nullable','exists:categories,id'],'sort_order'=>['nullable','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        return response()->json(Category::create($data),201);
    }
'''
new_store = r'''    public function storeCategory(Request $request)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['required','string','max:80'],'icon'=>['nullable','string','max:50'],'parent_id'=>['nullable','exists:categories,id'],'sort_order'=>['nullable','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        $data['slug']=$this->categorySlug($data['name']);
        return response()->json(Category::create($data),201);
    }
'''
if old_store not in s:
    raise SystemExit('storeCategory body not found')
s = s.replace(old_store, new_store)

old_update = r'''    public function updateCategory(Request $request, Category $category)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['sometimes','string','max:80'],'slug'=>['sometimes','alpha_dash','max:100',Rule::unique('categories','slug')->ignore($category->id)],'icon'=>['sometimes','nullable','string','max:50'],'sort_order'=>['sometimes','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        $category->update($data); return $category;
    }
'''
new_update = r'''    public function updateCategory(Request $request, Category $category)
    {
        $this->authorizeAdmin($request);
        $data=$request->validate(['name'=>['sometimes','string','max:80'],'icon'=>['sometimes','nullable','string','max:50'],'sort_order'=>['sometimes','integer','min:0'],'is_active'=>['sometimes','boolean']]);
        if (array_key_exists('name',$data)) $data['slug']=$this->categorySlug($data['name'],$category->id);
        $category->update($data); return $category;
    }
'''
if old_update not in s:
    raise SystemExit('updateCategory body not found')
s = s.replace(old_update, new_update)
p.write_text(s)

print('AUTO_CATEGORY_SLUG_PATCH_OK')
