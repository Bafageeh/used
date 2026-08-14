from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text()

marker = "const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });\n"
insert = r'''

const REGION_OPTIONS = [
  'الرياض', 'مكة المكرمة', 'الشرقية', 'القصيم', 'عسير', 'المدينة',
  'حائل', 'تبوك', 'جازان', 'نجران', 'الباحة', 'الحدود الشمالية', 'الجوف',
  'جدة', 'أبها', 'ينبع', 'حفر الباطن', 'الطائف', 'عرعر',
  'الكويت', 'الإمارات', 'البحرين',
];

const REGION_GROUPS: Record<string, string[]> = {
  'الرياض': ['الرياض', 'الخرج', 'الدرعية', 'المجمعة', 'الدوادمي', 'الزلفي', 'شقراء', 'وادي الدواسر'],
  'مكة المكرمة': ['مكة', 'مكة المكرمة', 'جدة', 'الطائف', 'رابغ', 'القنفذة', 'الليث'],
  'الشرقية': ['الشرقية', 'الدمام', 'الخبر', 'الظهران', 'الأحساء', 'الهفوف', 'الجبيل', 'القطيف', 'حفر الباطن', 'رأس تنورة'],
  'القصيم': ['القصيم', 'بريدة', 'عنيزة', 'الرس', 'البكيرية'],
  'عسير': ['عسير', 'أبها', 'خميس مشيط', 'محايل', 'بيشة'],
  'المدينة': ['المدينة', 'المدينة المنورة', 'ينبع', 'العلا'],
  'حائل': ['حائل'],
  'تبوك': ['تبوك', 'ضباء', 'تيماء', 'أملج'],
  'جازان': ['جازان', 'جيزان', 'صبيا', 'أبو عريش'],
  'نجران': ['نجران', 'شرورة'],
  'الباحة': ['الباحة', 'بلجرشي'],
  'الحدود الشمالية': ['الحدود الشمالية', 'عرعر', 'رفحاء', 'طريف'],
  'الجوف': ['الجوف', 'سكاكا', 'دومة الجندل', 'القريات'],
  'جدة': ['جدة'],
  'أبها': ['أبها'],
  'ينبع': ['ينبع'],
  'حفر الباطن': ['حفر الباطن'],
  'الطائف': ['الطائف'],
  'عرعر': ['عرعر'],
  'الكويت': ['الكويت'],
  'الإمارات': ['الإمارات', 'دبي', 'أبوظبي', 'أبو ظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'الفجيرة', 'أم القيوين'],
  'البحرين': ['البحرين', 'المنامة'],
};

function listingMatchesRegion(item: Listing, region: string) {
  const city = String(item.city || '').trim();
  if (!city) return false;
  const aliases = REGION_GROUPS[region] || [region];
  return aliases.some((alias) => city.includes(alias) || (city.length > 2 && alias.includes(city)));
}
'''
if 'const REGION_OPTIONS =' not in s:
    if marker not in s:
        raise SystemExit('money marker not found')
    s = s.replace(marker, marker + insert, 1)

old = "  const [selectedCity, setSelectedCity] = useState('الكل');\n  const [cities, setCities] = useState<string[]>([]);\n  const [regionOpen, setRegionOpen] = useState(false);"
new = "  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);\n  const [regionDraft, setRegionDraft] = useState<string[]>([]);\n  const [regionSearch, setRegionSearch] = useState('');\n  const [regionOpen, setRegionOpen] = useState(false);"
if old in s:
    s = s.replace(old, new, 1)
elif 'const [selectedRegions' not in s:
    raise SystemExit('region state marker not found')

s = s.replace("    if (selectedCity !== 'الكل') params.push(`city=${encodeURIComponent(selectedCity)}`);\n", "")
s = s.replace("  }, [selectedCategory, query, selectedCity]);", "  }, [selectedCategory, query]);")

old_cities = """      setCities((current) => {
        const set = new Set([...current, ...nextListings.map((x) => x.city).filter(Boolean)]);
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
      });
"""
s = s.replace(old_cities, "")

vis_marker = "    let rows = [...listings];\n"
vis_add = "    if (selectedRegions.length) rows = rows.filter((item) => selectedRegions.some((region) => listingMatchesRegion(item, region)));\n"
if vis_add not in s:
    if vis_marker not in s:
        raise SystemExit('visible rows marker not found')
    s = s.replace(vis_marker, vis_marker + vis_add, 1)
s = s.replace("  }, [listings, minPrice, maxPrice, sortMode, nearMode, nearCoords]);", "  }, [listings, selectedRegions, minPrice, maxPrice, sortMode, nearMode, nearCoords]);")

s = s.replace("    setSelectedCity('الكل');", "    setSelectedRegions([]);")

header_marker = "  const header = (\n"
region_memo = """  const filteredRegionOptions = useMemo(() => {
    const q = regionSearch.trim();
    if (!q) return REGION_OPTIONS;
    return REGION_OPTIONS.filter((name) => name.includes(q));
  }, [regionSearch]);

  const toggleRegionDraft = (name: string) => {
    setRegionDraft((current) => current.includes(name) ? current.filter((x) => x !== name) : [...current, name]);
  };

"""
if 'const filteredRegionOptions' not in s:
    if header_marker not in s:
        raise SystemExit('header marker not found')
    s = s.replace(header_marker, region_memo + header_marker, 1)

old_button = """        <Pressable style={[styles.filterChip, selectedCity !== 'الكل' && styles.filterChipActive]} onPress={() => { setRegionOpen((x) => !x); setFilterOpen(false); }}>
          <Ionicons name="location" size={18} color={selectedCity !== 'الكل' ? '#fff' : PURPLE} />
          <Text style={[styles.filterChipText, selectedCity !== 'الكل' && styles.filterChipTextActive]}>{selectedCity === 'الكل' ? 'كل المناطق' : selectedCity}</Text>
          <Ionicons name="chevron-down" size={15} color={selectedCity !== 'الكل' ? '#fff' : PURPLE} />
        </Pressable>"""
new_button = """        <Pressable style={[styles.filterChip, selectedRegions.length > 0 && styles.filterChipActive]} onPress={() => { setRegionDraft(selectedRegions); setRegionSearch(''); setRegionOpen(true); setFilterOpen(false); }}>
          <Ionicons name="location" size={18} color={selectedRegions.length > 0 ? '#fff' : PURPLE} />
          <Text style={[styles.filterChipText, selectedRegions.length > 0 && styles.filterChipTextActive]}>{selectedRegions.length === 0 ? 'كل المناطق' : selectedRegions.length === 1 ? selectedRegions[0] : `${selectedRegions.length} مناطق`}</Text>
          <Ionicons name="chevron-down" size={15} color={selectedRegions.length > 0 ? '#fff' : PURPLE} />
        </Pressable>"""
if old_button in s:
    s = s.replace(old_button, new_button, 1)
elif 'selectedRegions.length > 0' not in s:
    raise SystemExit('region button marker not found')

old_region_panel = """      {regionOpen ? (
        <View style={styles.inlinePanel}>
          <Text style={styles.panelTitle}>اختر المدينة</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
            {['الكل', ...cities].map((city) => (
              <Pressable key={city} style={[styles.cityChip, selectedCity === city && styles.cityChipActive]} onPress={() => { setSelectedCity(city); setRegionOpen(false); }}>
                <Text style={[styles.cityChipText, selectedCity === city && styles.cityChipTextActive]}>{city === 'الكل' ? 'كل المناطق' : city}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

"""
s = s.replace(old_region_panel, "")

menu_marker = """      {menuOpen ? (
        <View style={styles.menuLayer} pointerEvents="box-none">"""
region_sheet = r'''      {regionOpen ? (
        <View style={styles.regionOverlay}>
          <Pressable style={styles.regionBackdrop} onPress={() => setRegionOpen(false)} />
          <View style={styles.regionSheet}>
            <View style={styles.regionSheetHeader}>
              <Pressable style={styles.regionClose} onPress={() => setRegionOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={30} color="#55505B" />
              </Pressable>
              <Text style={styles.regionSheetTitle}>المناطق</Text>
              <Pressable onPress={() => setRegionDraft([])} hitSlop={8}>
                <Text style={styles.regionClearText}>مسح الكل</Text>
              </Pressable>
            </View>

            <View style={styles.regionSearchBox}>
              <TextInput
                value={regionSearch}
                onChangeText={setRegionSearch}
                placeholder="بحث"
                placeholderTextColor="#8A8590"
                style={styles.regionSearchInput}
                textAlign="right"
              />
              <Ionicons name="search-outline" size={27} color="#B2ACBA" />
            </View>

            <ScrollView style={styles.regionList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Pressable style={styles.regionRow} onPress={() => setRegionDraft([])}>
                <Text style={styles.regionName}>الكل</Text>
                <View style={[styles.regionCheckbox, regionDraft.length === 0 && styles.regionCheckboxChecked]}>
                  {regionDraft.length === 0 ? <Ionicons name="checkmark" size={19} color="#fff" /> : null}
                </View>
              </Pressable>
              {filteredRegionOptions.map((name) => {
                const checked = regionDraft.includes(name);
                return (
                  <Pressable key={name} style={styles.regionRow} onPress={() => toggleRegionDraft(name)}>
                    <Text style={styles.regionName}>{name}</Text>
                    <View style={[styles.regionCheckbox, checked && styles.regionCheckboxChecked]}>
                      {checked ? <Ionicons name="checkmark" size={19} color="#fff" /> : null}
                    </View>
                  </Pressable>
                );
              })}
              <View style={{ height: 12 }} />
            </ScrollView>

            <Pressable style={styles.regionApplyButton} onPress={() => { setSelectedRegions(regionDraft); setRegionOpen(false); }}>
              <Text style={styles.regionApplyText}>تطبيق ({regionDraft.length})</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

'''
if 'styles.regionOverlay' not in s:
    if menu_marker not in s:
        raise SystemExit('menu marker not found')
    s = s.replace(menu_marker, region_sheet + menu_marker, 1)

style_marker = "  menuLayer: { ...StyleSheet.absoluteFill, zIndex: 50, flexDirection: 'row' },\n"
region_styles = """  regionOverlay: { ...StyleSheet.absoluteFill, zIndex: 70 },
  regionBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(9,5,14,.58)' },
  regionSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '89%', backgroundColor: '#F9F8FC', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 18, paddingHorizontal: 12, overflow: 'hidden' },
  regionSheetHeader: { height: 58, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  regionClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  regionSheetTitle: { position: 'absolute', left: 70, right: 70, textAlign: 'center', color: TEXT, fontSize: 20, fontWeight: '900' },
  regionClearText: { color: PURPLE, fontSize: 15, fontWeight: '800', paddingHorizontal: 8 },
  regionSearchBox: { marginHorizontal: 10, marginTop: 10, marginBottom: 14, height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: '#D8D2DF', backgroundColor: '#fff', paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  regionSearchInput: { flex: 1, color: TEXT, fontSize: 15, paddingVertical: 0 },
  regionList: { flex: 1, marginHorizontal: -12 },
  regionRow: { minHeight: 58, paddingHorizontal: 30, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D4CFD9', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9F8FC' },
  regionName: { color: '#4D4852', fontSize: 16, fontWeight: '600', textAlign: 'right', flex: 1, marginRight: 16 },
  regionCheckbox: { width: 28, height: 28, borderRadius: 4, borderWidth: 2.5, borderColor: PURPLE, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  regionCheckboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  regionApplyButton: { height: 58, marginTop: 10, marginBottom: 12, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', shadowColor: PURPLE_DARK, shadowOpacity: 0.22, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  regionApplyText: { color: '#fff', fontSize: 16, fontWeight: '900' },

"""
if 'regionOverlay:' not in s:
    if style_marker not in s:
        raise SystemExit('style marker not found')
    s = s.replace(style_marker, region_styles + style_marker, 1)

p.write_text(s)
