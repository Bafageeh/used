from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text()


def replace_once(old: str, new: str, label: str, required: bool = True):
    global s
    if old in s:
        s = s.replace(old, new, 1)
        return
    if new in s:
        return
    if required:
        raise SystemExit(f'Anchor not found: {label}')


replace_once(
    "  description?: string;\n  price: string | number | null;",
    "  description?: string;\n  item_condition?: ItemCondition;\n  price: string | number | null;",
    'Listing item_condition type',
)

replace_once(
    "type ViewMode = 'list' | 'grid';\n\ntype Coordinates",
    "type ViewMode = 'list' | 'grid';\ntype ItemCondition = 'new_good' | 'new_defect' | 'used_good' | 'used_defect';\n\ntype Coordinates",
    'ItemCondition union',
)

options_block = """const ITEM_CONDITIONS: { key: ItemCondition; label: string; icon: any }[] = [
  { key: 'new_good', label: 'جديدة سليمة', icon: 'sparkles-outline' },
  { key: 'new_defect', label: 'جديدة بها عيب', icon: 'alert-circle-outline' },
  { key: 'used_good', label: 'مستعملة سليمة', icon: 'checkmark-circle-outline' },
  { key: 'used_defect', label: 'مستعملة بها عيب', icon: 'warning-outline' },
];

function itemConditionLabel(value?: ItemCondition) {
  return ITEM_CONDITIONS.find((item) => item.key === value)?.label || 'مستعملة سليمة';
}
"""
if options_block not in s:
    anchor = "const SURFACE = '#F8F7FA';\n"
    if anchor not in s:
        raise SystemExit('Anchor not found: SURFACE')
    s = s.replace(anchor, anchor + '\n' + options_block, 1)

component = """function ItemConditionDropdown({ value, onChange }: { value?: ItemCondition; onChange: (value: ItemCondition) => void }) {
  const [open, setOpen] = useState(false);
  const selected = ITEM_CONDITIONS.find((item) => item.key === value);

  return (
    <View style={styles.categoryDropdownWrap}>
      <Text style={styles.formLabel}>حالة السلعة</Text>
      <Pressable style={[styles.categoryDropdownButton, open && styles.categoryDropdownButtonOpen]} onPress={() => setOpen((current) => !current)}>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={PURPLE} />
        <View style={styles.categoryDropdownValue}>
          {selected ? <Ionicons name={selected.icon} size={20} color={PURPLE} /> : null}
          <Text style={[styles.categoryDropdownText, !selected && styles.categoryDropdownPlaceholder]}>{selected?.label || 'اختر حالة السلعة'}</Text>
        </View>
      </Pressable>
      {open ? (
        <View style={styles.categoryDropdownMenu}>
          {ITEM_CONDITIONS.map((option, index) => {
            const active = option.key === value;
            return (
              <Pressable
                key={option.key}
                style={[styles.categoryDropdownOption, index < ITEM_CONDITIONS.length - 1 && styles.categoryDropdownOptionBorder, active && styles.categoryDropdownOptionActive]}
                onPress={() => { onChange(option.key); setOpen(false); }}
              >
                <Ionicons name={active ? 'checkmark-circle' : option.icon} size={20} color={active ? PURPLE : '#6B6572'} />
                <Text style={[styles.categoryDropdownOptionText, active && styles.categoryDropdownOptionTextActive]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

"""
if component not in s:
    marker = 'function ListingCard({\n'
    if marker not in s:
        raise SystemExit('Anchor not found: ListingCard')
    s = s.replace(marker, component + marker, 1)

replace_once(
    "  const [description, setDescription] = useState('');\n  const [city, setCity] = useState('');",
    "  const [description, setDescription] = useState('');\n  const [itemCondition, setItemCondition] = useState<ItemCondition>();\n  const [city, setCity] = useState('');",
    'create item condition state',
)

replace_once(
    "if (!categoryId || !title.trim() || !description.trim() || !city.trim()) {\n      return Alert.alert('بيانات ناقصة', 'أكمل التصنيف والعنوان والوصف والمدينة.');",
    "if (!categoryId || !itemCondition || !title.trim() || !description.trim() || !city.trim()) {\n      return Alert.alert('بيانات ناقصة', 'أكمل التصنيف وحالة السلعة والعنوان والوصف والمدينة.');",
    'create validation',
)

# First payload is create.
old_payload = "          description: description.trim(),\n          city: city.trim(),"
new_payload = "          description: description.trim(),\n          item_condition: itemCondition,\n          city: city.trim(),"
if s.count(old_payload) >= 1:
    s = s.replace(old_payload, new_payload, 1)

replace_once(
    "      <CategoryDropdown categories={categories} value={categoryId} onChange={setCategoryId} />\n\n      <TextInput style={styles.input} value={title}",
    "      <CategoryDropdown categories={categories} value={categoryId} onChange={setCategoryId} />\n      <ItemConditionDropdown value={itemCondition} onChange={setItemCondition} />\n\n      <TextInput style={styles.input} value={title}",
    'create condition dropdown',
)

replace_once(
    "  const [description, setDescription] = useState(listing.description || '');\n  const [city, setCity] = useState(listing.city || '');",
    "  const [description, setDescription] = useState(listing.description || '');\n  const [itemCondition, setItemCondition] = useState<ItemCondition>(listing.item_condition || 'used_good');\n  const [city, setCity] = useState(listing.city || '');",
    'edit item condition state',
)

# Remaining payload is edit.
if old_payload in s:
    s = s.replace(old_payload, new_payload, 1)

replace_once(
    "      <CategoryDropdown categories={categories} value={categoryId} onChange={setCategoryId} />\n\n      <Text style={styles.formLabel}>حالة الإعلان</Text>",
    "      <CategoryDropdown categories={categories} value={categoryId} onChange={setCategoryId} />\n      <ItemConditionDropdown value={itemCondition} onChange={setItemCondition} />\n\n      <Text style={styles.formLabel}>حالة الإعلان</Text>",
    'edit condition dropdown',
)

detail_old = "            <Text style={styles.detailPrice}>مجانا</Text>\n            <View style={styles.detailMetaLine}><Text style={styles.detailMetaText}>{detail.city}</Text>"
detail_new = """            <Text style={styles.detailPrice}>مجانا</Text>
            <View style={{ alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: PURPLE_LIGHT, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, marginBottom: 10 }}>
              <Ionicons name={ITEM_CONDITIONS.find((x) => x.key === detail.item_condition)?.icon || 'checkmark-circle-outline'} size={17} color={PURPLE} />
              <Text style={{ color: PURPLE_DARK, fontWeight: '900', fontSize: 12 }}>{itemConditionLabel(detail.item_condition)}</Text>
            </View>
            <View style={styles.detailMetaLine}><Text style={styles.detailMetaText}>{detail.city}</Text>"""
replace_once(detail_old, detail_new, 'detail item condition')

p.write_text(s)
print('Listing item condition UI applied successfully.')
