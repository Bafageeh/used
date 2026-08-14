from pathlib import Path

path = Path('mobile/AdminPanel.tsx')
text = path.read_text(encoding='utf-8')

old = "  const [catName,setCatName]=useState('');\n"
new = "  const [catName,setCatName]=useState('');\n  const [editingCategory,setEditingCategory]=useState<Category|null>(null);\n"
if old not in text:
    raise SystemExit('category state anchor not found')
text = text.replace(old, new, 1)

old = "  const addCategory=async()=>{const name=catName.trim();if(!name)return Alert.alert('التصنيف','اكتب اسم التصنيف.');try{await api('/admin/categories',token,{method:'POST',body:JSON.stringify({name})});setCatName('');await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الإضافة');}};\n  const removeCategory=(c:Category)=>Alert.alert('حذف التصنيف',`حذف ${c.name}؟`,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:async()=>{try{await api(`/admin/categories/${c.id}`,token,{method:'DELETE'});await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الحذف');}}}]);\n"
new = "  const saveCategory=async()=>{const name=catName.trim();if(!name)return Alert.alert('التصنيف','اكتب اسم التصنيف.');try{if(editingCategory){await api(`/admin/categories/${editingCategory.id}`,token,{method:'PATCH',body:JSON.stringify({name})});}else{await api('/admin/categories',token,{method:'POST',body:JSON.stringify({name})});}setCatName('');setEditingCategory(null);await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الحفظ');}};\n  const beginCategoryEdit=(c:Category)=>{setEditingCategory(c);setCatName(c.name);};\n  const cancelCategoryEdit=()=>{setEditingCategory(null);setCatName('');};\n  const removeCategory=(c:Category)=>Alert.alert('حذف التصنيف',`حذف ${c.name}؟`,[{text:'إلغاء',style:'cancel'},{text:'حذف',style:'destructive',onPress:async()=>{try{await api(`/admin/categories/${c.id}`,token,{method:'DELETE'});if(editingCategory?.id===c.id)cancelCategoryEdit();await load();}catch(e){Alert.alert('التصنيف',e instanceof Error?e.message:'تعذر الحذف');}}}]);\n"
if old not in text:
    raise SystemExit('category functions anchor not found')
text = text.replace(old, new, 1)

old = "      {tab==='categories'?<View><Text style={s.title}>التصنيفات</Text><View style={s.editor}><TextInput value={catName} onChangeText={setCatName} placeholder=\"اسم التصنيف\" style={s.input} textAlign=\"right\" returnKeyType=\"done\" onSubmitEditing={addCategory}/><Pressable style={s.save} onPress={addCategory}><Text style={s.saveText}>إضافة تصنيف</Text></Pressable></View>{categories.map(c=><View key={c.id} style={s.simpleRow}><Pressable onPress={()=>removeCategory(c)}><Ionicons name=\"trash-outline\" size={20} color=\"#DC2626\"/></Pressable><View style={{flex:1,alignItems:'flex-end'}}><Text style={s.cardTitle}>{c.name}</Text></View></View>)}</View>:null}\n"
new = "      {tab==='categories'?<View><Text style={s.title}>التصنيفات</Text><View style={s.editor}><TextInput value={catName} onChangeText={setCatName} placeholder={editingCategory?'تعديل اسم التصنيف':'اسم التصنيف'} style={s.input} textAlign=\"right\" returnKeyType=\"done\" onSubmitEditing={saveCategory}/><Pressable style={s.save} onPress={saveCategory}><Text style={s.saveText}>{editingCategory?'حفظ التعديل':'إضافة تصنيف'}</Text></Pressable>{editingCategory?<Pressable style={s.cancel} onPress={cancelCategoryEdit}><Text>إلغاء التعديل</Text></Pressable>:null}</View>{categories.map(c=><View key={c.id} style={s.simpleRow}><View style={{flexDirection:'row',gap:18,alignItems:'center'}}><Pressable onPress={()=>beginCategoryEdit(c)} accessibilityLabel={`تعديل ${c.name}`}><Ionicons name=\"create-outline\" size={21} color={P}/></Pressable><Pressable onPress={()=>removeCategory(c)} accessibilityLabel={`حذف ${c.name}`}><Ionicons name=\"trash-outline\" size={20} color=\"#DC2626\"/></Pressable></View><View style={{flex:1,alignItems:'flex-end'}}><Text style={s.cardTitle}>{c.name}</Text></View></View>)}</View>:null}\n"
if old not in text:
    raise SystemExit('category UI anchor not found')
text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('category inline editing patch applied')
