import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

type Category = { id: number; name: string };
type ListingImage = { id: number; url?: string; path?: string };
type User = { id: number; name: string; phone: string; role?: string };
type Listing = {
  id: number;
  title: string;
  description?: string;
  price: string | number | null;
  city: string;
  images?: ListingImage[];
  user?: User;
  show_phone?: boolean;
};
type Paginated<T> = { data: T[] };
type Tab = 'home' | 'search' | 'add' | 'mine' | 'account';

const API_URL = 'https://used.pm.sa/api';
const SITE_URL = 'https://used.pm.sa';
const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });

function imageUrl(image?: ListingImage) {
  const raw = image?.url || image?.path;
  if (!raw) return undefined;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${SITE_URL}${raw}`;
  if (raw.startsWith('storage/')) return `${SITE_URL}/${raw}`;
  return `${SITE_URL}/storage/${raw}`;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = response.status === 204 ? undefined : await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.message || `تعذر إتمام الطلب (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

function ListingCard({ item, onPress }: { item: Listing; onPress: () => void }) {
  const uri = imageUrl(item.images?.[0]);
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        {uri ? <Image source={{ uri }} style={styles.image} resizeMode="cover" /> : <Text style={styles.noImage}>لا توجد صورة</Text>}
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.price}>{item.price ? `${money.format(Number(item.price))} ر.س` : 'السعر عند التواصل'}</Text>
        <Text style={styles.city}>{item.city || 'بدون مدينة'}</Text>
      </View>
    </Pressable>
  );
}

function LoginPanel({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const normalized = phone.replace(/\D/g, '').replace(/^0?5/, '9665');
    if (!/^9665\d{8}$/.test(normalized)) return Alert.alert('الجوال', 'أدخل رقم الجوال السعودي بشكل صحيح.');
    if (!/^\d{4,8}$/.test(pin)) return Alert.alert('الرقم السري', 'أدخل الرقم السري من 4 إلى 8 أرقام.');
    setBusy(true);
    try {
      const result = await request<{ token: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phone: normalized, pin, device_name: 'Expo Go Android' }),
      });
      onLogin(result.token, result.user);
    } catch (e) {
      Alert.alert('تعذر تسجيل الدخول', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.formPage}>
      <Text style={styles.sectionTitle}>تسجيل الدخول</Text>
      <Text style={styles.help}>سجّل الدخول لإضافة إعلان أو مشاهدة إعلاناتك.</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" textAlign="right" />
      <TextInput style={styles.input} value={pin} onChangeText={setPin} placeholder="الرقم السري" keyboardType="number-pad" secureTextEntry textAlign="right" />
      <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submit} disabled={busy}>
        <Text style={styles.primaryButtonText}>{busy ? 'جاري الدخول...' : 'دخول'}</Text>
      </Pressable>
      <Text style={styles.note}>التسجيل واستعادة الرقم السري عبر واتساب سأعيدهما بعد تثبيت هذه النسخة.</Text>
    </View>
  );
}

function CreateListing({ categories, token, onPublished }: { categories: Category[]; token: string; onPublished: () => void }) {
  const [categoryId, setCategoryId] = useState<number>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [busy, setBusy] = useState(false);

  const chooseImages = async () => {
    const remaining = 8 - images.length;
    if (remaining <= 0) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('الصور', 'يرجى السماح بالوصول إلى الصور.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled) return;
    setImages((current) => {
      const next = [...current];
      for (const asset of result.assets) {
        if (!next.some((x) => (x.assetId || x.uri) === (asset.assetId || asset.uri))) next.push(asset);
      }
      return next.slice(0, 8);
    });
  };

  const submit = async () => {
    if (!categoryId || !title.trim() || !description.trim() || !city.trim()) {
      return Alert.alert('بيانات ناقصة', 'أكمل التصنيف والعنوان والوصف والمدينة.');
    }
    if (!images.length) return Alert.alert('الصور', 'أضف صورة واحدة على الأقل للإعلان.');
    setBusy(true);
    try {
      const listing = await request<Listing>('/listings', {
        method: 'POST',
        body: JSON.stringify({
          category_id: categoryId,
          title: title.trim(),
          description: description.trim(),
          price: price.trim() || null,
          city: city.trim(),
          status: 'published',
          show_phone: showPhone,
        }),
      }, token);

      for (const asset of images) {
        const upload = await FileSystem.uploadAsync(
          `${API_URL}/listings/${listing.id}/images`,
          asset.uri,
          {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'images[]',
            mimeType: asset.mimeType || 'image/jpeg',
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (upload.status < 200 || upload.status >= 300) {
          let message = `تعذر رفع الصورة (${upload.status})`;
          try {
            const body = JSON.parse(upload.body || '{}');
            const errors = body?.errors
              ? Object.values(body.errors).flat().join('، ')
              : '';
            message = errors || body?.message || message;
          } catch {}
          throw new Error(message);
        }
      }
      Alert.alert('تم بنجاح', `تم نشر الإعلان ورفع ${images.length} صورة.`);
      onPublished();
    } catch (e) {
      Alert.alert('تعذر النشر', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>أضف إعلان</Text>
      <Text style={styles.label}>الصور ({images.length}/8)</Text>
      <Pressable style={styles.outlineButton} onPress={chooseImages}><Text style={styles.outlineButtonText}>+ اختيار صور</Text></Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
        {images.map((asset, index) => (
          <View key={`${asset.assetId || asset.uri}-${index}`} style={styles.previewWrap}>
            <Image source={{ uri: asset.uri }} style={styles.preview} />
            <Pressable style={styles.removeButton} onPress={() => setImages((current) => current.filter((_, i) => i !== index))}>
              <Text style={styles.removeText}>×</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <Text style={styles.label}>التصنيف</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {categories.map((category) => (
          <Pressable key={category.id} style={[styles.category, category.id === categoryId && styles.categoryActive]} onPress={() => setCategoryId(category.id)}>
            <Text style={[styles.categoryText, category.id === categoryId && styles.categoryTextActive]}>{category.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="عنوان الإعلان" textAlign="right" />
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="وصف السلعة وحالتها..." multiline textAlignVertical="top" textAlign="right" />
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="السعر (اختياري)" keyboardType="decimal-pad" textAlign="right" />
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="المدينة" textAlign="right" />
      <View style={styles.switchRow}>
        <Switch value={showPhone} onValueChange={setShowPhone} />
        <Text style={styles.switchText}>إظهار رقم الجوال للمشترين</Text>
      </View>
      <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submit} disabled={busy}>
        <Text style={styles.primaryButtonText}>{busy ? 'جاري النشر ورفع الصور...' : 'نشر الإعلان مجانًا'}</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [token, setToken] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [mine, setMine] = useState<Listing[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Listing[]>([]);
  const [searching, setSearching] = useState(false);
  const [detail, setDetail] = useState<Listing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const listingsPath = useMemo(() => `/listings${selectedCategory ? `?category_id=${selectedCategory}` : ''}`, [selectedCategory]);
  const loadHome = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [cats, result] = await Promise.all([request<Category[]>('/categories'), request<Paginated<Listing>>(listingsPath)]);
      setCategories(Array.isArray(cats) ? cats : []);
      setListings(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات');
    } finally { setLoading(false); }
  }, [listingsPath]);

  useEffect(() => { loadHome(); }, [loadHome, refreshKey]);

  useEffect(() => {
    if (tab !== 'mine' || !token) return;
    setMineLoading(true);
    request<Paginated<Listing>>('/my/listings', {}, token)
      .then((r) => setMine(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => Alert.alert('إعلاناتي', e instanceof Error ? e.message : 'تعذر التحميل'))
      .finally(() => setMineLoading(false));
  }, [tab, token, refreshKey]);

  const runSearch = async () => {
    const q = search.trim();
    if (!q) return setSearchResults([]);
    setSearching(true);
    try {
      const result = await request<Paginated<Listing>>(`/listings?q=${encodeURIComponent(q)}`);
      setSearchResults(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      Alert.alert('البحث', e instanceof Error ? e.message : 'تعذر البحث');
    } finally { setSearching(false); }
  };

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try { setDetail(await request<Listing>(`/listings/${id}`, {}, token || undefined)); }
    catch (e) { Alert.alert('الإعلان', e instanceof Error ? e.message : 'تعذر فتح الإعلان'); }
    finally { setDetailLoading(false); }
  };

  const loggedIn = (nextToken: string, nextUser: User) => { setToken(nextToken); setUser(nextUser); };
  const published = () => { setRefreshKey((x) => x + 1); setTab('home'); };

  if (detailLoading) return <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.stateText}>جاري فتح الإعلان...</Text></View>;
  if (detail) {
    const photos = detail.images || [];
    return (
      <View style={styles.root}>
        <View style={styles.topBarRow}>
          <Pressable onPress={() => setDetail(null)}><Text style={styles.back}>رجوع</Text></Pressable>
          <Text style={styles.appTitle}>تفاصيل الإعلان</Text>
          <View style={{ width: 45 }} />
        </View>
        <ScrollView contentContainerStyle={styles.detailPage}>
          {photos.length ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
              {photos.map((photo) => <Image key={photo.id} source={{ uri: imageUrl(photo) }} style={styles.detailImage} resizeMode="cover" />)}
            </ScrollView>
          ) : <View style={[styles.imageWrap, { height: 280 }]}><Text style={styles.noImage}>لا توجد صور</Text></View>}
          {photos.length > 1 ? <Text style={styles.photoCount}>{photos.length} صور — اسحب للتنقل</Text> : null}
          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{detail.title}</Text>
            <Text style={styles.price}>{detail.price ? `${money.format(Number(detail.price))} ر.س` : 'السعر عند التواصل'}</Text>
            <Text style={styles.detailText}>{detail.description || 'بدون وصف'}</Text>
            <Text style={styles.city}>{detail.city}</Text>
            {detail.user?.phone ? <Text style={styles.phone}>جوال البائع: {detail.user.phone}</Text> : null}
          </View>
        </ScrollView>
      </View>
    );
  }

  const homeContent = (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}><Text style={styles.heroTitle}>بيع واشتري بسهولة</Text><Text style={styles.heroText}>أعلن مجانًا وتواصل مباشرة مع البائع</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <Pressable style={[styles.category, selectedCategory === undefined && styles.categoryActive]} onPress={() => setSelectedCategory(undefined)}><Text style={[styles.categoryText, selectedCategory === undefined && styles.categoryTextActive]}>الكل</Text></Pressable>
        {categories.map((category) => <Pressable key={category.id} style={[styles.category, selectedCategory === category.id && styles.categoryActive]} onPress={() => setSelectedCategory(category.id)}><Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>{category.name}</Text></Pressable>)}
      </ScrollView>
      {loading ? <View style={styles.stateBox}><ActivityIndicator size="large" /><Text style={styles.stateText}>جاري تحميل الإعلانات...</Text></View>
        : error ? <Pressable style={styles.errorBox} onPress={loadHome}><Text style={styles.errorText}>{error} — اضغط للمحاولة</Text></Pressable>
        : listings.length === 0 ? <View style={styles.stateBox}><Text style={styles.sectionTitle}>لا توجد إعلانات بعد</Text></View>
        : listings.map((item) => <ListingCard key={item.id} item={item} onPress={() => openDetail(item.id)} />)}
    </ScrollView>
  );

  let content = homeContent;
  if (tab === 'search') content = (
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <Text style={styles.sectionTitle}>البحث</Text>
      <View style={styles.searchRow}><Pressable style={styles.searchButton} onPress={runSearch}><Text style={styles.primaryButtonText}>بحث</Text></Pressable><TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={search} onChangeText={setSearch} onSubmitEditing={runSearch} placeholder="ابحث في الإعلانات" returnKeyType="search" textAlign="right" /></View>
      {searching ? <ActivityIndicator style={{ marginTop: 25 }} /> : searchResults.map((item) => <ListingCard key={item.id} item={item} onPress={() => openDetail(item.id)} />)}
    </ScrollView>
  );
  if (tab === 'add') content = token ? <CreateListing categories={categories} token={token} onPublished={published} /> : <LoginPanel onLogin={loggedIn} />;
  if (tab === 'mine') content = token ? (
    <ScrollView contentContainerStyle={styles.formPage}>
      <Text style={styles.sectionTitle}>إعلاناتي</Text>
      {mineLoading ? <ActivityIndicator /> : mine.length ? mine.map((item) => <ListingCard key={item.id} item={item} onPress={() => openDetail(item.id)} />) : <Text style={styles.help}>لا توجد إعلانات في حسابك.</Text>}
    </ScrollView>
  ) : <LoginPanel onLogin={loggedIn} />;
  if (tab === 'account') content = token && user ? (
    <View style={styles.formPage}>
      <Text style={styles.sectionTitle}>حسابي</Text>
      <View style={styles.accountCard}><Text style={styles.accountName}>{user.name}</Text><Text style={styles.help}>{user.phone}</Text></View>
      <Pressable style={styles.dangerButton} onPress={() => { setToken(''); setUser(null); setMine([]); }}><Text style={styles.dangerText}>تسجيل الخروج</Text></Pressable>
    </View>
  ) : <LoginPanel onLogin={loggedIn} />;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}><Text style={styles.appTitle}>مستعمل مجاني</Text></View>
      <View style={styles.content}>{content}</View>
      <View style={styles.tabBar}>
        {([
          ['home', '⌂', 'الرئيسية'], ['search', '⌕', 'البحث'], ['add', '＋', 'أضف إعلان'], ['mine', '▤', 'إعلاناتي'], ['account', '●', 'حسابي'],
        ] as [Tab, string, string][]).map(([key, icon, label]) => (
          <Pressable key={key} style={styles.tab} onPress={() => setTab(key)}>
            <Text style={[styles.tabIcon, tab === key && styles.tabActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, tab === key && styles.tabActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7F6' },
  content: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff' },
  topBar: { paddingTop: 42, paddingBottom: 12, paddingHorizontal: 18, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D7E0DE', alignItems: 'center' },
  topBarRow: { paddingTop: 42, paddingBottom: 12, paddingHorizontal: 16, backgroundColor: '#fff', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D7E0DE' },
  appTitle: { fontSize: 20, fontWeight: '800', color: '#0F766E' },
  back: { color: '#0F766E', fontWeight: '800' },
  page: { paddingBottom: 24 },
  hero: { backgroundColor: '#0F766E', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, alignItems: 'flex-end' },
  heroTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', textAlign: 'right' },
  heroText: { color: '#D5F2EF', fontSize: 14, marginTop: 6, textAlign: 'right' },
  categories: { gap: 9, paddingHorizontal: 14, paddingVertical: 14 },
  category: { minWidth: 78, height: 46, borderRadius: 14, borderWidth: 1, borderColor: '#D7E0DE', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  categoryActive: { backgroundColor: '#0F766E', borderColor: '#0F766E' },
  categoryText: { color: '#243333', fontSize: 12, fontWeight: '700' },
  categoryTextActive: { color: '#FFFFFF' },
  stateBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  stateText: { fontSize: 14, color: '#647270', textAlign: 'center' },
  errorBox: { marginHorizontal: 14, marginTop: 6, padding: 16, borderRadius: 14, backgroundColor: '#FEE2E2' },
  errorText: { color: '#991B1B', textAlign: 'center' },
  card: { marginHorizontal: 14, marginBottom: 14, backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#D7E0DE' },
  imageWrap: { height: 180, backgroundColor: '#E9EFEE', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  noImage: { color: '#7A8987' },
  cardBody: { padding: 14, alignItems: 'flex-end' },
  cardTitle: { color: '#243333', fontSize: 17, fontWeight: '800', textAlign: 'right' },
  price: { color: '#0F766E', fontSize: 17, fontWeight: '900', marginTop: 8 },
  city: { color: '#647270', fontSize: 13, marginTop: 7 },
  formPage: { padding: 16, paddingBottom: 28, backgroundColor: '#F5F7F6', flexGrow: 1 },
  sectionTitle: { fontSize: 23, fontWeight: '900', color: '#243333', textAlign: 'right', marginBottom: 10 },
  help: { color: '#647270', fontSize: 14, textAlign: 'right', marginBottom: 14 },
  note: { color: '#7A8987', fontSize: 12, textAlign: 'center', marginTop: 15 },
  label: { color: '#243333', fontWeight: '800', textAlign: 'right', marginTop: 8, marginBottom: 8 },
  input: { minHeight: 52, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#D7E0DE', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 11, fontSize: 16 },
  textarea: { height: 120 },
  primaryButton: { backgroundColor: '#0F766E', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 6 },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  disabled: { opacity: 0.55 },
  outlineButton: { borderWidth: 1, borderColor: '#0F766E', borderRadius: 13, padding: 13, alignItems: 'center' },
  outlineButtonText: { color: '#0F766E', fontWeight: '800' },
  previewRow: { gap: 9, paddingVertical: 11 },
  previewWrap: { width: 92, height: 92, position: 'relative' },
  preview: { width: 92, height: 92, borderRadius: 12 },
  removeButton: { position: 'absolute', top: 4, left: 4, width: 25, height: 25, borderRadius: 13, backgroundColor: 'rgba(0,0,0,.65)', alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#fff', fontWeight: '900', fontSize: 19, lineHeight: 21 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 13, padding: 13, marginBottom: 10 },
  switchText: { color: '#243333', fontWeight: '700' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchButton: { backgroundColor: '#0F766E', borderRadius: 13, minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  accountCard: { backgroundColor: '#fff', borderRadius: 15, padding: 18, alignItems: 'flex-end', marginTop: 8 },
  accountName: { fontSize: 20, fontWeight: '900', color: '#243333', marginBottom: 6 },
  dangerButton: { marginTop: 14, padding: 15, borderRadius: 13, borderWidth: 1, borderColor: '#DC2626', alignItems: 'center' },
  dangerText: { color: '#DC2626', fontWeight: '800' },
  tabBar: { flexDirection: 'row-reverse', backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#D7E0DE', paddingTop: 5, paddingBottom: 7, minHeight: 64 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 1 },
  tabIcon: { fontSize: 22, color: '#7A8987' },
  tabLabel: { fontSize: 10, color: '#7A8987', fontWeight: '700' },
  tabActive: { color: '#0F766E' },
  detailPage: { paddingBottom: 28 },
  gallery: { width: '100%' },
  detailImage: { width: 390, height: 300, backgroundColor: '#E9EFEE' },
  photoCount: { textAlign: 'center', color: '#647270', paddingVertical: 8 },
  detailBody: { padding: 18, alignItems: 'flex-end' },
  detailTitle: { fontSize: 23, fontWeight: '900', color: '#243333', textAlign: 'right' },
  detailText: { fontSize: 15, color: '#334241', lineHeight: 25, marginTop: 16, textAlign: 'right' },
  phone: { marginTop: 18, fontSize: 16, fontWeight: '800', color: '#0F766E' },
});
