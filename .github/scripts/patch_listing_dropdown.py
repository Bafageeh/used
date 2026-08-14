from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text()

duplicated = '''      <Text style={styles.sectionTitle}>أضف إعلان جديد</Text>\n      <Text style={styles.help}>صور واضحة ومعلومات دقيقة ترفع فرصة البيع.</Text>\n\n'''
if duplicated not in s:
    raise SystemExit('Create-listing duplicate heading block not found')
s = s.replace(duplicated, '', 1)

helper = r'''
function CategoryDropdown({ categories, value, onChange }: { categories: Category[]; value?: number; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((category) => category.id === value);

  return (
    <View style={styles.categoryDropdownWrap}>
      <Text style={styles.formLabel}>التصنيف</Text>
      <Pressable style={[styles.categoryDropdownButton, open && styles.categoryDropdownButtonOpen]} onPress={() => setOpen((current) => !current)}>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={PURPLE} />
        <View style={styles.categoryDropdownValue}>
          {selected ? <Ionicons name={categoryIcon(selected.name) as any} size={20} color={PURPLE} /> : null}
          <Text style={[styles.categoryDropdownText, !selected && styles.categoryDropdownPlaceholder]}>{selected?.name || 'اختر التصنيف'}</Text>
        </View>
      </Pressable>
      {open ? (
        <View style={styles.categoryDropdownMenu}>
          {categories.map((category, index) => {
            const active = category.id === value;
            return (
              <Pressable
                key={category.id}
                style={[styles.categoryDropdownOption, index < categories.length - 1 && styles.categoryDropdownOptionBorder, active && styles.categoryDropdownOptionActive]}
                onPress={() => { onChange(category.id); setOpen(false); }}
              >
                <Ionicons name={active ? 'checkmark-circle' : categoryIcon(category.name) as any} size={20} color={active ? PURPLE : '#6B6572'} />
                <Text style={[styles.categoryDropdownOptionText, active && styles.categoryDropdownOptionTextActive]}>{category.name}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

'''
anchor = 'function ListingCard({' 
if 'function CategoryDropdown(' not in s:
    if anchor not in s:
        raise SystemExit('ListingCard anchor not found')
    s = s.replace(anchor, helper + anchor, 1)

old_categories = '''      <Text style={styles.formLabel}>التصنيف</Text>\n      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formCategories}>\n        {categories.map((category) => (\n          <Pressable key={category.id} style={[styles.formCategory, category.id === categoryId && styles.formCategoryActive]} onPress={() => setCategoryId(category.id)}>\n            <Ionicons name={categoryIcon(category.name) as any} size={18} color={category.id === categoryId ? '#fff' : PURPLE} />\n            <Text style={[styles.formCategoryText, category.id === categoryId && styles.formCategoryTextActive]}>{category.name}</Text>\n          </Pressable>\n        ))}\n      </ScrollView>'''
replacement = '''      <CategoryDropdown categories={categories} value={categoryId} onChange={setCategoryId} />'''
count = s.count(old_categories)
if count != 2:
    raise SystemExit(f'Expected 2 category selector blocks, found {count}')
s = s.replace(old_categories, replacement)

style_anchor = "  formCategoryTextActive: { color: '#fff' },"
style_add = style_anchor + r'''
  categoryDropdownWrap: { marginBottom: 12, position: 'relative', zIndex: 12 },
  categoryDropdownButton: { minHeight: 54, borderRadius: 15, borderWidth: 1.2, borderColor: '#D8C8EB', backgroundColor: '#fff', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryDropdownButtonOpen: { borderColor: PURPLE, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  categoryDropdownValue: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 },
  categoryDropdownText: { flex: 1, color: TEXT, fontSize: 15, fontWeight: '800', textAlign: 'right' },
  categoryDropdownPlaceholder: { color: MUTED, fontWeight: '600' },
  categoryDropdownMenu: { marginTop: 6, borderRadius: 14, borderWidth: 1, borderColor: '#D8C8EB', backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#28143F', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  categoryDropdownOption: { minHeight: 52, paddingHorizontal: 16, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#fff' },
  categoryDropdownOptionBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E7E2EF' },
  categoryDropdownOptionActive: { backgroundColor: PURPLE_LIGHT },
  categoryDropdownOptionText: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '700', textAlign: 'right' },
  categoryDropdownOptionTextActive: { color: PURPLE_DARK, fontWeight: '900' },'''
if 'categoryDropdownWrap:' not in s:
    if style_anchor not in s:
        raise SystemExit('Category style anchor not found')
    s = s.replace(style_anchor, style_add, 1)

p.write_text(s)
print('patched mobile/App.tsx')
