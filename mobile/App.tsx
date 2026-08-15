import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import * as SecureStore from 'expo-secure-store';
import AdminPanel from './AdminPanel';
import LegalScreen from './LegalScreen';
import AgeGate from './AgeGate';
import ListingsMap from './ListingsMap';
import { BlockedUsersPanel, ChatSafetyActions, ListingSafetyActions, ReportMessageButton } from './Moderation';

type Category = { id: number; name: string; slug?: string };
type ListingImage = { id: number; url?: string; path?: string; original_url?: string; processed_url?: string | null; processing_status?: string };
type User = { id: number; name: string; phone?: string | null; username?: string | null; role?: string };
type Listing = {
  id: number;
  title: string;
  description?: string;
  item_condition?: ItemCondition;
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
  status?: 'draft' | 'published' | 'sold' | 'archived';
  video_path?: string | null;
};
type Paginated<T> = { data: T[] };
type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  body: string;
  read_at?: string | null;
  created_at?: string;
  sender?: User;
};
type Conversation = {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  last_message_at?: string | null;
  listing?: Listing;
  buyer?: User;
  seller?: User;
  last_message?: ChatMessage | null;
  unread_count?: number;
};
type MessageNotification = ChatMessage & { conversation?: Conversation };
type Screen = 'home' | 'map' | 'favorites' | 'add' | 'notifications' | 'messages' | 'mine' | 'account' | 'blocked' | 'privacy' | 'terms' | 'admin';
type ViewMode = 'list' | 'grid';
type ItemCondition = 'new_good' | 'new_defect' | 'used_good' | 'used_defect';

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

const ITEM_CONDITIONS: { key: ItemCondition; label: string; icon: any }[] = [
  { key: 'new_good', label: 'جديدة سليمة', icon: 'sparkles-outline' },
  { key: 'new_defect', label: 'جديدة بها عيب', icon: 'alert-circle-outline' },
  { key: 'used_good', label: 'مستعملة سليمة', icon: 'checkmark-circle-outline' },
  { key: 'used_defect', label: 'مستعملة بها عيب', icon: 'warning-outline' },
];

function itemConditionLabel(value?: ItemCondition) {
  return ITEM_CONDITIONS.find((item) => item.key === value)?.label || 'مستعملة سليمة';
}


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

function videoUrl(path?: string | null) {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${SITE_URL}${path}`;
  if (path.startsWith('storage/')) return `${SITE_URL}/${path}`;
  return `${SITE_URL}/storage/${path}`;
}

function validateVideoAsset(asset: ImagePicker.ImagePickerAsset) {
  const maxBytes = 100 * 1024 * 1024;
  if (asset.fileSize && asset.fileSize > maxBytes) {
    throw new Error('حجم الفيديو أكبر من 100MB. اختر فيديو أقصر أو أقل حجمًا.');
  }
  return asset;
}

async function capturePhotoAsset() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error('اسمح للتطبيق باستخدام الكاميرا لالتقاط الصور.');
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, cameraType: ImagePicker.CameraType.back });
  return result.canceled ? null : result.assets[0];
}

async function pickVideoAsset(source: 'library' | 'camera') {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('اسمح للتطبيق باستخدام الكاميرا لتصوير الفيديو.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60, cameraType: ImagePicker.CameraType.back });
    return result.canceled ? null : validateVideoAsset(result.assets[0]);
  }
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('اسمح للتطبيق بالوصول إلى الصور والفيديو.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsMultipleSelection: false });
  return result.canceled ? null : validateVideoAsset(result.assets[0]);
}

async function uploadListingVideo(listingId: number, asset: ImagePicker.ImagePickerAsset, token: string) {
  const upload = await FileSystem.uploadAsync(`${API_URL}/listings/${listingId}/video`, asset.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'video',
    mimeType: asset.mimeType || 'video/mp4',
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
  });
  if (upload.status < 200 || upload.status >= 300) {
    let message = `تعذر رفع الفيديو (${upload.status})`;
    try {
      const body = JSON.parse(upload.body || '{}');
      const errors = body?.errors ? Object.values(body.errors).flat().join('، ') : '';
      message = errors || body?.message || message;
    } catch {}
    throw new Error(message);
  }
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

function ItemConditionDropdown({ value, onChange }: { value?: ItemCondition; onChange: (value: ItemCondition) => void }) {
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
        {uri ? <Image source={{ uri }} style={[styles.cardImage, compact && styles.cardImageGrid]} resizeMode={item.images?.[0]?.processed_url ? 'contain' : 'cover'} /> : (
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
        {item.video_path ? <View style={styles.videoBadge}><Ionicons name="videocam" size={13} color="#fff" /><Text style={styles.videoBadgeText}>فيديو</Text></View> : null}
      </View>
      <View style={[styles.cardBody, compact && styles.cardBodyGrid]}>
        <Text numberOfLines={2} style={[styles.cardTitle, compact && styles.cardTitleGrid]}>{item.title}</Text>
        <Text style={styles.price}>مجانا</Text>
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
  const [mode, setMode] = useState<'user' | 'register' | 'admin'>('user');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);

  const normalizedPhone = () => {
    const digits = phone.replace(/\D/g, '');
    if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
    if (/^5\d{8}$/.test(digits)) return `966${digits}`;
    if (/^9665\d{8}$/.test(digits)) return digits;
    throw new Error('أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx.');
  };

  const submitLogin = async () => {
    setBusy(true);
    try {
      let result: { token: string; user: User };
      if (mode === 'admin') {
        if (!username.trim() || !password) throw new Error('أدخل اسم المستخدم وكلمة المرور.');
        result = await request<{ token: string; user: User }>('/auth/admin-login', {
          method: 'POST', body: JSON.stringify({ username: username.trim(), password, device_name: 'Used Admin Android' }),
        });
      } else {
        const normalized = normalizedPhone();
        if (!/^\d{4,8}$/.test(pin)) throw new Error('أدخل الرقم السري من 4 إلى 8 أرقام.');
        result = await request<{ token: string; user: User }>('/auth/login', {
          method: 'POST', body: JSON.stringify({ phone: normalized, pin, device_name: 'Used Android' }),
        });
      }
      onLogin(result.token, result.user);
    } catch (e) {
      Alert.alert('تعذر تسجيل الدخول', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const sendRegistrationOtp = async () => {
    setBusy(true);
    try {
      if (!ageVerified) throw new Error('يجب التحقق من العمر قبل إنشاء الحساب.');
      if (!termsAccepted) throw new Error('يجب الموافقة على الشروط والأحكام وسياسة الخصوصية أولاً.');
      const normalized = normalizedPhone();
      if (!name.trim()) throw new Error('أدخل اسمك.');
      if (!/^\d{4,8}$/.test(pin)) throw new Error('اختر رقمًا سريًا من 4 إلى 8 أرقام.');
      await request<{ message: string; expires_in: number }>('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: normalized, purpose: 'register' }),
      });
      setOtpSent(true);
      setOtp('');
      Alert.alert('تم إرسال الرمز', 'أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى واتساب. الرمز صالح لمدة 5 دقائق.');
    } catch (e) {
      Alert.alert('تعذر إرسال الرمز', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const verifyRegistrationOtp = async () => {
    setBusy(true);
    try {
      if (!ageVerified) throw new Error('يجب التحقق من العمر قبل إنشاء الحساب.');
      if (!termsAccepted) throw new Error('يجب الموافقة على الشروط والأحكام وسياسة الخصوصية أولاً.');
      const normalized = normalizedPhone();
      if (!name.trim()) throw new Error('أدخل اسمك.');
      if (!/^\d{4,8}$/.test(pin)) throw new Error('اختر رقمًا سريًا من 4 إلى 8 أرقام.');
      if (!/^\d{6}$/.test(otp)) throw new Error('أدخل رمز التحقق المكوّن من 6 أرقام.');
      const result = await request<{ token: string; user: User }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: normalized,
          purpose: 'register',
          code: otp,
          name: name.trim(),
          pin,
          device_name: 'Used Android',
        }),
      });
      onLogin(result.token, result.user);
      Alert.alert('تم التسجيل', 'تم التحقق من رقم واتساب وإنشاء حسابك بنجاح.');
    } catch (e) {
      Alert.alert('تعذر التحقق', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (next: 'user' | 'register' | 'admin') => {
    setMode(next);
    setOtpSent(false);
    setOtp('');
    setAgeVerified(false);
  };

  const title = mode === 'admin' ? 'دخول الإدارة' : mode === 'register' ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
  const help = mode === 'admin'
    ? 'دخول المدير للتحكم الكامل بالحسابات والإعلانات والإعدادات.'
    : mode === 'register'
      ? 'سجّل برقم جوالك، وسنؤكد الرقم برمز OTP يُرسل إلى واتساب.'
      : 'سجّل الدخول لإضافة إعلان ومتابعة إعلاناتك.';

  if (mode === 'register' && !ageVerified) {
    return <AgeGate onAllowed={() => setAgeVerified(true)} onBack={() => changeMode('user')} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <View style={styles.formIcon}>
        <Ionicons name={mode === 'admin' ? 'shield-checkmark-outline' : mode === 'register' ? 'person-add-outline' : 'person-outline'} size={34} color={PURPLE} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.help}>{help}</Text>

      <View style={{ flexDirection: 'row-reverse', gap: 7, marginBottom: 14 }}>
        <Pressable onPress={() => changeMode('user')} style={{ flex:1, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='user'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='user'?PURPLE:BORDER }}>
          <Text style={{ color:mode==='user'?'#fff':PURPLE, fontWeight:'900' }}>دخول</Text>
        </Pressable>
        <Pressable onPress={() => changeMode('register')} style={{ flex:1.2, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='register'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='register'?PURPLE:BORDER }}>
          <Text style={{ color:mode==='register'?'#fff':PURPLE, fontWeight:'900' }}>تسجيل جديد</Text>
        </Pressable>
        <Pressable onPress={() => changeMode('admin')} style={{ flex:1, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='admin'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='admin'?PURPLE:BORDER }}>
          <Text style={{ color:mode==='admin'?'#fff':PURPLE, fontWeight:'900' }}>الإدارة</Text>
        </Pressable>
      </View>

      {mode === 'admin' ? <>
        <View style={styles.inputShell}><Ionicons name="person-circle-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={username} onChangeText={setUsername} placeholder="اسم المستخدم" autoCapitalize="none" textAlign="right" /></View>
        <View style={styles.inputShell}><Ionicons name="key-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={password} onChangeText={setPassword} placeholder="كلمة المرور" secureTextEntry textAlign="right" /></View>
        <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submitLogin} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>دخول لوحة الإدارة</Text>}</Pressable>
      </> : mode === 'register' ? <>
        <View style={styles.inputShell}><Ionicons name="person-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={name} onChangeText={setName} placeholder="الاسم" textAlign="right" editable={!otpSent} /></View>
        <View style={styles.inputShell}><Ionicons name="logo-whatsapp" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" textAlign="right" editable={!otpSent} /></View>
        <View style={styles.inputShell}><Ionicons name="lock-closed-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={pin} onChangeText={setPin} placeholder="اختر رقمًا سريًا من 4 إلى 8 أرقام" keyboardType="number-pad" secureTextEntry textAlign="right" editable={!otpSent} /></View>
        <Pressable onPress={() => !otpSent && setTermsAccepted((x) => !x)} disabled={otpSent} style={{ minHeight:48, borderRadius:13, borderWidth:1, borderColor:termsAccepted?PURPLE:'#D8D2DF', backgroundColor:termsAccepted?PURPLE_LIGHT:'#fff', paddingHorizontal:12, flexDirection:'row-reverse', alignItems:'center', gap:9, marginBottom:7 }}>
          <Ionicons name={termsAccepted ? 'checkbox' : 'square-outline'} size={23} color={PURPLE} />
          <Text style={{ flex:1, textAlign:'right', color:TEXT, fontSize:12, fontWeight:'800' }}>أوافق على الشروط والأحكام وسياسة الخصوصية</Text>
        </Pressable>
        <View style={{ flexDirection:'row-reverse', justifyContent:'center', gap:18, marginBottom:10 }}>
          <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/terms`)}><Text style={{ color:PURPLE, fontSize:11, fontWeight:'900', textDecorationLine:'underline' }}>الشروط والأحكام</Text></Pressable>
          <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/privacy`)}><Text style={{ color:PURPLE, fontSize:11, fontWeight:'900', textDecorationLine:'underline' }}>سياسة الخصوصية</Text></Pressable>
        </View>
        {otpSent ? <>
          <View style={styles.inputShell}><Ionicons name="chatbubble-ellipses-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={otp} onChangeText={setOtp} placeholder="رمز OTP المرسل على واتساب" keyboardType="number-pad" maxLength={6} textAlign="right" /></View>
          <Text style={[styles.help, { marginTop: 0 }]}>أدخل الرمز خلال 5 دقائق. إذا لم يصلك، يمكنك طلب رمز جديد بعد دقيقة.</Text>
          <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={verifyRegistrationOtp} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>تأكيد الرمز وإنشاء الحساب</Text>}</Pressable>
          <Pressable onPress={sendRegistrationOtp} disabled={busy} style={{ alignItems:'center', paddingVertical:13 }}><Text style={{ color:PURPLE, fontWeight:'900' }}>إعادة إرسال رمز واتساب</Text></Pressable>
          <Pressable onPress={() => { setOtpSent(false); setOtp(''); }} disabled={busy} style={{ alignItems:'center', paddingVertical:8 }}><Text style={{ color:MUTED, fontWeight:'800' }}>تعديل البيانات</Text></Pressable>
        </> : (
          <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={sendRegistrationOtp} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}><Ionicons name="logo-whatsapp" size={20} color="#fff" /><Text style={styles.primaryButtonText}>إرسال رمز التحقق عبر واتساب</Text></View>}</Pressable>
        )}
      </> : <>
        <View style={styles.inputShell}><Ionicons name="call-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" textAlign="right" /></View>
        <View style={styles.inputShell}><Ionicons name="lock-closed-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={pin} onChangeText={setPin} placeholder="الرقم السري" keyboardType="number-pad" secureTextEntry textAlign="right" /></View>
        <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submitLogin} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>دخول</Text>}</Pressable>
        <Pressable onPress={() => changeMode('register')} style={{ alignItems:'center', paddingVertical:16 }}><Text style={{ color:PURPLE, fontWeight:'900' }}>ليس لديك حساب؟ تسجيل جديد عبر واتساب</Text></Pressable>
      </>}
    </ScrollView>
  );
}

function CreateListing({ categories, token, onPublished }: { categories: Category[]; token: string; onPublished: () => void }) {
  const [categoryId, setCategoryId] = useState<number>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemCondition, setItemCondition] = useState<ItemCondition>();
  const [city, setCity] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [video, setVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
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


  const takePhoto = async () => {
    if (images.length >= 8) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    try {
      const asset = await capturePhotoAsset();
      if (asset) setImages((current) => [...current, asset].slice(0, 8));
    } catch (e) { Alert.alert('الكاميرا', e instanceof Error ? e.message : 'تعذر فتح الكاميرا.'); }
  };

  const chooseVideo = async () => {
    try { const asset = await pickVideoAsset('library'); if (asset) setVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر اختيار الفيديو.'); }
  };

  const recordVideo = async () => {
    try { const asset = await pickVideoAsset('camera'); if (asset) setVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر تصوير الفيديو.'); }
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
    if (!categoryId || !itemCondition || !title.trim() || !description.trim() || !city.trim()) {
      return Alert.alert('بيانات ناقصة', 'أكمل التصنيف وحالة السلعة والعنوان والوصف والمدينة.');
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
          item_condition: itemCondition,
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
      if (video) await uploadListingVideo(listing.id, video, token);
      Alert.alert('تم بنجاح', `تم نشر الإعلان ورفع ${images.length} صورة${video ? ' وفيديو واحد' : ''}.`);
      onPublished();
    } catch (e) {
      Alert.alert('تعذر النشر', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <View style={styles.formCard}>
        <View style={styles.formCardTitleRow}><Text style={styles.formCardTitle}>صور الإعلان</Text><Text style={styles.counter}>{images.length}/8</Text></View>
        <View style={styles.mediaActionRow}>
          <Pressable style={styles.mediaActionButton} onPress={chooseImages}><Ionicons name="images-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>من الألبوم</Text></Pressable>
          <Pressable style={styles.mediaActionButton} onPress={takePhoto}><Ionicons name="camera-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير مباشر</Text></Pressable>
        </View>
        <Text style={{ color: MUTED, fontSize: 11, textAlign: 'right', marginTop: 5 }}>تُزال خلفية الصور تلقائيًا مع الاحتفاظ بالصورة الأصلية.</Text>
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
        <View style={styles.videoSection}>
          <View style={styles.formCardTitleRow}><Text style={styles.formCardTitle}>فيديو الإعلان</Text><Text style={styles.optionalLabel}>اختياري • فيديو واحد</Text></View>
          {video ? (
            <View style={styles.videoSelectedCard}>
              <Pressable style={styles.videoRemove} onPress={() => setVideo(null)}><Ionicons name="close" size={18} color="#fff" /></Pressable>
              <View style={styles.videoInfo}><Text numberOfLines={1} style={styles.videoTitle}>{video.fileName || 'فيديو الإعلان'}</Text><Text style={styles.videoMeta}>{video.duration ? `${Math.max(1, Math.round(video.duration / 1000))} ثانية` : 'فيديو جاهز للرفع'}</Text></View>
              <Ionicons name="videocam" size={28} color={PURPLE} />
            </View>
          ) : (
            <View style={styles.mediaActionRow}>
              <Pressable style={styles.mediaActionButton} onPress={chooseVideo}><Ionicons name="film-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>اختيار فيديو</Text></Pressable>
              <Pressable style={styles.mediaActionButton} onPress={recordVideo}><Ionicons name="videocam-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير فيديو</Text></Pressable>
            </View>
          )}
        </View>
      </View>

      <CategoryDropdown categories={categories} value={categoryId} onChange={setCategoryId} />
      <ItemConditionDropdown value={itemCondition} onChange={setItemCondition} />

      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="عنوان الإعلان" textAlign="right" />
      <TextInput style={[styles.input, styles.textarea]} value={description} onChangeText={setDescription} placeholder="اكتب وصف السلعة وحالتها بالتفصيل..." multiline textAlignVertical="top" textAlign="right" />
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
  const [itemCondition, setItemCondition] = useState<ItemCondition>(listing.item_condition || 'used_good');
  const [city, setCity] = useState(listing.city || '');
  const [showPhone, setShowPhone] = useState(listing.show_phone !== false);
  const [status, setStatus] = useState<'published' | 'sold' | 'archived'>(listing.status === 'sold' || listing.status === 'archived' ? listing.status : 'published');
  const [existingImages, setExistingImages] = useState<ListingImage[]>(listing.images || []);
  const [newImages, setNewImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [existingVideoPath, setExistingVideoPath] = useState<string | null>(listing.video_path || null);
  const [newVideo, setNewVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
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


  const takePhoto = async () => {
    if (existingImages.length + newImages.length >= 8) return Alert.alert('الصور', 'الحد الأعلى 8 صور.');
    try { const asset = await capturePhotoAsset(); if (asset) setNewImages((current) => [...current, asset]); }
    catch (e) { Alert.alert('الكاميرا', e instanceof Error ? e.message : 'تعذر فتح الكاميرا.'); }
  };

  const chooseVideo = async () => {
    try { const asset = await pickVideoAsset('library'); if (asset) setNewVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر اختيار الفيديو.'); }
  };

  const recordVideo = async () => {
    try { const asset = await pickVideoAsset('camera'); if (asset) setNewVideo(asset); }
    catch (e) { Alert.alert('الفيديو', e instanceof Error ? e.message : 'تعذر تصوير الفيديو.'); }
  };

  const deleteExistingVideo = () => {
    Alert.alert('حذف الفيديو', 'هل تريد حذف الفيديو الحالي من الإعلان؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => {
        try { await request(`/listings/${listing.id}/video`, { method: 'DELETE' }, token); setExistingVideoPath(null); }
        catch (e) { Alert.alert('تعذر حذف الفيديو', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.'); }
      } },
    ]);
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
          item_condition: itemCondition,
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
      if (newVideo) await uploadListingVideo(listing.id, newVideo, token);
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
        <View style={styles.mediaActionRow}>
          <Pressable style={styles.mediaActionButton} onPress={chooseImages}><Ionicons name="images-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>إضافة صور</Text></Pressable>
          <Pressable style={styles.mediaActionButton} onPress={takePhoto}><Ionicons name="camera-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير مباشر</Text></Pressable>
        </View>
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
        <View style={styles.videoSection}>
          <View style={styles.formCardTitleRow}><Text style={styles.formCardTitle}>فيديو الإعلان</Text><Text style={styles.optionalLabel}>اختياري • فيديو واحد</Text></View>
          {newVideo ? (
            <View style={styles.videoSelectedCard}><Pressable style={styles.videoRemove} onPress={() => setNewVideo(null)}><Ionicons name="close" size={18} color="#fff" /></Pressable><View style={styles.videoInfo}><Text numberOfLines={1} style={styles.videoTitle}>{newVideo.fileName || 'فيديو جديد'}</Text><Text style={styles.videoMeta}>سيستبدل الفيديو الحالي عند الحفظ</Text></View><Ionicons name="videocam" size={28} color={PURPLE} /></View>
          ) : existingVideoPath ? (
            <View style={styles.videoSelectedCard}><Pressable style={[styles.videoRemove, { backgroundColor: '#DC2626' }]} onPress={deleteExistingVideo}><Ionicons name="trash-outline" size={17} color="#fff" /></Pressable><View style={styles.videoInfo}><Text style={styles.videoTitle}>فيديو حالي محفوظ</Text><Text style={styles.videoMeta}>يمكن حذفه أو استبداله</Text></View><Ionicons name="videocam" size={28} color={PURPLE} /></View>
          ) : (
            <View style={styles.mediaActionRow}><Pressable style={styles.mediaActionButton} onPress={chooseVideo}><Ionicons name="film-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>اختيار فيديو</Text></Pressable><Pressable style={styles.mediaActionButton} onPress={recordVideo}><Ionicons name="videocam-outline" size={21} color={PURPLE} /><Text style={styles.mediaActionText}>تصوير فيديو</Text></Pressable></View>
          )}
        </View>
      </View>

      <CategoryDropdown categories={categories} value={categoryId} onChange={setCategoryId} />
      <ItemConditionDropdown value={itemCondition} onChange={setItemCondition} />

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

function conversationOtherName(conversation: Conversation, userId: number) {
  return conversation.buyer_id === userId ? conversation.seller?.name || 'المعلن' : conversation.buyer?.name || 'المستخدم';
}

function MessagesPanel({ token, userId, onOpen }: { token: string; userId: number; onOpen: (conversation: Conversation) => void }) {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setRows(await request<Conversation[]>('/conversations', {}, token)); }
    catch (e) { Alert.alert('الرسائل', e instanceof Error ? e.message : 'تعذر تحميل المحادثات.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  if (loading) return <View style={styles.chatCenter}><ActivityIndicator color={PURPLE} /><Text style={styles.stateText}>جاري تحميل المحادثات...</Text></View>;
  if (!rows.length) return <EmptyScreen icon="chatbubble-ellipses-outline" title="لا توجد محادثات" text="افتح أي إعلان واضغط «مراسلة المعلن» لبدء المحادثة." />;

  return (
    <ScrollView contentContainerStyle={styles.chatListPage}>
      {rows.map((row) => {
        const uri = imageUrl(row.listing?.images?.[0]);
        const unread = Number(row.unread_count || 0);
        return (
          <Pressable key={row.id} style={styles.conversationCard} onPress={() => onOpen(row)}>
            {uri ? <Image source={{ uri }} style={styles.conversationImage} resizeMode={row.listing?.images?.[0]?.processed_url ? 'contain' : 'cover'} /> : <View style={styles.conversationImagePlaceholder}><Ionicons name="image-outline" size={24} color="#A59CAB" /></View>}
            <View style={styles.conversationInfo}>
              <View style={styles.conversationTitleRow}>
                {unread > 0 ? <View style={styles.unreadPill}><Text style={styles.unreadPillText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
                <Text numberOfLines={1} style={styles.conversationName}>{conversationOtherName(row, userId)}</Text>
              </View>
              <Text numberOfLines={1} style={styles.conversationListing}>{row.listing?.title || 'إعلان'}</Text>
              <Text numberOfLines={1} style={[styles.conversationLast, unread > 0 && styles.conversationLastUnread]}>{row.last_message?.body || 'ابدأ المحادثة'}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function ChatPanel({ token, userId, conversation, onBack, onUnreadChanged }: { token: string; userId: number; conversation: Conversation; onBack: () => void; onUnreadChanged: () => void }) {
  const [rows, setRows] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<Conversation>(conversation);

  const load = useCallback(async () => {
    try {
      const data = await request<{ conversation: Conversation; messages: ChatMessage[] }>(`/conversations/${conversation.id}/messages`, {}, token);
      setRows(Array.isArray(data.messages) ? data.messages : []);
      if (data.conversation) setMeta(data.conversation);
      onUnreadChanged();
    } catch (e) {
      Alert.alert('المحادثة', e instanceof Error ? e.message : 'تعذر تحميل الرسائل.');
    } finally { setLoading(false); }
  }, [conversation.id, token, onUnreadChanged]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const message = await request<ChatMessage>(`/conversations/${conversation.id}/messages`, { method: 'POST', body: JSON.stringify({ body }) }, token);
      setRows((current) => [...current, message]);
      setDraft('');
    } catch (e) { Alert.alert('تعذر الإرسال', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.'); }
    finally { setSending(false); }
  };

  return (
    <View style={styles.chatPage}>
      <View style={styles.chatHeader}>
        <Pressable style={styles.chatBack} onPress={onBack}><Ionicons name="arrow-forward" size={23} color={PURPLE} /></Pressable>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{conversationOtherName(meta, userId)}</Text>
          <Text numberOfLines={1} style={styles.chatHeaderListing}>{meta.listing?.title || 'الإعلان'}</Text>
        </View>
        <View style={styles.chatAvatar}><Ionicons name="person" size={21} color={PURPLE} /></View>
      </View>
      {loading ? <View style={styles.chatCenter}><ActivityIndicator color={PURPLE} /></View> : (
        <ScrollView contentContainerStyle={styles.messagesScroll} keyboardShouldPersistTaps="handled">
          {rows.length ? rows.map((message) => {
            const mine = message.sender_id === userId;
            return (
              <View key={message.id} style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
                <View style={[styles.messageBubble, mine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
                  <Text style={[styles.messageText, mine && styles.messageTextMine]}>{message.body}</Text>
                  <Text style={[styles.messageTime, mine && styles.messageTimeMine]}>{relativeTime(message.created_at)}</Text>
                  {!mine ? <ReportMessageButton token={token} messageId={message.id} /> : null}
                </View>
              </View>
            );
          }) : <Text style={styles.chatStartHint}>ابدأ المحادثة حول هذه السلعة.</Text>}
        </ScrollView>
      )}
      <ChatSafetyActions token={token} userId={userId} conversation={meta} onBlocked={onBack} />
      <View style={styles.messageComposer}>
        <Pressable style={[styles.sendButton, (!draft.trim() || sending) && styles.disabled]} onPress={send} disabled={!draft.trim() || sending}>
          {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
        </Pressable>
        <TextInput value={draft} onChangeText={setDraft} placeholder="اكتب رسالة للمعلن..." multiline style={styles.messageInput} textAlign="right" />
      </View>
    </View>
  );
}

function NotificationsPanel({ token, userId, onOpen }: { token: string; userId: number; onOpen: (conversation: Conversation) => void }) {
  const [rows, setRows] = useState<MessageNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { setRows(await request<MessageNotification[]>('/message-notifications', {}, token)); }
    catch (e) { Alert.alert('الإشعارات', e instanceof Error ? e.message : 'تعذر تحميل الإشعارات.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); const timer = setInterval(() => void load(), 5000); return () => clearInterval(timer); }, [load]);

  if (loading) return <View style={styles.chatCenter}><ActivityIndicator color={PURPLE} /><Text style={styles.stateText}>جاري تحميل الإشعارات...</Text></View>;
  if (!rows.length) return <EmptyScreen icon="notifications-outline" title="لا توجد إشعارات" text="عند وصول رسالة جديدة على أحد إعلاناتك ستظهر هنا." />;

  return (
    <ScrollView contentContainerStyle={styles.chatListPage}>
      {rows.map((item) => {
        const conversation = item.conversation;
        if (!conversation) return null;
        const unread = !item.read_at;
        return (
          <Pressable key={item.id} style={[styles.notificationCard, unread && styles.notificationCardUnread]} onPress={() => onOpen(conversation)}>
            <View style={[styles.notificationIcon, unread && styles.notificationIconUnread]}><Ionicons name="chatbubble-ellipses" size={21} color={unread ? '#fff' : PURPLE} /></View>
            <View style={styles.notificationInfo}>
              <Text style={styles.notificationTitle}>{conversationOtherName(conversation, userId)} أرسل لك رسالة</Text>
              <Text numberOfLines={1} style={styles.notificationListing}>{conversation.listing?.title || 'الإعلان'}</Text>
              <Text numberOfLines={2} style={styles.notificationBody}>{item.body}</Text>
              <Text style={styles.notificationTime}>{relativeTime(item.created_at)}</Text>
            </View>
          </Pressable>
        );
      })}
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
  const [authRestoring, setAuthRestoring] = useState(true);
  const [mine, setMine] = useState<Listing[]>([]);
  const [mineLoading, setMineLoading] = useState(false);
  const [detail, setDetail] = useState<Listing | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editListing, setEditListing] = useState<Listing | null>(null);
  const [editReturnDetailId, setEditReturnDetailId] = useState<number | null>(null);
  const [manageBusyId, setManageBusyId] = useState<number | null>(null);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const unreadBaseline = useRef<number | null>(null);

  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionDraft, setRegionDraft] = useState<string[]>([]);
  const [regionSearch, setRegionSearch] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
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
        request<Paginated<Listing>>(listingsPath, {}, token || undefined),
      ]);
      const nextListings = Array.isArray(result?.data) ? result.data : [];
      setCategories(Array.isArray(cats) ? cats : []);
      setListings(nextListings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [listingsPath, token]);

  useEffect(() => { loadHome(); }, [loadHome, refreshKey]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('used_auth_token');
        if (!storedToken) return;
        const me = await request<User>('/me', {}, storedToken);
        if (!active) return;
        setToken(storedToken);
        setUser(me);
      } catch {
        await SecureStore.deleteItemAsync('used_auth_token').catch(() => undefined);
      } finally {
        if (active) setAuthRestoring(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const loadUnreadMessages = useCallback(async () => {
    if (!token) { setUnreadMessages(0); return; }
    try {
      const data = await request<{ count: number }>('/messages/unread-count', {}, token);
      const next = Number(data?.count || 0);
      if (unreadBaseline.current !== null && next > unreadBaseline.current && screen !== 'messages') {
        Alert.alert('رسالة جديدة', 'وصلتك رسالة جديدة في مستعمل مجاني.');
      }
      unreadBaseline.current = next;
      setUnreadMessages(next);
    } catch {}
  }, [token, screen]);

  useEffect(() => {
    if (!token) { unreadBaseline.current = null; setUnreadMessages(0); return; }
    void loadUnreadMessages();
    const timer = setInterval(() => void loadUnreadMessages(), 5000);
    return () => clearInterval(timer);
  }, [token, loadUnreadMessages]);

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
    if (nearMode && nearCoords) rows.sort((a, b) => distanceKm(nearCoords, a) - distanceKm(nearCoords, b));
    return rows;
  }, [listings, selectedRegions, nearMode, nearCoords]);

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

  const refreshOwnListing = (item: Listing) => {
    Alert.alert('تحديث الإعلان', 'سيتم رفع الإعلان إلى أعلى أحدث الإعلانات. هل تريد المتابعة؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تحديث', onPress: async () => {
        setManageBusyId(item.id);
        try {
          await request(`/listings/${item.id}/refresh`, { method: 'POST' }, token);
          const refreshedAt = new Date().toISOString();
          setDetail((current) => current?.id === item.id ? { ...current, status: 'published', published_at: refreshedAt } : current);
          setMine((current) => current.map((row) => row.id === item.id ? { ...row, status: 'published', published_at: refreshedAt } : row));
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
          setDetail((current) => current?.id === item.id ? null : current);
          setEditListing((current) => current?.id === item.id ? null : current);
          setEditReturnDetailId(null);
          setScreen('home');
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

  const editOwnListing = (item: Listing, returnToDetail = false) => {
    setEditReturnDetailId(returnToDetail ? item.id : null);
    setEditListing(item);
    setDetail(null);
    setScreen('add');
  };

  const startConversationForListing = async (item: Listing) => {
    if (!token) {
      Alert.alert('تسجيل الدخول', 'سجّل الدخول أولاً حتى تتمكن من مراسلة المعلن.', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الدخول', onPress: () => { setDetail(null); setScreen('account'); } },
      ]);
      return;
    }
    try {
      const conversation = await request<Conversation>(`/listings/${item.id}/conversation`, { method: 'POST' }, token);
      setActiveConversation(conversation);
      setDetail(null);
      setScreen('messages');
      void loadUnreadMessages();
    } catch (e) { Alert.alert('المحادثة', e instanceof Error ? e.message : 'تعذر بدء المحادثة.'); }
  };

  const loggedIn = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    SecureStore.setItemAsync('used_auth_token', nextToken).catch(() => undefined);
    if (nextUser.role === 'admin') setScreen('admin');
  };

  const logout = () => {
    SecureStore.deleteItemAsync('used_auth_token').catch(() => undefined);
    setToken('');
    setUser(null);
    setMine([]);
    setDetail(null);
    setEditListing(null);
    setEditReturnDetailId(null);
    setActiveConversation(null);
    setUnreadMessages(0);
    unreadBaseline.current = null;
    setScreen('home');
  };

  const deleteAccount = () => {
    Alert.alert('حذف الحساب نهائيًا', 'سيتم حذف حسابك وإعلاناتك وصورك وفيديوهاتك ورسائلك المرتبطة بالحساب. لا يمكن التراجع عن هذه العملية. هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف الحساب', style: 'destructive', onPress: async () => {
        try {
          await request('/account', { method: 'DELETE' }, token);
          logout();
          Alert.alert('تم حذف الحساب', 'تم حذف حسابك والبيانات المرتبطة به بنجاح.');
        } catch (e) {
          Alert.alert('تعذر حذف الحساب', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
        }
      } },
    ]);
  };
  const published = () => { setEditListing(null); setRefreshKey((x) => x + 1); setScreen('home'); setTimeout(() => setRefreshKey((x) => x + 1), 4000); setTimeout(() => setRefreshKey((x) => x + 1), 10000); };
  const resetFilters = () => {
    setSelectedCategory(undefined);
    setSelectedRegions([]);
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
    const next = regionDraft.includes(name) ? regionDraft.filter((x) => x !== name) : [...regionDraft, name];
    setRegionDraft(next);
    setSelectedRegions(next);
  };

  const header = (
    <View style={styles.marketHeader}>
      <Text style={styles.marketTitle}>مستعمل مجاني</Text>
      <View style={styles.searchHeaderRow}>
        <IconButton name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} onPress={() => setViewMode((x) => x === 'list' ? 'grid' : 'list')} />
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
        <Pressable style={styles.filterChip} onPress={() => setScreen('map')}>
          <Ionicons name="map-outline" size={19} color={PURPLE} />
          <Text style={styles.filterChipText}>الخريطة</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, nearMode && styles.filterChipActive]} onPress={enableNearby} disabled={nearBusy}>
          {nearBusy ? <ActivityIndicator size="small" color={nearMode ? '#fff' : PURPLE} /> : <Ionicons name="locate-outline" size={19} color={nearMode ? '#fff' : PURPLE} />}
          <Text style={[styles.filterChipText, nearMode && styles.filterChipTextActive]}>القريب</Text>
        </Pressable>
      </ScrollView>

      {filterOpen ? (
        <View style={styles.inlinePanel}>
          <View style={styles.panelTopRow}><Pressable onPress={resetFilters}><Text style={styles.resetText}>إعادة الضبط</Text></Pressable><Text style={styles.panelTitle}>تصفية النتائج</Text></View>
          <View style={{ marginTop: 12, minHeight: 54, borderRadius: 14, backgroundColor: PURPLE_LIGHT, paddingHorizontal: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 9 }}>
            <Ionicons name="gift-outline" size={21} color={PURPLE} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ color: PURPLE_DARK, fontSize: 13, fontWeight: '900' }}>كل السلع مجانا</Text>
              <Text style={{ color: MUTED, fontSize: 10, marginTop: 2 }}>لا يوجد سعر أو فرز حسب السعر</Text>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );

  if (detailLoading) return <View style={styles.center}><ActivityIndicator size="large" color={PURPLE} /><Text style={styles.stateText}>جاري فتح الإعلان...</Text></View>;

  if (detail) {
    const photos = detail.images || [];
    const favorite = favorites.includes(detail.id);
    const isOwner = Boolean(token && user && detail.user?.id === user.id);
    const statusLabel = detail.status === 'sold' ? 'مباع' : detail.status === 'archived' ? 'مؤرشف' : detail.status === 'draft' ? 'مسودة' : 'منشور';
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
              {photos.map((photo) => <Image key={photo.id} source={{ uri: imageUrl(photo) }} style={styles.detailImage} resizeMode={photo.processed_url ? 'contain' : 'cover'} />)}
            </ScrollView>
          ) : <View style={styles.detailNoImage}><Ionicons name="images-outline" size={48} color="#B2A9BF" /><Text style={styles.noImage}>لا توجد صور</Text></View>}
          {photos.length > 1 ? <Text style={styles.photoCount}>{photos.length} صور • اسحب للتنقل</Text> : null}
          {detail.video_path ? (
            <Pressable style={styles.detailVideoButton} onPress={() => { const url = videoUrl(detail.video_path); if (url) Linking.openURL(url).catch(() => Alert.alert('الفيديو', 'تعذر تشغيل الفيديو.')); }}>
              <Ionicons name="play-circle" size={25} color="#fff" />
              <Text style={styles.detailVideoText}>تشغيل فيديو الإعلان</Text>
            </Pressable>
          ) : null}
          <View style={[styles.detailBody, { paddingVertical: 12 }]}>
            <View style={{ width: '100%', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <Text numberOfLines={2} style={[styles.detailTitle, { flex: 1 }]}>{detail.title}</Text>
              <Text style={[styles.detailPrice, { marginTop: 0, fontSize: 20 }]}>مجانا</Text>
            </View>
            <View style={{ width: '100%', marginTop: 9, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: PURPLE_LIGHT, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Ionicons name={ITEM_CONDITIONS.find((x) => x.key === detail.item_condition)?.icon || 'checkmark-circle-outline'} size={16} color={PURPLE} />
                <Text style={{ color: PURPLE_DARK, fontWeight: '900', fontSize: 12 }}>{itemConditionLabel(detail.item_condition)}</Text>
              </View>
              <View style={[styles.detailMetaLine, { marginTop: 0, flexShrink: 1 }]}>
                <Text numberOfLines={1} style={styles.detailMetaText}>{detail.city}</Text>
                <Ionicons name="location-outline" size={18} color={PURPLE} />
              </View>
            </View>
            <View style={[styles.detailSeparator, { marginVertical: 10 }]} />
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

            {!isOwner && detail.user ? (
              <Pressable style={styles.contactSellerButton} onPress={() => void startConversationForListing(detail)}>
                <Ionicons name="chatbubble-ellipses" size={22} color="#fff" />
                <Text style={styles.contactSellerText}>مراسلة المعلن</Text>
              </Pressable>
            ) : null}

            {!isOwner && detail.user && token ? <ListingSafetyActions token={token} listingId={detail.id} userId={detail.user.id} onBlocked={() => { setListings((current) => current.filter((x) => x.user?.id !== detail.user?.id)); setDetail(null); setRefreshKey((x) => x + 1); }} /> : null}

            {isOwner ? (
              <View style={styles.ownerManageSection}>
                <View style={styles.ownerManageHeading}>
                  <View style={styles.ownerStatusBadge}><Text style={styles.ownerStatusText}>الحالة: {statusLabel}</Text></View>
                  <View style={styles.ownerManageTitleWrap}>
                    <Text style={styles.ownerManageTitle}>إدارة إعلانك</Text>
                    <Text style={styles.ownerManageHint}>هذه الخيارات تظهر لك فقط بصفتك صاحب الإعلان</Text>
                  </View>
                </View>

                <View style={styles.ownerManageGrid}>
                  <Pressable style={[styles.ownerManageButton, styles.ownerEditButton]} onPress={() => editOwnListing(detail, true)} disabled={manageBusyId === detail.id}>
                    <Ionicons name="create-outline" size={21} color={PURPLE} />
                    <Text style={styles.ownerEditButtonText}>تعديل الإعلان</Text>
                  </Pressable>
                  <Pressable style={[styles.ownerManageButton, styles.ownerRefreshButton]} onPress={() => refreshOwnListing(detail)} disabled={manageBusyId === detail.id}>
                    {manageBusyId === detail.id ? <ActivityIndicator size="small" color="#16834A" /> : <Ionicons name="refresh-outline" size={21} color="#16834A" />}
                    <Text style={styles.ownerRefreshButtonText}>تحديث الإعلان</Text>
                  </Pressable>
                  <Pressable style={[styles.ownerManageButton, styles.ownerStatusButton]} onPress={() => editOwnListing(detail, true)} disabled={manageBusyId === detail.id}>
                    <Ionicons name="swap-horizontal-outline" size={21} color="#B45309" />
                    <Text style={styles.ownerStatusButtonText}>تغيير الحالة</Text>
                  </Pressable>
                  <Pressable style={[styles.ownerManageButton, styles.ownerDeleteButton]} onPress={() => deleteOwnListing(detail)} disabled={manageBusyId === detail.id}>
                    <Ionicons name="trash-outline" size={21} color="#DC2626" />
                    <Text style={styles.ownerDeleteButtonText}>حذف الإعلان</Text>
                  </Pressable>
                </View>
              </View>
            ) : authRestoring ? (
              <View style={styles.ownerRestoreRow}><ActivityIndicator size="small" color={PURPLE} /><Text style={styles.ownerRestoreText}>جاري التحقق من حسابك...</Text></View>
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
  if (screen === 'map') content = <ListingsMap listings={visibleListings} onBack={() => setScreen('home')} onOpenListing={(id) => { setScreen('home'); void openDetail(id); }} />;
  if (screen === 'favorites') content = (
    <ScrollView contentContainerStyle={styles.standardPage}>
      <Text style={styles.sectionTitle}>المفضلة</Text>
      <Text style={styles.help}>الإعلانات التي حفظتها أثناء التصفح.</Text>
      {favoriteListings.length ? favoriteListings.map((item) => <ListingCard key={item.id} item={item} favorite onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />) : <EmptyScreen icon="heart-outline" title="لا توجد مفضلة" text="اضغط على القلب في أي إعلان لحفظه هنا." />}
    </ScrollView>
  );
  if (screen === 'add') content = token ? (editListing ? <EditListing listing={editListing} categories={categories} token={token} onSaved={() => { const returnId = editReturnDetailId; setEditListing(null); setEditReturnDetailId(null); setRefreshKey((x) => x + 1); if (returnId) { setScreen('home'); void openDetail(returnId); } else { setScreen('mine'); } }} onCancel={() => { const returnId = editReturnDetailId; setEditListing(null); setEditReturnDetailId(null); if (returnId) { setScreen('home'); void openDetail(returnId); } else { setScreen('mine'); } }} /> : <CreateListing categories={categories} token={token} onPublished={published} />) : <LoginPanel onLogin={loggedIn} />;
  if (screen === 'notifications') content = token && user ? <NotificationsPanel token={token} userId={user.id} onOpen={(conversation) => { setActiveConversation(conversation); setScreen('messages'); }} /> : <LoginPanel onLogin={loggedIn} />;
  if (screen === 'messages') content = token && user ? (activeConversation ? <ChatPanel token={token} userId={user.id} conversation={activeConversation} onBack={() => { setActiveConversation(null); void loadUnreadMessages(); }} onUnreadChanged={() => void loadUnreadMessages()} /> : <MessagesPanel token={token} userId={user.id} onOpen={(conversation) => setActiveConversation(conversation)} />) : <LoginPanel onLogin={loggedIn} />;
  if (screen === 'mine') content = token ? (
    <ScrollView contentContainerStyle={styles.standardPage}>
      <Text style={styles.sectionTitle}>إعلاناتي</Text>
      {mineLoading ? <ActivityIndicator color={PURPLE} /> : mine.length ? mine.map((item) => (
        <ListingCard key={item.id} item={item} favorite={favorites.includes(item.id)} onFavorite={() => toggleFavorite(item.id)} onPress={() => openDetail(item.id)} />
      )) : <EmptyScreen icon="albums-outline" title="لا توجد إعلانات" text="أضف أول إعلان لك من زر الإضافة." />}
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
      <Pressable style={styles.menuAction} onPress={() => setScreen('blocked')}><Ionicons name="ban-outline" size={22} color={PURPLE} /><Text style={styles.menuActionText}>المستخدمون المحظورون</Text><Ionicons name="chevron-back" size={20} color="#A1A1AA" /></Pressable>
      <Pressable style={styles.menuAction} onPress={() => setScreen('privacy')}><Ionicons name="shield-checkmark-outline" size={22} color={PURPLE} /><Text style={styles.menuActionText}>سياسة الخصوصية</Text><Ionicons name="chevron-back" size={20} color="#A1A1AA" /></Pressable>
      <Pressable style={styles.menuAction} onPress={() => setScreen('terms')}><Ionicons name="document-text-outline" size={22} color={PURPLE} /><Text style={styles.menuActionText}>الشروط والأحكام</Text><Ionicons name="chevron-back" size={20} color="#A1A1AA" /></Pressable>
      <Pressable style={styles.dangerButton} onPress={deleteAccount}><Ionicons name="trash-outline" size={20} color="#DC2626" /><Text style={styles.dangerText}>حذف الحساب نهائيًا</Text></Pressable>
      <Pressable style={[styles.dangerButton, { borderColor:'#D8D2DF', backgroundColor:'#fff' }]} onPress={logout}><Ionicons name="log-out-outline" size={20} color={MUTED} /><Text style={[styles.dangerText, { color:MUTED }]}>تسجيل الخروج</Text></Pressable>
    </ScrollView>
  ) : <LoginPanel onLogin={loggedIn} />;
  if (screen === 'blocked') content = token ? <BlockedUsersPanel token={token} /> : <LoginPanel onLogin={loggedIn} />;
  if (screen === 'privacy') content = <LegalScreen type="privacy" />;
  if (screen === 'terms') content = <LegalScreen type="terms" />;
  if (screen === 'admin') content = token && user?.role === 'admin' ? <AdminPanel token={token} /> : <LoginPanel onLogin={loggedIn} />;

  const isHome = screen === 'home' || screen === 'map';
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={PURPLE_DARK} />
      {!isHome ? (
        <View style={styles.simpleTopBar}>
          <IconButton name="menu-outline" onPress={() => setMenuOpen(true)} />
          <Text style={styles.simpleTopTitle}>{screen === 'favorites' ? 'المفضلة' : screen === 'add' ? (editListing ? 'تعديل الإعلان' : 'أضف إعلان') : screen === 'notifications' ? 'الإشعارات' : screen === 'messages' ? 'الرسائل' : screen === 'mine' ? 'إعلاناتي' : screen === 'blocked' ? 'المستخدمون المحظورون' : screen === 'privacy' ? 'سياسة الخصوصية' : screen === 'terms' ? 'الشروط والأحكام' : screen === 'admin' ? 'لوحة الإدارة' : 'حسابي'}</Text>
          <Pressable style={styles.simpleHomeButton} onPress={() => setScreen('home')}><Ionicons name="home-outline" size={24} color="#fff" /></Pressable>
        </View>
      ) : null}
      <View style={styles.content}>{content}</View>

      <View style={styles.bottomBar}>
        <Pressable style={styles.bottomItem} onPress={() => setScreen('messages')}><View style={styles.bottomIconWrap}><Ionicons name={screen === 'messages' ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline'} size={24} color={screen === 'messages' ? PURPLE : '#7C7783'} />{unreadMessages > 0 ? <View style={styles.bottomBadge}><Text style={styles.bottomBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View> : null}</View><Text style={[styles.bottomLabel, screen === 'messages' && styles.bottomLabelActive]}>الرسائل</Text></Pressable>
        <Pressable style={styles.bottomItem} onPress={() => setScreen('notifications')}><View style={styles.bottomIconWrap}><Ionicons name={screen === 'notifications' ? 'notifications' : 'notifications-outline'} size={24} color={screen === 'notifications' ? PURPLE : '#7C7783'} />{unreadMessages > 0 ? <View style={styles.bottomBadge}><Text style={styles.bottomBadgeText}>{unreadMessages > 99 ? '99+' : unreadMessages}</Text></View> : null}</View><Text style={[styles.bottomLabel, screen === 'notifications' && styles.bottomLabelActive]}>الإشعارات</Text></Pressable>
        <Pressable style={styles.fabWrap} onPress={() => { setEditListing(null); setScreen('add'); }}>
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
              <Pressable onPress={() => { setRegionDraft([]); setSelectedRegions([]); }} hitSlop={8}>
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
              <Pressable style={styles.regionRow} onPress={() => { setRegionDraft([]); setSelectedRegions([]); }}>
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

            <Pressable style={styles.regionApplyButton} onPress={() => setRegionOpen(false)}>
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
              ['blocked', 'ban-outline', 'المستخدمون المحظورون'],
              ['privacy', 'shield-checkmark-outline', 'سياسة الخصوصية'],
              ['terms', 'document-text-outline', 'الشروط والأحكام'],
            ] as [Screen, any, string][]).map(([key, icon, label]) => (
              <Pressable key={key} style={styles.sideMenuItem} onPress={() => { setScreen(key); setMenuOpen(false); }}><Ionicons name={icon} size={22} color={PURPLE} /><Text style={styles.sideMenuText}>{label}</Text><Ionicons name="chevron-back" size={18} color="#A1A1AA" /></Pressable>
            ))}
            {user?.role === 'admin' ? (
              <Pressable style={[styles.sideMenuItem, { backgroundColor: PURPLE_LIGHT, borderRadius: 12 }]} onPress={() => { setScreen('admin'); setMenuOpen(false); }}><Ionicons name="shield-checkmark-outline" size={22} color={PURPLE} /><Text style={[styles.sideMenuText, { color: PURPLE, fontWeight: '900' }]}>لوحة الإدارة</Text><Ionicons name="chevron-back" size={18} color={PURPLE} /></Pressable>
            ) : null}
            <View style={styles.sideDivider} />
            <Pressable style={styles.sideMenuItem} onPress={() => { resetFilters(); setMenuOpen(false); setScreen('home'); }}><Ionicons name="refresh-outline" size={22} color={PURPLE} /><Text style={styles.sideMenuText}>مسح البحث والفلاتر</Text><View style={{ width: 18 }} /></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mediaActionRow: { flexDirection: 'row-reverse', gap: 9, marginTop: 9 },
  mediaActionButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: '#D8C9F1', backgroundColor: '#FAF7FF', flexDirection: 'row-reverse', gap: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  mediaActionText: { color: PURPLE, fontWeight: '900', fontSize: 12 },
  videoSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#EEE7F5', paddingTop: 14 },
  optionalLabel: { color: MUTED, fontSize: 10, fontWeight: '700' },
  videoSelectedCard: { minHeight: 70, borderRadius: 14, backgroundColor: PURPLE_LIGHT, borderWidth: 1, borderColor: '#D8C9F1', marginTop: 9, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  videoInfo: { flex: 1, alignItems: 'flex-end' },
  videoTitle: { color: TEXT, fontSize: 13, fontWeight: '900', textAlign: 'right' },
  videoMeta: { color: MUTED, fontSize: 10, marginTop: 3, textAlign: 'right' },
  videoRemove: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#514B57', alignItems: 'center', justifyContent: 'center' },
  videoBadge: { position: 'absolute', left: 9, bottom: 9, borderRadius: 12, backgroundColor: 'rgba(100,38,200,0.92)', paddingHorizontal: 7, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  detailVideoButton: { marginHorizontal: 18, marginTop: 12, minHeight: 52, borderRadius: 15, backgroundColor: PURPLE, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  detailVideoText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ownerManageSection: { marginTop: 18, borderTopWidth: 1, borderTopColor: '#EEE7F5', paddingTop: 16 },
  ownerManageHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 13 },
  ownerManageTitleWrap: { flex: 1, alignItems: 'flex-end' },
  ownerManageTitle: { color: TEXT, fontSize: 17, fontWeight: '900', textAlign: 'right' },
  ownerManageHint: { color: MUTED, fontSize: 10, marginTop: 3, textAlign: 'right' },
  ownerStatusBadge: { borderRadius: 14, backgroundColor: PURPLE_LIGHT, paddingHorizontal: 10, paddingVertical: 6 },
  ownerStatusText: { color: PURPLE, fontSize: 11, fontWeight: '900' },
  ownerManageGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 9 },
  ownerManageButton: { width: '48.5%', minHeight: 48, borderRadius: 13, borderWidth: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  ownerEditButton: { backgroundColor: '#F7F1FF', borderColor: '#CFB8F5' },
  ownerEditButtonText: { color: PURPLE, fontSize: 12, fontWeight: '900' },
  ownerRefreshButton: { backgroundColor: '#F0FDF4', borderColor: '#BBE7C9' },
  ownerRefreshButtonText: { color: '#16834A', fontSize: 12, fontWeight: '900' },
  ownerStatusButton: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' },
  ownerStatusButtonText: { color: '#B45309', fontSize: 12, fontWeight: '900' },
  ownerDeleteButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  ownerDeleteButtonText: { color: '#DC2626', fontSize: 12, fontWeight: '900' },
  ownerRestoreRow: { marginTop: 14, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 7, paddingVertical: 10 },
  ownerRestoreText: { color: MUTED, fontSize: 11 },

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
  cardImageWrap: { width: '42%', height: 158, backgroundColor: '#FAFAFA', position: 'relative', overflow: 'hidden' },
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
  categoryDropdownOptionTextActive: { color: PURPLE_DARK, fontWeight: '900' },
  locationButton: { minHeight: 50, borderRadius: 14, backgroundColor: PURPLE_LIGHT, borderWidth: 1, borderColor: '#D9C5F5', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 11 },
  locationButtonDone: { backgroundColor: '#ECFDF3', borderColor: '#B7E7C8' },
  locationButtonText: { color: PURPLE, fontWeight: '900', fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 13, marginBottom: 10 },
  switchText: { color: TEXT, fontWeight: '800', fontSize: 13 },

  manageListingWrap: { marginBottom: 4 },
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
  gallery: { width: '100%', backgroundColor: '#FAFAFA' },
  detailImage: { width: 390, height: 310, backgroundColor: '#FAFAFA' },
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

  contactSellerButton: { width: '100%', minHeight: 52, marginTop: 14, borderRadius: 14, backgroundColor: PURPLE, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  contactSellerText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  chatListPage: { padding: 12, paddingBottom: 24, backgroundColor: SURFACE, flexGrow: 1 },
  chatCenter: { flex: 1, minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: SURFACE },
  conversationCard: { minHeight: 92, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', padding: 10, marginBottom: 9, flexDirection: 'row-reverse', alignItems: 'center', gap: 11 },
  conversationImage: { width: 68, height: 68, borderRadius: 12, backgroundColor: '#FAFAFA' },
  conversationImagePlaceholder: { width: 68, height: 68, borderRadius: 12, backgroundColor: '#F1EDF5', alignItems: 'center', justifyContent: 'center' },
  conversationInfo: { flex: 1, alignItems: 'flex-end' },
  conversationTitleRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  conversationName: { color: TEXT, fontSize: 15, fontWeight: '900', textAlign: 'right', flex: 1 },
  conversationListing: { color: PURPLE, fontSize: 11, fontWeight: '800', marginTop: 3, textAlign: 'right' },
  conversationLast: { color: MUTED, fontSize: 12, marginTop: 6, textAlign: 'right' },
  conversationLastUnread: { color: TEXT, fontWeight: '900' },
  unreadPill: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: '#DC2626', paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  unreadPillText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  chatPage: { flex: 1, backgroundColor: '#F7F5FA' },
  chatHeader: { minHeight: 72, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: BORDER, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  chatBack: { width: 38, height: 38, borderRadius: 19, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  chatHeaderInfo: { flex: 1, alignItems: 'flex-end' },
  chatHeaderName: { color: TEXT, fontWeight: '900', fontSize: 15 },
  chatHeaderListing: { color: MUTED, fontSize: 11, marginTop: 2, maxWidth: 230 },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  messagesScroll: { padding: 12, paddingBottom: 20, flexGrow: 1 },
  bubbleRow: { width: '100%', marginBottom: 8 },
  bubbleRowMine: { alignItems: 'flex-start' },
  bubbleRowOther: { alignItems: 'flex-end' },
  messageBubble: { maxWidth: '82%', borderRadius: 17, paddingHorizontal: 13, paddingVertical: 9 },
  messageBubbleMine: { backgroundColor: PURPLE, borderBottomLeftRadius: 5 },
  messageBubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderBottomRightRadius: 5 },
  messageText: { color: TEXT, fontSize: 14, lineHeight: 21, textAlign: 'right' },
  messageTextMine: { color: '#fff' },
  messageTime: { color: '#9B94A2', fontSize: 9, marginTop: 4, textAlign: 'left' },
  messageTimeMine: { color: '#E7DBFF' },
  chatStartHint: { color: MUTED, textAlign: 'center', marginTop: 35, fontSize: 13 },
  messageComposer: { minHeight: 68, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDER, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageInput: { flex: 1, minHeight: 48, maxHeight: 110, borderRadius: 18, backgroundColor: '#F4F1F6', paddingHorizontal: 14, paddingVertical: 11, color: TEXT, fontSize: 14 },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  notificationCard: { minHeight: 108, borderRadius: 16, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', padding: 12, marginBottom: 9, flexDirection: 'row-reverse', gap: 10, alignItems: 'flex-start' },
  notificationCardUnread: { borderColor: '#CDB5F0', backgroundColor: '#FBF8FF' },
  notificationIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center' },
  notificationIconUnread: { backgroundColor: PURPLE },
  notificationInfo: { flex: 1, alignItems: 'flex-end' },
  notificationTitle: { color: TEXT, fontSize: 14, fontWeight: '900', textAlign: 'right' },
  notificationListing: { color: PURPLE, fontSize: 11, fontWeight: '800', marginTop: 2, textAlign: 'right' },
  notificationBody: { color: '#4E4853', fontSize: 12, lineHeight: 18, marginTop: 5, textAlign: 'right' },
  notificationTime: { color: MUTED, fontSize: 9, marginTop: 5 },
  bottomIconWrap: { position: 'relative', minWidth: 30, alignItems: 'center' },
  bottomBadge: { position: 'absolute', top: -8, right: -12, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: '#DC2626', paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  bottomBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },

  bottomBar: { minHeight: 72, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8E3ED', flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 7, paddingHorizontal: 4, shadowColor: '#20142D', shadowOpacity: 0.08, shadowRadius: 10, elevation: 8 },
  bottomItem: { flex: 1, minHeight: 57, alignItems: 'center', justifyContent: 'center', gap: 2 },
  bottomLabel: { color: '#7C7783', fontSize: 10, fontWeight: '700' },
  bottomLabelActive: { color: PURPLE, fontWeight: '900' },
  fabWrap: { flex: 1.18, minHeight: 72, alignItems: 'center', justifyContent: 'flex-end' },
  fab: { width: 78, height: 78, borderRadius: 39, backgroundColor: PURPLE, marginTop: -24, marginBottom: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#2C0E59', shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
  fabActive: { backgroundColor: PURPLE_DARK },
  fabLabel: { color: '#fff', fontSize: 9, fontWeight: '900', marginTop: -4 },

  regionOverlay: { ...StyleSheet.absoluteFill, zIndex: 70, elevation: 30 },
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
