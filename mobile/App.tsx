import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';

type Category = { id: number; name: string; slug?: string };
type ListingImage = { id: number; url?: string; path?: string };
type User = { id: number; name: string; phone: string; role?: string };
type Listing = {
  id: number;
  title: string;
  description?: string;
  price: string | number | null;
  city: string;
  category_id?: number;
  category?: Category;
  images?: ListingImage[];
  user?: User;
  show_phone?: boolean;
  latitude?: number | string | null;
  longitude?: number | string | null;
  published_at?: string | null;
  created_at?: string | null;
};
type Paginated<T> = { data: T[] };
type Screen = 'home' | 'favorites' | 'add' | 'notifications' | 'messages' | 'mine' | 'account';
type SortMode = 'new' | 'price-low' | 'price-high';
type ViewMode = 'list' | 'grid';

type Coordinates = { latitude: number; longitude: number };

const API_URL = 'https://used.pm.sa/api';
const SITE_URL = 'https://used.pm.sa';
const PURPLE = '#6426C8';
const PURPLE_DARK = '#4B169E';
const PURPLE_LIGHT = '#F2EBFF';
const TEXT = '#18181B';
const MUTED = '#71717A';
const BORDER = '#E7E2EF';
const SURFACE = '#F8F7FA';
const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });


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

function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('سيار') || n.includes('مركب')) return 'car-sport-outline';
  if (n.includes('عقار') || n.includes('منزل') || n.includes('شقق')) return 'business-outline';
  if (n.includes('جوال') || n.includes('هاتف')) return 'phone-portrait-outline';
  if (n.includes('جهاز') || n.includes('إلكتر')) return 'laptop-outline';
  if (n.includes('أثاث') || n.includes('منزلية')) return 'bed-outline';
  if (n.includes('خدم')) return 'construct-outline';
  if (n.includes('أزياء') || n.includes('ملابس')) return 'shirt-outline';
  return 'pricetag-outline';
}

function relativeTime(value?: string | null) {
  if (!value) return 'الآن';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return 'الآن';
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (mins < 2) return 'الآن';
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? 'قبل ساعة' : `قبل ${hours} ساعات`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'قبل يوم' : `قبل ${days} أيام`;
}

function distanceKm(a: Coordinates, listing: Listing) {
  const lat2 = Number(listing.latitude);
  const lon2 = Number(listing.longitude);
  if (!Number.isFinite(lat2) || !Number.isFinite(lon2)) return Number.POSITIVE_INFINITY;
  const rad = (x: number) => x * Math.PI / 180;
  const R = 6371;
  const dLat = rad(lat2 - a.latitude);
  const dLon = rad(lon2 - a.longitude);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function IconButton({ name, onPress, dark = false }: { name: any; onPress?: () => void; dark?: boolean }) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton} hitSlop={8}>
      <Ionicons name={name} size={27} color={dark ? TEXT : '#FFFFFF'} />
    </Pressable>
  );
}

function ListingCard({
  item,
  onPress,
  favorite,
  onFavorite,
  compact = false,
  distance,
}: {
  item: Listing;
  onPress: () => void;
  favorite: boolean;
  onFavorite: () => void;
  compact?: boolean;
  distance?: number;
}) {
  const uri = imageUrl(item.images?.[0]);
  return (
    <Pressable style={[styles.card, compact && styles.cardGrid]} onPress={onPress}>
      <View style={[styles.cardImageWrap, compact && styles.cardImageWrapGrid]}>
        {uri ? <Image source={{ uri }} style={[styles.cardImage, compact && styles.cardImageGrid]} resizeMode="cover" /> : (
          <View style={styles.noImageBox}>
            <Ionicons name="image-outline" size={32} color="#B2A9BF" />
            <Text style={styles.noImage}>لا توجد صورة</Text>
          </View>
        )}
        <Pressable
          style={styles.favoriteBubble}
          onPress={(event) => {
            event.stopPropagation?.();
            onFavorite();
          }}
        >
          <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={21} color={favorite ? PURPLE : '#5E5965'} />
        </Pressable>
      </View>
      <View style={[styles.cardBody, compact && styles.cardBodyGrid]}>
        <Text numberOfLines={2} style={[styles.cardTitle, compact && styles.cardTitleGrid]}>{item.title}</Text>
        <Text style={styles.price}>{item.price ? `${money.format(Number(item.price))} ر.س` : 'السعر عند التواصل'}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={16} color={MUTED} />
          <Text numberOfLines={1} style={styles.metaText}>{item.city || 'بدون مدينة'}</Text>
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={15} color={MUTED} />
            <Text style={styles.metaSmall}>{relativeTime(item.published_at || item.created_at)}</Text>
          </View>
          {!compact ? (
            <View style={styles.sellerRow}>
              <Text numberOfLines={1} style={styles.sellerText}>{item.user?.name || 'البائع'}</Text>
              <View style={styles.sellerIcon}><Ionicons name="person" size={12} color={PURPLE} /></View>
            </View>
          ) : null}
        </View>
        {Number.isFinite(distance) ? <Text style={styles.distanceText}>يبعد {distance!.toFixed(distance! < 10 ? 1 : 0)} كم</Text> : null}
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
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <View style={styles.formIcon}><Ionicons name="person-outline" size={34} color={PURPLE} /></View>
      <Text style={styles.sectionTitle}>تسجيل الدخول</Text>
      <Text style={styles.help}>سجّل الدخول لإضافة إعلان ومتابعة إعلاناتك.</Text>
      <View style={styles.inputShell}><Ionicons name="call-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" textAlign="right" /></View>
      <View style={styles.inputShell}><Ionicons name="lock-closed-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={pin} onChangeText={setPin} placeholder="الرقم السري" keyboardType="number-pad" secureTextEntry textAlign="right" /></View>
      <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>دخول</Text>}
      </Pressable>
      <Text style={styles.note}>التسجيل واستعادة الرقم السري عبر واتساب سيُربطان بهذه الشاشة في المرحلة التالية.</Text>
    </ScrollView>
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
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);

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

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return Alert.alert('الموقع', 'اسمح للتطبيق بالوصول للموقع لإضافة الموقع الدقيق للإعلان.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      Alert.alert('تم تحديد الموقع', 'سيُحفظ الموقع الدقيق مع الإعلان لاستخدام ميزة القريب.');
    } catch {
      Alert.alert('الموقع', 'تعذر تحديد موقعك الآن.');
    } finally {
      setLocating(false);
    }
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
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          status: 'published',
          show_phone: showPhone,
        }),
      }, token);

      for (const asset of images) {
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
            const errors = body?.errors ? Object.values(body.errors).flat().join('، ') : '';
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
      <Text style={styles.sectionTitle}>أضف إعلان جديد</Text>
      <Text style={styles.help}>صور واضحة ومعلومات دقيقة ترفع فرصة البيع.</Text>

      <View style={styles.formCard}>
        <View style={styles.formCardTitleRow}><Text style={styles.formCardTitle}>صور الإعلان</Text><Text style={styles.counter}>{images.length}/8</Text></View>
        <Pressable style={styles.uploadButton} onPress={chooseImages}>
          <Ionicons name="images-outline" size={22} color={PURPLE} />
          <Text style={styles.uploadButtonText}>اختيار الصور</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewRow}>
          {images.map((asset, index) => (
            <View key={`${asset.assetId || asset.uri}-${index}`} style={styles.previewWrap}>
              <Image source={{ uri: asset.uri }} style={styles.preview} />
              <Pressable style={styles.removeButton} onPress={() => setImages((current) => current.filter((_, i) => i !== index))}>
                <Ionicons name="close" size={16} color="#fff" />
              </Pressable>
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

      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="عنوان الإعلان" textAlign="right" />
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="اكتب وصف السلعة وحالتها بالتفصيل..." multiline textAlignVertical="top" textAlign="right" />
      <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="السعر (اختياري)" keyboardType="decimal-pad" textAlign="right" />
      <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="المدينة" textAlign="right" />

      <Pressable style={[styles.locationButton, coords && styles.locationButtonDone]} onPress={useMyLocation} disabled={locating}>
        <Ionicons name={coords ? 'checkmark-circle' : 'navigate-outline'} size={21} color={coords ? '#16834A' : PURPLE} />
        <Text style={[styles.locationButtonText, coords && { color: '#16834A' }]}>{locating ? 'جاري تحديد الموقع...' : coords ? 'تم حفظ الموقع الدقيق' : 'استخدام موقعي الحالي'}</Text>
      </Pressable>

      <View style={styles.switchRow}>
        <Switch value={showPhone} onValueChange={setShowPhone} trackColor={{ false: '#D4D4D8', true: '#C8ABFF' }} thumbColor={showPhone ? PURPLE : '#fff'} />
        <Text style={styles.switchText}>إظهار رقم الجوال للمشترين</Text>
      </View>

      <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submit} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.primaryButtonText}>نشر الإعلان مجانًا</Text></>}
      </Pressable>
    </ScrollView>
  );
}

function EmptyScreen({ icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <View style={styles.emptyPage}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={46} color={PURPLE} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
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
  const [detail, setDetail] = useState<Listing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionDraft, setRegionDraft] = useState<string[]>([]);
  const [regionSearch, setRegionSearch] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('new');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [nearCoords, setNearCoords] = useState<Coordinates | null>(null);
  const [nearBusy, setNearBusy] = useState(false);
  const [nearMode, setNearMode] = useState(false);

  const listingsPath = useMemo(() => {
    const params: string[] = [];
    if (selectedCategory) params.push(`category_id=${selectedCategory}`);
    if (query) params.push(`q=${encodeURIComponent(query)}`);
    return `/listings${params.length ? `?${params.join('&')}` : ''}`;
  }, [selectedCategory, query]);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cats, result] = await Promise.all([
        request<Category[]>('/categories'),
        request<Paginated<Listing>>(listingsPath),
      ]);
      const nextListings = Array.isArray(result?.data) ? result.data : [];
      setCategories(Array.isArray(cats) ? cats : []);
      setListings(nextListings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [listingsPath]);

  useEffect(() => { loadHome(); }, [loadHome, refreshKey]);

  useEffect(() => {
    if (screen !== 'mine' || !token) return;
    setMineLoading(true);
    request<Paginated<Listing>>('/my/listings', {}, token)
      .then((r) => setMine(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => Alert.alert('إعلاناتي', e instanceof Error ? e.message : 'تعذر التحميل'))
      .finally(() => setMineLoading(false));
  }, [screen, token, refreshKey]);

  const visibleListings = useMemo(() => {
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

  const favoriteListings = useMemo(() => listings.filter((x) => favorites.includes(x.id)), [listings, favorites]);

  const toggleFavorite = (id: number) => setFavorites((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try { setDetail(await request<Listing>(`/listings/${id}`, {}, token || undefined)); }
    catch (e) { Alert.alert('الإعلان', e instanceof Error ? e.message : 'تعذر فتح الإعلان'); }
    finally { setDetailLoading(false); }
  };

  const submitSearch = () => {
    setQuery(searchDraft.trim());
    setScreen('home');
  };

  const enableNearby = async () => {
    if (nearMode) {
      setNearMode(false);
      return;
    }
    setNearBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) return Alert.alert('القريب', 'اسمح بالوصول للموقع لترتيب الإعلانات حسب قربها منك.');
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setNearCoords(coords);
      setNearMode(true);
      if (!listings.some((x) => Number.isFinite(Number(x.latitude)) && Number.isFinite(Number(x.longitude)))) {
        Alert.alert('القريب', 'تم تحديد موقعك، لكن الإعلانات الحالية لا تحتوي مواقع دقيقة بعد. الإعلانات الجديدة ستدعم هذه الميزة.');
      }
    } catch {
      Alert.alert('القريب', 'تعذر تحديد موقعك الآن.');
    } finally {
      setNearBusy(false);
    }
  };

  const loggedIn = (nextToken: string, nextUser: User) => { setToken(nextToken); setUser(nextUser); };
  const published = () => { setRefreshKey((x) => x + 1); setScreen('home'); };
  const resetFilters = () => {
    setSelectedCategory(undefined);
    setSelectedRegions([]);
    setMinPrice('');
    setMaxPrice('');
    setSortMode('new');
    setNearMode(false);
    setQuery('');
    setSearchDraft('');
  };

  const filteredRegionOptions = useMemo(() => {
    const q = regionSearch.trim();
    if (!q) return REGION_OPTIONS;
    return REGION_OPTIONS.filter((name) => name.includes(q));
  }, [regionSearch]);

  const toggleRegionDraft = (name: string) => {
    setRegionDraft((current) => current.includes(name) ? current.filter((x) => x !== name) : [...current, name]);
  };

  const header = (
    <View style={styles.marketHeader}>
      <Text style={styles.marketTitle}>مستعمل مجاني</Text>
      <View style={styles.searchHeaderRow}>
        <IconButton name="grid-outline" onPress={() => setMenuOpen(true)} />
        <View style={styles.searchBox}>
          <Ionicons name="mic-outline" size={22} color={PURPLE} />
          <View style={styles.searchDivider} />
          <Ionicons name="camera-outline" size={22} color={PURPLE} />
          <TextInput
            value={searchDraft}
            onChangeText={setSearchDraft}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            placeholder="ابحث عن سلعة، سيارة، عقار..."
            placeholderTextColor="#A1A1AA"
            style={styles.searchInput}
            textAlign="right"
          />
          <Pressable onPress={submitSearch} hitSlop={8}><Ionicons name="search-outline" size={27} color={PURPLE} /></Pressable>
        </View>
        <IconButton name="menu-outline" onPress={() => setMenuOpen(true)} />
      </View>
    </View>
  );

  const storyRow = (
    <ScrollView horizontal style={styles.storyScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storyRow}>
      {categories.slice(0, 6).map((category) => {
        const sample = listings.find((x) => (x.category?.id || x.category_id) === category.id && imageUrl(x.images?.[0]));
        const sampleUri = imageUrl(sample?.images?.[0]);
        return (
          <Pressable key={category.id} style={styles.storyItem} onPress={() => setSelectedCategory(category.id)}>
            <View style={[styles.storyCircle, selectedCategory === category.id && styles.storyCircleActive]}>
              {sampleUri ? <Image source={{ uri: sampleUri }} style={styles.storyImage} /> : <Ionicons name={categoryIcon(category.name) as any} size={30} color={PURPLE} />}
            </View>
            <Text numberOfLines={1} style={styles.storyLabel}>{category.name}</Text>
          </Pressable>
        );
      })}
      <Pressable style={styles.storyItem} onPress={() => setSelectedCategory(undefined)}>
        <View style={styles.storyCircle}><Ionicons name="ellipsis-horizontal" size={31} color={PURPLE} /></View>
        <Text style={styles.storyLabel}>المزيد</Text>
      </Pressable>
    </ScrollView>
  );

  const categoryTabs = (
    <ScrollView horizontal style={styles.categoryScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryTabs}>
      <Pressable style={styles.categoryTab} onPress={() => setSelectedCategory(undefined)}>
        <Text style={[styles.categoryTabText, selectedCategory === undefined && styles.categoryTabTextActive]}>الرئيسية</Text>
        {selectedCategory === undefined ? <View style={styles.categoryUnderline} /> : null}
      </Pressable>
      {categories.slice(0, 7).map((category) => (
        <Pressable key={category.id} style={styles.categoryTab} onPress={() => setSelectedCategory(category.id)}>
          <Text style={[styles.categoryTabText, selectedCategory === category.id && styles.categoryTabTextActive]}>{category.name}</Text>
          {selectedCategory === category.id ? <View style={styles.categoryUnderline} /> : null}
        </Pressable>
      ))}
    </ScrollView>
  );

  const toolbar = (
    <>
      <ScrollView horizontal style={styles.filterScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Pressable style={[styles.filterChip, selectedRegions.length > 0 && styles.filterChipActive]} onPress={() => { setRegionDraft(selectedRegions); setRegionSearch(''); setRegionOpen(true); setFilterOpen(false); }}>
          <Ionicons name="location" size={18} color={selectedRegions.length > 0 ? '#fff' : PURPLE} />
          <Text style={[styles.filterChipText, selectedRegions.length > 0 && styles.filterChipTextActive]}>{selectedRegions.length === 0 ? 'كل المناطق' : selectedRegions.length === 1 ? selectedRegions[0] : `${selectedRegions.length} مناطق`}</Text>
          <Ionicons name="chevron-down" size={15} color={selectedRegions.length > 0 ? '#fff' : PURPLE} />
        </Pressable>
        <Pressable style={[styles.filterChip, filterOpen && styles.filterChipActive]} onPress={() => { setFilterOpen((x) => !x); setRegionOpen(false); }}>
          <Ionicons name="funnel" size={18} color={filterOpen ? '#fff' : PURPLE} />
          <Text style={[styles.filterChipText, filterOpen && styles.filterChipTextActive]}>تصفية</Text>
        </Pressable>
        <Pressable style={styles.filterChip} onPress={() => Alert.alert('الخريطة', 'واجهة الخريطة جاهزة كخيار، وسيتم تفعيل الخريطة التفاعلية في النسخة المبنية خارج Expo Go.') }>
          <Ionicons name="map-outline" size={19} color={PURPLE} />
          <Text style={styles.filterChipText}>الخريطة</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, nearMode && styles.filterChipActive]} onPress={enableNearby} disabled={nearBusy}>
          {nearBusy ? <ActivityIndicator size="small" color={nearMode ? '#fff' : PURPLE} /> : <Ionicons name="locate-outline" size={19} color={nearMode ? '#fff' : PURPLE} />}
          <Text style={[styles.filterChipText, nearMode && styles.filterChipTextActive]}>القريب</Text>
        </Pressable>
        <Pressable style={styles.viewToggle} onPress={() => setViewMode((x) => x === 'list' ? 'grid' : 'list')}>
          <Ionicons name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} size={23} color={PURPLE} />
        </Pressable>
      </ScrollView>

      {filterOpen ? (
        <View style={styles.inlinePanel}>
          <View style={styles.panelTopRow}><Pressable onPress={resetFilters}><Text style={styles.resetText}>إعادة الضبط</Text></Pressable><Text style={styles.panelTitle}>تصفية النتائج</Text></View>
          <View style={styles.priceFilterRow}>
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
        </View>
      ) : null}
    </>
  );

  if (detailLoading) return <View style={styles.center}><ActivityIndicator size="large" color={PURPLE} /><Text style={styles.stateText}>جاري فتح الإعلان...</Text></View>;

  if (detail) {
    const photos = detail.images || [];
    const favorite = favorites.includes(detail.id);
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
        <View style={styles.detailTopBar}>
          <IconButton name="arrow-forward" onPress={() => setDetail(null)} />
          <Text style={styles.detailBarTitle}>تفاصيل الإعلان</Text>
          <Pressable style={styles.detailFavorite} onPress={() => toggleFavorite(detail.id)}><Ionicons name={favorite ? 'heart' : 'heart-outline'} size={24} color="#fff" /></Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.detailPage}>
          {photos.length ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
              {photos.map((photo) => <Image key={photo.id} source={{ uri: imageUrl(photo) }} style={styles.detailImage} resizeMode="cover" />)}
            </ScrollView>
          ) : <View style={styles.detailNoImage}><Ionicons name="images-outline" size={48} color="#B2A9BF" /><Text style={styles.noImage}>لا توجد صور</Text></View>}
          {photos.length > 1 ? <Text style={styles.photoCount}>{photos.length} صور • اسحب للتنقل</Text> : null}
          <View style={styles.detailBody}>
            <Text style={styles.detailTitle}>{detail.title}</Text>
            <Text style={styles.detailPrice}>{detail.price ? `${money.format(Number(detail.price))} ر.س` : 'السعر عند التواصل'}</Text>
            <View style={styles.detailMetaLine}><Text style={styles.detailMetaText}>{detail.city}</Text><Ionicons name="location-outline" size={19} color={PURPLE} /></View>
            <View style={styles.detailSeparator} />
            <Text style={styles.detailSectionTitle}>الوصف</Text>
            <Text style={styles.detailText}>{detail.description || 'بدون وصف'}</Text>
            {detail.user ? (
              <View style={styles.sellerCard}>
                <View style={styles.sellerAvatar}><Ionicons name="person" size={24} color={PURPLE} /></View>
                <View style={styles.sellerInfo}><Text style={styles.sellerName}>{detail.user.name}</Text><Text style={styles.sellerSub}>البائع</Text></View>
              </View>
            ) : null}
            {detail.user?.phone ? (
              <View style={styles.phoneBox}><Ionicons name="call" size={20} color="#fff" /><Text style={styles.phoneText}>{detail.user.phone}</Text></View>
            ) : null}
          </View>
        </ScrollView>
      </View>
    );
  }

  const homeContent = (
    <ScrollView contentContainerStyle={styles.homePage} keyboardShouldPersistTaps="handled">
      {header}
      {storyRow}
      {categoryTabs}
      {toolbar}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultCount}>{visibleListings.length} إعلان</Text>
        <Text style={styles.resultsTitle}>{query ? `نتائج: ${query}` : selectedCategory ? categories.find((x) => x.id === selectedCategory)?.name || 'الإعلانات' : 'أحدث الإعلانات'}</Text>
      </View>
      {loading ? <View style={styles.stateBox}><ActivityIndicator size="large" color={PURPLE} /><Text style={styles.stateText}>جاري تحميل الإعلانات...</Text></View>
        : error ? <Pressable style={styles.errorBox} onPress={loadHome}><Text style={styles.errorText}>{error} — اضغط للمحاولة</Text></Pressable>
        : visibleListings.length === 0 ? <EmptyScreen icon="search-outline" title="لا توجد نتائج" text="جرّب تغيير البحث أو الفلاتر." />
        : viewMode === 'list' ? (
          <View style={styles.listWrap}>{visibleListings.map((item) => <ListingCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} distance={nearMode && nearCoords ? distanceKm(nearCoords, item) : undefined} />)}</View>
        ) : (
          <View style={styles.gridWrap}>{visibleListings.map((item) => <ListingCard key={item.id} compact item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} distance={nearMode && nearCoords ? distanceKm(nearCoords, item) : undefined} />)}</View>
        )}
    </ScrollView>
  );

  let content = homeContent;
  if (screen === 'favorites') content = (
    <ScrollView contentContainerStyle={styles.standardPage}>
      <Text style={styles.sectionTitle}>المفضلة</Text>
      <Text style={styles.help}>الإعلانات التي حفظتها أثناء التصفح.</Text>
      {favoriteListings.length ? favoriteListings.map((item) => <ListingCard key={item.id} item={item} favorite onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />) : <EmptyScreen icon="heart-outline" title="لا توجد مفضلة" text="اضغط على القلب في أي إعلان لحفظه هنا." />}
    </ScrollView>
  );
  if (screen === 'add') content = token ? <CreateListing categories={categories} token={token} onPublished={published} /> : <LoginPanel onLogin={loggedIn} />;
  if (screen === 'notifications') content = <EmptyScreen icon="notifications-outline" title="الإشعارات" text="ستظهر هنا تحديثات إعلاناتك وطلبات المشترين عند ربط خدمة الإشعارات." />;
  if (screen === 'messages') content = <EmptyScreen icon="chatbubble-ellipses-outline" title="الرسائل" text="واجهة الرسائل جاهزة في الشريط، وسيتم ربط المحادثات بقاعدة البيانات لاحقًا." />;
  if (screen === 'mine') content = token ? (
    <ScrollView contentContainerStyle={styles.standardPage}>
      <Text style={styles.sectionTitle}>إعلاناتي</Text>
      {mineLoading ? <ActivityIndicator color={PURPLE} /> : mine.length ? mine.map((item) => <ListingCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />) : <EmptyScreen icon="albums-outline" title="لا توجد إعلانات" text="أضف أول إعلان لك من زر الإضافة." />}
    </ScrollView>
  ) : <LoginPanel onLogin={loggedIn} />;
  if (screen === 'account') content = token && user ? (
    <ScrollView contentContainerStyle={styles.standardPage}>
      <Text style={styles.sectionTitle}>حسابي</Text>
      <View style={styles.accountCard}>
        <View style={styles.accountAvatar}><Ionicons name="person" size={34} color={PURPLE} /></View>
        <Text style={styles.accountName}>{user.name}</Text>
        <Text style={styles.accountPhone}>{user.phone}</Text>
      </View>
      <Pressable style={styles.menuAction} onPress={() => setScreen('mine')}><Ionicons name="albums-outline" size={22} color={PURPLE} /><Text style={styles.menuActionText}>إعلاناتي</Text><Ionicons name="chevron-back" size={20} color="#A1A1AA" /></Pressable>
      <Pressable style={styles.dangerButton} onPress={() => { setToken(''); setUser(null); setMine([]); setScreen('home'); }}><Ionicons name="log-out-outline" size={20} color="#DC2626" /><Text style={styles.dangerText}>تسجيل الخروج</Text></Pressable>
    </ScrollView>
  ) : <LoginPanel onLogin={loggedIn} />;

  const isHome = screen === 'home';
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
      {!isHome ? (
        <View style={styles.simpleTopBar}>
          <IconButton name="menu-outline" onPress={() => setMenuOpen(true)} />
          <Text style={styles.simpleTopTitle}>{screen === 'favorites' ? 'المفضلة' : screen === 'add' ? 'أضف إعلان' : screen === 'notifications' ? 'الإشعارات' : screen === 'messages' ? 'الرسائل' : screen === 'mine' ? 'إعلاناتي' : 'حسابي'}</Text>
          <Pressable style={styles.simpleHomeButton} onPress={() => setScreen('home')}><Ionicons name="home-outline" size={24} color="#fff" /></Pressable>
        </View>
      ) : null}
      <View style={styles.content}>{content}</View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomItem} onPress={() => setScreen('messages')}><Ionicons name={screen === 'messages' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={screen === 'messages' ? PURPLE : '#7C7783'} /><Text style={[styles.bottomLabel, screen === 'messages' && styles.bottomLabelActive]}>الرسائل</Text></Pressable>
        <Pressable style={styles.bottomItem} onPress={() => setScreen('notifications')}><Ionicons name={screen === 'notifications' ? 'notifications' : 'notifications-outline'} size={24} color={screen === 'notifications' ? PURPLE : '#7C7783'} /><Text style={[styles.bottomLabel, screen === 'notifications' && styles.bottomLabelActive]}>الإشعارات</Text></Pressable>
        <Pressable style={styles.fabWrap} onPress={() => setScreen('add')}>
          <View style={[styles.fab, screen === 'add' && styles.fabActive]}><Ionicons name="add" size={38} color="#fff" /><Text style={styles.fabLabel}>أضف إعلان</Text></View>
        </Pressable>
        <Pressable style={styles.bottomItem} onPress={() => setScreen('favorites')}><Ionicons name={screen === 'favorites' ? 'heart' : 'heart-outline'} size={25} color={screen === 'favorites' ? PURPLE : '#7C7783'} /><Text style={[styles.bottomLabel, screen === 'favorites' && styles.bottomLabelActive]}>المفضلة</Text></Pressable>
        <Pressable style={styles.bottomItem} onPress={() => setScreen('home')}><Ionicons name={screen === 'home' ? 'home' : 'home-outline'} size={25} color={screen === 'home' ? PURPLE : '#7C7783'} /><Text style={[styles.bottomLabel, screen === 'home' && styles.bottomLabelActive]}>الرئيسية</Text></Pressable>
      </View>

      {regionOpen ? (
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

      {menuOpen ? (
        <View style={styles.menuLayer} pointerEvents="box-none">
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.sideMenu}>
            <View style={styles.sideMenuHeader}><View style={styles.sideLogo}><Ionicons name="bag-handle" size={24} color="#fff" /></View><View style={{ flex: 1 }}><Text style={styles.sideTitle}>مستعمل مجاني</Text><Text style={styles.sideSub}>{user ? `مرحبًا ${user.name}` : 'بيع واشتري بسهولة'}</Text></View><Pressable onPress={() => setMenuOpen(false)}><Ionicons name="close" size={27} color={TEXT} /></Pressable></View>
            {([
              ['home', 'home-outline', 'الرئيسية'],
              ['mine', 'albums-outline', 'إعلاناتي'],
              ['account', 'person-outline', user ? 'حسابي' : 'تسجيل الدخول'],
              ['favorites', 'heart-outline', 'المفضلة'],
            ] as [Screen, any, string][]).map(([key, icon, label]) => (
              <Pressable key={key} style={styles.sideMenuItem} onPress={() => { setScreen(key); setMenuOpen(false); }}><Ionicons name={icon} size={22} color={PURPLE} /><Text style={styles.sideMenuText}>{label}</Text><Ionicons name="chevron-back" size={18} color="#A1A1AA" /></Pressable>
            ))}
            <View style={styles.sideDivider} />
            <Pressable style={styles.sideMenuItem} onPress={() => { resetFilters(); setMenuOpen(false); setScreen('home'); }}><Ionicons name="refresh-outline" size={22} color={PURPLE} /><Text style={styles.sideMenuText}>مسح البحث والفلاتر</Text><View style={{ width: 18 }} /></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SURFACE },
  content: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff' },
  stateText: { fontSize: 14, color: MUTED, textAlign: 'center' },

  marketHeader: { backgroundColor: PURPLE, paddingTop: 38, paddingHorizontal: 12, paddingBottom: 16 },
  marketTitle: { color: '#fff', fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 13 },
  searchHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  searchBox: { flex: 1, minHeight: 54, borderRadius: 28, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 8, shadowColor: '#2B0B57', shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  searchDivider: { height: 23, width: 1, backgroundColor: '#E4DDF0' },
  searchInput: { flex: 1, fontSize: 15, color: TEXT, paddingVertical: 0 },

  homePage: { paddingBottom: 18, backgroundColor: SURFACE },
  storyScroller: { height: 101, backgroundColor: '#fff' },
  storyRow: { minHeight: 101, backgroundColor: '#fff', paddingHorizontal: 10, paddingTop: 12, paddingBottom: 9, gap: 13, alignItems: 'flex-start' },
  storyItem: { width: 76, alignItems: 'center' },
  storyCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#8A54E8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF7FF', overflow: 'hidden' },
  storyCircleActive: { borderWidth: 4, borderColor: PURPLE },
  storyImage: { width: '100%', height: '100%' },
  storyLabel: { marginTop: 6, color: '#3F3A45', fontWeight: '700', fontSize: 11, textAlign: 'center', width: 76 },
  categoryScroller: { height: 50, backgroundColor: '#fff' },
  categoryTabs: { height: 50, backgroundColor: '#fff', paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#EEEAF2', alignItems: 'flex-end', gap: 4 },
  categoryTab: { minWidth: 72, minHeight: 49, alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 10, position: 'relative' },
  categoryTabText: { color: '#4B4650', fontSize: 13, fontWeight: '700' },
  categoryTabTextActive: { color: PURPLE, fontWeight: '900' },
  categoryUnderline: { position: 'absolute', bottom: 0, height: 3, borderRadius: 3, width: '75%', backgroundColor: PURPLE },

  filterScroller: { height: 67, backgroundColor: SURFACE },
  filterRow: { height: 67, paddingHorizontal: 12, paddingVertical: 12, gap: 8, alignItems: 'center' },
  filterChip: { minHeight: 43, borderRadius: 12, borderWidth: 1, borderColor: '#DDD4EA', backgroundColor: '#fff', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterChipActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  filterChipText: { color: PURPLE_DARK, fontSize: 12, fontWeight: '800' },
  filterChipTextActive: { color: '#fff' },
  viewToggle: { width: 46, height: 43, borderRadius: 12, borderWidth: 1, borderColor: '#DDD4EA', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  inlinePanel: { marginHorizontal: 12, marginBottom: 10, padding: 13, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  panelTitle: { color: TEXT, fontSize: 14, fontWeight: '900', textAlign: 'right' },
  panelTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resetText: { color: PURPLE, fontWeight: '800', fontSize: 12 },
  cityRow: { gap: 8, paddingTop: 10 },
  cityChip: { borderRadius: 20, backgroundColor: '#F5F3F7', paddingHorizontal: 14, paddingVertical: 9 },
  cityChipActive: { backgroundColor: PURPLE },
  cityChipText: { color: '#514B57', fontWeight: '700', fontSize: 12 },
  cityChipTextActive: { color: '#fff' },
  priceFilterRow: { flexDirection: 'row-reverse', gap: 8, marginTop: 12 },
  priceInput: { flex: 1, minHeight: 45, borderRadius: 12, borderWidth: 1, borderColor: BORDER, backgroundColor: '#FAFAFA', paddingHorizontal: 12 },
  sortLabel: { textAlign: 'right', color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 7 },
  sortRow: { flexDirection: 'row-reverse', gap: 7 },
  sortChip: { flex: 1, borderRadius: 10, backgroundColor: '#F5F3F7', alignItems: 'center', paddingVertical: 9 },
  sortChipActive: { backgroundColor: PURPLE_LIGHT },
  sortChipText: { color: MUTED, fontSize: 11, fontWeight: '700' },
  sortChipTextActive: { color: PURPLE, fontWeight: '900' },

  resultsHeader: { marginHorizontal: 14, marginTop: 1, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultsTitle: { fontSize: 16, fontWeight: '900', color: TEXT, textAlign: 'right' },
  resultCount: { fontSize: 12, color: MUTED, fontWeight: '700' },
  listWrap: { paddingBottom: 4 },
  gridWrap: { paddingHorizontal: 10, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  card: { marginHorizontal: 12, marginBottom: 10, height: 158, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: BORDER, flexDirection: 'row', overflow: 'hidden', shadowColor: '#1D102D', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  cardGrid: { width: '47.8%', marginHorizontal: 0, height: 288, flexDirection: 'column' },
  cardImageWrap: { width: '42%', height: 158, backgroundColor: '#EEEAF2', position: 'relative', overflow: 'hidden' },
  cardImageWrapGrid: { width: '100%', height: 142, minHeight: 142 },
  cardImage: { width: '100%', height: 158 },
  cardImageGrid: { height: 142 },
  noImageBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
  noImage: { color: '#9A929F', fontSize: 11 },
  favoriteBubble: { position: 'absolute', top: 9, left: 9, width: 35, height: 35, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.95)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
  cardBody: { flex: 1, height: 158, paddingHorizontal: 13, paddingVertical: 11, alignItems: 'flex-end', justifyContent: 'space-between' },
  cardBodyGrid: { minHeight: 145, padding: 11 },
  cardTitle: { color: TEXT, fontSize: 16, fontWeight: '900', textAlign: 'right', lineHeight: 21 },
  cardTitleGrid: { fontSize: 14, lineHeight: 19 },
  price: { color: PURPLE, fontSize: 16, fontWeight: '900', marginTop: 5, textAlign: 'right' },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { color: MUTED, fontSize: 12, maxWidth: 120, textAlign: 'right' },
  metaSmall: { color: MUTED, fontSize: 10 },
  cardFooter: { width: '100%', marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 115 },
  sellerText: { fontSize: 11, color: '#4F4955', flexShrink: 1 },
  sellerIcon: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#E1D6F2', backgroundColor: '#FAF7FF', alignItems: 'center', justifyContent: 'center' },
  distanceText: { color: PURPLE, fontSize: 10, fontWeight: '800', marginTop: 5 },

  stateBox: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  errorBox: { marginHorizontal: 14, marginTop: 6, padding: 16, borderRadius: 14, backgroundColor: '#FEE2E2' },
  errorText: { color: '#991B1B', textAlign: 'center' },
  emptyPage: { flexGrow: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: TEXT, fontSize: 20, fontWeight: '900', marginBottom: 7, textAlign: 'center' },
  emptyText: { color: MUTED, fontSize: 13, lineHeight: 21, textAlign: 'center', maxWidth: 290 },

  simpleTopBar: { minHeight: 86, paddingTop: 36, paddingHorizontal: 10, paddingBottom: 10, backgroundColor: PURPLE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  simpleTopTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  simpleHomeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  standardPage: { padding: 14, paddingBottom: 28, backgroundColor: SURFACE, flexGrow: 1 },
  formPage: { padding: 16, paddingBottom: 30, backgroundColor: SURFACE, flexGrow: 1 },
  formIcon: { alignSelf: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  sectionTitle: { fontSize: 24, fontWeight: '900', color: TEXT, textAlign: 'right', marginBottom: 7 },
  help: { color: MUTED, fontSize: 13, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  note: { color: '#8B8491', fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 18 },
  inputShell: { minHeight: 54, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 13, marginBottom: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputInner: { flex: 1, fontSize: 16, color: TEXT },
  input: { minHeight: 54, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 11, fontSize: 15, color: TEXT },
  textarea: { height: 125 },
  primaryButton: { minHeight: 54, backgroundColor: PURPLE, borderRadius: 15, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginTop: 7, shadowColor: PURPLE_DARK, shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  disabled: { opacity: 0.55 },
  formCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 13, marginBottom: 13 },
  formCardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formCardTitle: { fontSize: 14, fontWeight: '900', color: TEXT },
  counter: { color: PURPLE, fontWeight: '900', fontSize: 12 },
  uploadButton: { marginTop: 11, minHeight: 46, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#B99BE7', backgroundColor: '#FBF9FF', flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' },
  uploadButtonText: { color: PURPLE, fontWeight: '900' },
  previewRow: { gap: 9, paddingTop: 11 },
  previewWrap: { width: 92, height: 92, position: 'relative' },
  preview: { width: 92, height: 92, borderRadius: 12 },
  removeButton: { position: 'absolute', top: 4, left: 4, width: 25, height: 25, borderRadius: 13, backgroundColor: 'rgba(0,0,0,.68)', alignItems: 'center', justifyContent: 'center' },
  formLabel: { color: TEXT, fontWeight: '900', textAlign: 'right', marginBottom: 7 },
  formCategories: { gap: 8, paddingBottom: 12 },
  formCategory: { minHeight: 43, borderRadius: 22, borderWidth: 1, borderColor: '#CDB8EA', backgroundColor: '#fff', paddingHorizontal: 13, flexDirection: 'row', gap: 6, alignItems: 'center' },
  formCategoryActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  formCategoryText: { color: PURPLE_DARK, fontSize: 12, fontWeight: '800' },
  formCategoryTextActive: { color: '#fff' },
  locationButton: { minHeight: 50, borderRadius: 14, backgroundColor: PURPLE_LIGHT, borderWidth: 1, borderColor: '#D9C5F5', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 11 },
  locationButtonDone: { backgroundColor: '#ECFDF3', borderColor: '#B7E7C8' },
  locationButtonText: { color: PURPLE, fontWeight: '900', fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 13, marginBottom: 10 },
  switchText: { color: TEXT, fontWeight: '800', fontSize: 13 },

  accountCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: BORDER },
  accountAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  accountName: { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 4 },
  accountPhone: { color: MUTED, fontSize: 13 },
  menuAction: { marginTop: 12, minHeight: 55, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: BORDER },
  menuActionText: { flex: 1, textAlign: 'right', color: TEXT, fontWeight: '800' },
  dangerButton: { marginTop: 12, minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: '#F2B8B8', backgroundColor: '#FFF7F7', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dangerText: { color: '#DC2626', fontWeight: '900' },

  detailTopBar: { minHeight: 88, paddingTop: 38, paddingHorizontal: 10, backgroundColor: PURPLE, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailBarTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  detailFavorite: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  detailPage: { paddingBottom: 30, backgroundColor: SURFACE },
  gallery: { width: '100%', backgroundColor: '#EDE8F3' },
  detailImage: { width: 390, height: 310, backgroundColor: '#EDE8F3' },
  detailNoImage: { height: 280, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ECE8F0' },
  photoCount: { textAlign: 'center', color: MUTED, paddingVertical: 8, fontSize: 12 },
  detailBody: { margin: 12, padding: 17, borderRadius: 18, backgroundColor: '#fff', alignItems: 'flex-end', borderWidth: 1, borderColor: BORDER },
  detailTitle: { fontSize: 23, fontWeight: '900', color: TEXT, textAlign: 'right' },
  detailPrice: { color: PURPLE, fontSize: 22, fontWeight: '900', marginTop: 8 },
  detailMetaLine: { flexDirection: 'row-reverse', gap: 5, alignItems: 'center', marginTop: 9 },
  detailMetaText: { color: MUTED, fontSize: 13 },
  detailSeparator: { width: '100%', height: 1, backgroundColor: '#EEEAF2', marginVertical: 16 },
  detailSectionTitle: { fontSize: 16, fontWeight: '900', color: TEXT, marginBottom: 7 },
  detailText: { fontSize: 14, color: '#47414C', lineHeight: 24, textAlign: 'right' },
  sellerCard: { width: '100%', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#EEEAF2', flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  sellerAvatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  sellerInfo: { flex: 1, alignItems: 'flex-end' },
  sellerName: { color: TEXT, fontSize: 14, fontWeight: '900' },
  sellerSub: { color: MUTED, fontSize: 11, marginTop: 2 },
  phoneBox: { width: '100%', minHeight: 50, marginTop: 14, borderRadius: 14, backgroundColor: PURPLE, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  phoneText: { color: '#fff', fontWeight: '900', fontSize: 15 },

  bottomBar: { minHeight: 72, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E3ED', flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 7, paddingHorizontal: 4, shadowColor: '#20142D', shadowOpacity: 0.08, shadowRadius: 10, elevation: 8 },
  bottomItem: { flex: 1, minHeight: 57, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bottomLabel: { color: '#7C7783', fontSize: 10, fontWeight: '700' },
  bottomLabelActive: { color: PURPLE, fontWeight: '900' },
  fabWrap: { flex: 1.18, minHeight: 72, alignItems: 'center', justifyContent: 'flex-end' },
  fab: { width: 78, height: 78, borderRadius: 39, backgroundColor: PURPLE, marginTop: -24, marginBottom: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#2C0E59', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  fabActive: { backgroundColor: PURPLE_DARK },
  fabLabel: { color: '#fff', fontSize: 9, fontWeight: '900', marginTop: -4 },

  regionOverlay: { ...StyleSheet.absoluteFill, zIndex: 70 },
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

  menuLayer: { ...StyleSheet.absoluteFill, zIndex: 50, flexDirection: 'row' },
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(15,8,23,.48)' },
  sideMenu: { width: '78%', maxWidth: 310, height: '100%', backgroundColor: '#fff', paddingTop: 45, paddingHorizontal: 14, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 14, elevation: 16 },
  sideMenuHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingBottom: 18 },
  sideLogo: { width: 46, height: 46, borderRadius: 15, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  sideTitle: { color: TEXT, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  sideSub: { color: MUTED, fontSize: 11, marginTop: 2, textAlign: 'right' },
  sideMenuItem: { minHeight: 55, borderRadius: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginBottom: 4 },
  sideMenuText: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '800', textAlign: 'right' },
  sideDivider: { height: 1, backgroundColor: '#EEEAF2', marginVertical: 8 },
});
