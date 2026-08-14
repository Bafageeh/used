from pathlib import Path

p = Path('mobile/App.tsx')
s = p.read_text()

# 1. Listing status field.
s = s.replace("  created_at?: string | null;\n};", "  created_at?: string | null;\n  status?: 'draft' | 'published' | 'sold' | 'archived';\n};", 1)

# 2. Add EditListing component before EmptyScreen.
marker = "function EmptyScreen({ icon, title, text }: { icon: any; title: string; text: string }) {"
if 'function EditListing(' not in s:
    component = r'''
function EditListing({
  listing,
  categories,
  token,
  onSaved,
  onCancel,
}: {
  listing: Listing;
  categories: Category[];
  token: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [categoryId, setCategoryId] = useState<number>(listing.category?.id || listing.category_id || 0);
  const [title, setTitle] = useState(listing.title || '');
  const [description, setDescription] = useState(listing.description || '');
  const [price, setPrice] = useState(listing.price == null ? '' : String(listing.price));
  const [city, setCity] = useState(listing.city || '');
  const [showPhone, setShowPhone] = useState(listing.show_phone !== false);
  const [status, setStatus] = useState<'published' | 'sold' | 'archived'>(listing.status === 'sold' || listing.status === 'archived' ? listing.status : 'published');
  const [existingImages, setExistingImages] = useState<ListingImage[]>(listing.images || []);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coords, setCoords] = useState<Coordinates | null>(() => {
    const latitude = Number(listing.latitude);
    const longitude = Number(listing.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
  });
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

  const chooseImages = async () => {
    const remaining = 8 - existingImages.length - newImages.length;
    if (remaining <= 0) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('الصور', 'يرجى السماح بالوصول إلى الصور.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8,
    });
    if (result.canceled) return;
    setNewImages((current) => [...current, ...result.assets].slice(0, remaining + current.length));
  };

  const deleteExistingImage = (image: ListingImage) => {
    Alert.alert('حذف الصورة', 'هل تريد حذف هذه الصورة من الإعلان؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try {
          await request(`/listing-images/${image.id}`, { method: 'DELETE' }, token);
          setExistingImages((current) => current.filter((x) => x.id !== image.id));
        } catch (e) {
          Alert.alert('تعذر حذف الصورة', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
        }
      } },
    ]);
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return Alert.alert('الموقع', 'اسمح للتطبيق بالوصول للموقع.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch {
      Alert.alert('الموقع', 'تعذر تحديد موقعك الآن.');
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (!categoryId || !title.trim() || !description.trim() || !city.trim()) {
      return Alert.alert('بيانات ناقصة', 'أكمل التصنيف والعنوان والوصف والمدينة.');
    }
    setBusy(true);
    try {
      await request<Listing>(`/listings/${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          price: price.trim() || null,
          city: city.trim(),
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          status,
          show_phone: showPhone,
        }),
      }, token);

      for (const asset of newImages) {
        const upload = await FileSystem.uploadAsync(`${API_URL}/listings/${listing.id}/images`, asset.uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'images[]',
          mimeType: asset.mimeType || 'image/jpeg',
          headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        });
        if (upload.status < 200 || upload.status >= 300) {
          let message = `تعذر رفع الصورة (${upload.status})`;
          try {
            const body = JSON.parse(upload.body || '{}');
            message = body?.message || message;
          } catch {}
          throw new Error(message);
        }
      }
      Alert.alert('تم الحفظ', 'تم تعديل الإعلان بنجاح.');
      onSaved();
    } catch (e) {
      Alert.alert('تعذر الحفظ', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <View style={styles.editHeaderRow}>
        <Pressable style={styles.editCancelButton} onPress={onCancel}><Ionicons name="close" size={22} color={TEXT} /></Pressable>
        <Text style={styles.sectionTitle}>تعديل الإعلان</Text>
      </View>
      <Text style={styles.help}>يمكنك تعديل البيانات والصور وحالة الإعلان.</Text>

      <View style={styles.formCard}>
        <View style={styles.formCardTitleRow}><Text style={styles.formCardTitle}>صور الإعلان</Text><Text style={styles.counter}>{existingImages.length + newImages.length}/8</Text></View>
        <Pressable style={styles.uploadButton} onPress={chooseImages}>
          <Ionicons name="images-outline" size={22} color={PURPLE} />
          <Text style={styles.uploadButtonText}>إضافة صور</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
          {existingImages.map((image) => (
            <View key={`old-${image.id}`} style={styles.previewWrap}>
              <Image source={{ uri: imageUrl(image) }} style={styles.preview} />
              <Pressable style={styles.removeButton} onPress={() => deleteExistingImage(image)}><Ionicons name="trash-outline" size={15} color="#fff" /></Pressable>
            </View>
          ))}
          {newImages.map((asset, index) => (
            <View key={`${asset.assetId || asset.uri}-${index}`} style={styles.previewWrap}>
              <Image source={{ uri: asset.uri }} style={styles.preview} />
              <Pressable style={styles.removeButton} onPress={() => setNewImages((current) => current.filter((_, i) => i !== index))}><Ionicons name="close" size={16} color="#fff" /></Pressable>
            </View>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.formLabel}>التصنيف</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formCategories}>
        {categories.map((category) => (
          <Pressable key={category.id} style={[styles.formCategory, category.id === categoryId && styles.formCategoryActive]} onPress={() => setCategoryId(category.id)}>
            <Ionicons name={categoryIcon(category.name) as any} size={18} color={category.id === categoryId ? '#fff' : PURPLE} />
            <Text style={[styles.formCategoryText, category.id === categoryId && styles.formCategoryTextActive]}>{category.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.formLabel}>حالة الإعلان</Text>
      <View style={styles.statusChoiceRow}>
        {([
          ['published', 'منشور', 'checkmark-circle-outline'],
          ['sold', 'مباع', 'cash-outline'],
          ['archived', 'مؤرشف', 'archive-outline'],
        ] as const).map(([key, label, icon]) => (
          <Pressable key={key} style={[styles.statusChoice, status === key && styles.statusChoiceActive]} onPress={() => setStatus(key)}>
            <Ionicons name={icon} size={18} color={status === key ? '#fff' : PURPLE} />
            <Text style={[styles.statusChoiceText, status === key && styles.statusChoiceTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="عنوان الإعلان" textAlign="right" />
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="وصف السلعة" multiline textAlignVertical="top" textAlign="right" />
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="السعر (اختياري)" keyboardType="decimal-pad" textAlign="right" />
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="المدينة" textAlign="right" />

      <Pressable style={[styles.locationButton, coords && styles.locationButtonDone]} onPress={useMyLocation} disabled={locating}>
        <Ionicons name={coords ? 'checkmark-circle' : 'navigate-outline'} size={21} color={coords ? '#16834A' : PURPLE} />
        <Text style={[styles.locationButtonText, coords && { color: '#16834A' }]}>{locating ? 'جاري تحديد الموقع...' : coords ? 'الموقع الدقيق محفوظ' : 'إضافة موقعي الحالي'}</Text>
      </Pressable>

      <View style={styles.switchRow}>
        <Switch value={showPhone} onValueChange={setShowPhone} trackColor={{ false: '#D4D4D8', true: '#C8ABFF' }} thumbColor={showPhone ? PURPLE : '#fff'} />
        <Text style={styles.switchText}>إظهار رقم الجوال للمشترين</Text>
      </View>

      <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={save} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="save-outline" size={20} color="#fff" /><Text style={styles.primaryButtonText}>حفظ التعديلات</Text></>}
      </Pressable>
    </ScrollView>
  );
}

'''
    if marker not in s:
        raise SystemExit('EmptyScreen marker not found')
    s = s.replace(marker, component + marker, 1)

# 3. State for editing.
state_marker = "  const [menuOpen, setMenuOpen] = useState(false);\n"
if "const [editListing, setEditListing]" not in s:
    s = s.replace(state_marker, state_marker + "  const [editListing, setEditListing] = useState<Listing | null>(null);\n  const [manageBusyId, setManageBusyId] = useState<number | null>(null);\n", 1)

# 4. Management helpers before loggedIn.
helper_marker = "  const loggedIn = (nextToken: string, nextUser: User) => { setToken(nextToken); setUser(nextUser); };\n"
if 'const refreshOwnListing =' not in s:
    helpers = r'''  const refreshOwnListing = (item: Listing) => {
    Alert.alert('تحديث الإعلان', 'سيتم رفع الإعلان إلى أعلى أحدث الإعلانات. هل تريد المتابعة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تحديث', onPress: async () => {
        setManageBusyId(item.id);
        try {
          await request(`/listings/${item.id}/refresh`, { method: 'POST' }, token);
          setRefreshKey((x) => x + 1);
          Alert.alert('تم التحديث', 'تم تحديث الإعلان ورفعه للأعلى.');
        } catch (e) {
          Alert.alert('تعذر التحديث', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
        } finally {
          setManageBusyId(null);
        }
      } },
    ]);
  };

  const deleteOwnListing = (item: Listing) => {
    Alert.alert('حذف الإعلان', `سيتم حذف «${item.title}» نهائيًا مع صوره. هل أنت متأكد؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف نهائي', style: 'destructive', onPress: async () => {
        setManageBusyId(item.id);
        try {
          await request(`/listings/${item.id}`, { method: 'DELETE' }, token);
          setMine((current) => current.filter((x) => x.id !== item.id));
          setListings((current) => current.filter((x) => x.id !== item.id));
          setFavorites((current) => current.filter((id) => id !== item.id));
          setRefreshKey((x) => x + 1);
          Alert.alert('تم الحذف', 'تم حذف الإعلان.');
        } catch (e) {
          Alert.alert('تعذر الحذف', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
        } finally {
          setManageBusyId(null);
        }
      } },
    ]);
  };

  const editOwnListing = (item: Listing) => {
    setEditListing(item);
    setScreen('add');
  };

'''
    if helper_marker not in s:
        raise SystemExit('loggedIn marker not found')
    s = s.replace(helper_marker, helpers + helper_marker, 1)

# 5. Published clears edit mode.
s = s.replace("  const published = () => { setRefreshKey((x) => x + 1); setScreen('home'); };", "  const published = () => { setEditListing(null); setRefreshKey((x) => x + 1); setScreen('home'); };", 1)

# 6. Add screen handles editor.
old_add = "  if (screen === 'add') content = token ? <CreateListing categories={categories} token={token} onPublished={published} /> : <LoginPanel onLogin={loggedIn} />;"
new_add = "  if (screen === 'add') content = token ? (editListing ? <EditListing listing={editListing} categories={categories} token={token} onSaved={() => { setEditListing(null); setRefreshKey((x) => x + 1); setScreen('mine'); }} onCancel={() => { setEditListing(null); setScreen('mine'); }} /> : <CreateListing categories={categories} token={token} onPublished={published} />) : <LoginPanel onLogin={loggedIn} />;"
if old_add in s:
    s = s.replace(old_add, new_add, 1)
elif 'editListing ? <EditListing' not in s:
    raise SystemExit('add content marker not found')

# 7. Replace My Listings rendering with management controls.
old_mine = "      {mineLoading ? <ActivityIndicator color={PURPLE} /> : mine.length ? mine.map((item) => <ListingCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />) : <EmptyScreen icon=\"albums-outline\" title=\"لا توجد إعلانات\" text=\"أضف أول إعلان لك من زر الإضافة.\" />}"
new_mine = r'''      {mineLoading ? <ActivityIndicator color={PURPLE} /> : mine.length ? mine.map((item) => (
        <View key={item.id} style={styles.manageListingWrap}>
          <ListingCard item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />
          <View style={styles.manageActions}>
            <Pressable style={[styles.manageButton, styles.manageEdit]} onPress={() => editOwnListing(item)} disabled={manageBusyId === item.id}>
              <Ionicons name="create-outline" size={18} color={PURPLE} /><Text style={styles.manageEditText}>تعديل</Text>
            </Pressable>
            <Pressable style={[styles.manageButton, styles.manageRefresh]} onPress={() => refreshOwnListing(item)} disabled={manageBusyId === item.id}>
              {manageBusyId === item.id ? <ActivityIndicator size="small" color="#16834A" /> : <Ionicons name="refresh-outline" size={18} color="#16834A" />}
              <Text style={styles.manageRefreshText}>تحديث</Text>
            </Pressable>
            <Pressable style={[styles.manageButton, styles.manageDelete]} onPress={() => deleteOwnListing(item)} disabled={manageBusyId === item.id}>
              <Ionicons name="trash-outline" size={18} color="#DC2626" /><Text style={styles.manageDeleteText}>حذف</Text>
            </Pressable>
          </View>
        </View>
      )) : <EmptyScreen icon="albums-outline" title="لا توجد إعلانات" text="أضف أول إعلان لك من زر الإضافة." />}'''
if old_mine in s:
    s = s.replace(old_mine, new_mine, 1)
elif 'styles.manageListingWrap' not in s:
    raise SystemExit('mine render marker not found')

# 8. FAB always opens a fresh create form.
s = s.replace("<Pressable style={styles.fabWrap} onPress={() => setScreen('add')}>", "<Pressable style={styles.fabWrap} onPress={() => { setEditListing(null); setScreen('add'); }}>", 1)

# 9. Top title says edit when applicable.
s = s.replace("screen === 'add' ? 'أضف إعلان'", "screen === 'add' ? (editListing ? 'تعديل الإعلان' : 'أضف إعلان')", 1)

# 10. Add styles before accountCard.
style_marker = "  accountCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: BORDER },\n"
if 'manageListingWrap:' not in s:
    styles = r'''  manageListingWrap: { marginBottom: 4 },
  manageActions: { marginHorizontal: 12, marginTop: -4, marginBottom: 12, flexDirection: 'row-reverse', gap: 7 },
  manageButton: { flex: 1, minHeight: 42, borderRadius: 11, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1 },
  manageEdit: { backgroundColor: '#F7F2FF', borderColor: '#D8C6F8' },
  manageEditText: { color: PURPLE, fontSize: 12, fontWeight: '900' },
  manageRefresh: { backgroundColor: '#F0FFF7', borderColor: '#BDE8CF' },
  manageRefreshText: { color: '#16834A', fontSize: 12, fontWeight: '900' },
  manageDelete: { backgroundColor: '#FFF5F5', borderColor: '#F5C4C4' },
  manageDeleteText: { color: '#DC2626', fontSize: 12, fontWeight: '900' },
  editHeaderRow: { width: '100%', minHeight: 42, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  editCancelButton: { position: 'absolute', left: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1EEF4', alignItems: 'center', justifyContent: 'center' },
  statusChoiceRow: { flexDirection: 'row-reverse', gap: 7, marginBottom: 13 },
  statusChoice: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D2E3', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statusChoiceActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  statusChoiceText: { color: PURPLE, fontSize: 12, fontWeight: '800' },
  statusChoiceTextActive: { color: '#fff' },

'''
    if style_marker not in s:
        raise SystemExit('accountCard style marker not found')
    s = s.replace(style_marker, styles + style_marker, 1)

p.write_text(s)
print('listing management patch applied')
