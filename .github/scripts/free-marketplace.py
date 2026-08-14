from pathlib import Path

app = Path('mobile/App.tsx')
s = app.read_text()

# Every listing is free in cards and details.
s = s.replace("{item.price ? `${money.format(Number(item.price))} ر.س` : 'السعر عند التواصل'}", "مجانا")
s = s.replace("{detail.price ? `${money.format(Number(detail.price))} ر.س` : 'السعر عند التواصل'}", "مجانا")

# Remove price from create/edit forms and payloads.
s = s.replace("  const [price, setPrice] = useState('');\n", "")
s = s.replace("  const [price, setPrice] = useState(listing.price == null ? '' : String(listing.price));\n", "")
s = s.replace("          price: price.trim() || null,\n", "")
s = s.replace("      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder=\"السعر (اختياري)\" keyboardType=\"decimal-pad\" textAlign=\"right\" />\n", "")

# Remove all price-based filtering and sorting.
s = s.replace("type SortMode = 'new' | 'price-low' | 'price-high';\n", "")
s = s.replace("  const [minPrice, setMinPrice] = useState('');\n", "")
s = s.replace("  const [maxPrice, setMaxPrice] = useState('');\n", "")
s = s.replace("  const [sortMode, setSortMode] = useState<SortMode>('new');\n", "")
old_visible = """  const visibleListings = useMemo(() => {
    let rows = [...listings];
    if (selectedRegions.length) rows = rows.filter((item) => selectedRegions.some((region) => listingMatchesRegion(item, region)));
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (minPrice.trim() && Number.isFinite(min)) rows = rows.filter((x) => Number(x.price || 0) >= min);
    if (maxPrice.trim() && Number.isFinite(max)) rows = rows.filter((x) => Number(x.price || 0) <= max);
    if (sortMode === 'price-low') rows.sort((a, b) => Number(a.price || Number.MAX_SAFE_INTEGER) - Number(b.price || Number.MAX_SAFE_INTEGER));
    if (sortMode === 'price-high') rows.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (nearMode && nearCoords) rows.sort((a, b) => distanceKm(nearCoords, a) - distanceKm(nearCoords, b));
    return rows;
  }, [listings, selectedRegions, minPrice, maxPrice, sortMode, nearMode, nearCoords]);
"""
new_visible = """  const visibleListings = useMemo(() => {
    let rows = [...listings];
    if (selectedRegions.length) rows = rows.filter((item) => selectedRegions.some((region) => listingMatchesRegion(item, region)));
    if (nearMode && nearCoords) rows.sort((a, b) => distanceKm(nearCoords, a) - distanceKm(nearCoords, b));
    return rows;
  }, [listings, selectedRegions, nearMode, nearCoords]);
"""
if old_visible not in s:
    raise SystemExit('visibleListings block not found')
s = s.replace(old_visible, new_visible)

s = s.replace("    setMinPrice('');\n", "")
s = s.replace("    setMaxPrice('');\n", "")
s = s.replace("    setSortMode('new');\n", "")

old_filter = """          <View style={styles.priceFilterRow}>
            <TextInput style={styles.priceInput} value={minPrice} onChangeText={setMinPrice} placeholder="أقل سعر" keyboardType="numeric" textAlign="right" />
            <TextInput style={styles.priceInput} value={maxPrice} onChangeText={setMaxPrice} placeholder="أعلى سعر" keyboardType="numeric" textAlign="right" />
          </View>
          <Text style={styles.sortLabel}>الترتيب</Text>
          <View style={styles.sortRow}>
            {([
              ['new', 'الأحدث'], ['price-low', 'السعر الأقل'], ['price-high', 'السعر الأعلى'],
            ] as [SortMode, string][]).map(([key, label]) => (
              <Pressable key={key} style={[styles.sortChip, sortMode === key && styles.sortChipActive]} onPress={() => setSortMode(key)}>
                <Text style={[styles.sortChipText, sortMode === key && styles.sortChipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
"""
new_filter = """          <View style={{ marginTop: 12, minHeight: 54, borderRadius: 14, backgroundColor: PURPLE_LIGHT, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }}>
            <Ionicons name="gift-outline" size={21} color={PURPLE} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ color: PURPLE_DARK, fontSize: 13, fontWeight: '900' }}>كل السلع مجانا</Text>
              <Text style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>لا يوجد سعر أو فرز حسب السعر</Text>
            </View>
          </View>
"""
if old_filter not in s:
    raise SystemExit('price filter UI block not found')
s = s.replace(old_filter, new_filter)

# The formatter is no longer needed anywhere in the app.
s = s.replace("const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });\n", "")

app.write_text(s)

# API: new and edited listings always persist as free (price = null), and price is not accepted from users.
lc = Path('api/app/Http/Controllers/Api/ListingController.php')
t = lc.read_text()
t = t.replace("  $data=$this->validated($request); $data['user_id']=$request->user()->id;", "  $data=$this->validated($request); $data['price']=null; $data['user_id']=$request->user()->id;")
t = t.replace("  abort_unless($request->user()->id===$listing->user_id,403); $data=$this->validated($request);", "  abort_unless($request->user()->id===$listing->user_id,403); $data=$this->validated($request); $data['price']=null;")
t = t.replace("   'description'=>['required','string','max:5000'],'price'=>['nullable','numeric','min:0'],\n", "   'description'=>['required','string','max:5000'],\n")
lc.write_text(t)

# Admin cannot set a price either.
ac = Path('api/app/Http/Controllers/Api/AdminController.php')
a = ac.read_text()
a = a.replace("'title'=>['sometimes','string','max:120'],'description'=>['sometimes','string','max:5000'],'price'=>['sometimes','nullable','numeric','min:0'],\n", "'title'=>['sometimes','string','max:120'],'description'=>['sometimes','string','max:5000'],\n")
a = a.replace("        if (($data['status'] ?? null)==='published')", "        $data['price']=null;\n        if (($data['status'] ?? null)==='published')")
ac.write_text(a)

# Hide legacy price data from all Listing JSON responses.
model = Path('api/app/Models/Listing.php')
m = model.read_text()
if "protected $hidden = ['price'];" not in m:
    m = m.replace("    protected $fillable =", "    protected $hidden = ['price'];\n\n    protected $fillable =")
model.write_text(m)

print('ALL_LISTINGS_FREE=OK')
