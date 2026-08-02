import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { api, getErrorMessage, uploadListingImage } from '@/lib/api';
import type { Category, Listing } from '@/types';
import { colors } from '@/theme';

export default function CreateListingScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [city, setCity] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>();
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<Category[]>('/categories').then(setCategories); }, []);

  const chooseImages = async () => {
    const remainingSlots = 8 - images.length;
    if (remainingSlots <= 0) return Alert.alert('الصور', 'يمكن إضافة 8 صور كحد أقصى.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: .8,
    });
    if (result.canceled) return;

    setImages(current => {
      const seen = new Set<string>();
      return [...current, ...result.assets].filter(image => {
        const key = image.assetId ?? image.uri;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 8);
    });
  };
  const locate = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('الموقع', 'يرجى السماح بالوصول إلى الموقع.');

    try {
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords(current.coords);

      const [address] = await Location.reverseGeocodeAsync({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      const detectedCity = address?.city || address?.district || address?.subregion || address?.region;
      if (detectedCity) setCity(currentCity => currentCity.trim() || detectedCity);
    } catch {
      Alert.alert('الموقع', 'تعذر تحديد الموقع حاليًا. حاول مرة أخرى أو أدخل المدينة يدويًا.');
    }
  };
  const submit = async () => {
    const missingFields = [
      !categoryId && 'التصنيف',
      !title.trim() && 'عنوان الإعلان',
      !description.trim() && 'الوصف',
      !city.trim() && 'المدينة',
    ].filter(Boolean);
    if (missingFields.length) return Alert.alert('بيانات ناقصة', 'أكمل الحقول التالية: ' + missingFields.join('، '));
    setBusy(true);
    try {
      const listing = await api<Listing>('/listings', { method: 'POST', body: JSON.stringify({
        category_id: categoryId, title, description, price: price || null, city,
        latitude: coords?.latitude, longitude: coords?.longitude, show_phone: showPhone, status: 'published',
      }) });
      for (const image of images) {
        await uploadListingImage(listing.id, image.uri, image.mimeType);
      }
      Alert.alert('تم بنجاح', 'نُشر إعلانك.', [{ text: 'عرض الإعلان', onPress: () => router.replace(`/listing/${listing.id}`) }]);
    } catch (e) { Alert.alert('تعذر النشر', getErrorMessage(e)); } finally { setBusy(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>صور الإعلان ({images.length}/8)</Text>
      <View style={styles.images}>
        <Pressable style={styles.addImage} onPress={chooseImages}><Text style={styles.addImageText}>+ إضافة صور</Text></Pressable>
        {images.map((image, index) => <View key={image.assetId ?? image.uri} style={styles.thumbWrap}>
          <Image source={image.uri} style={styles.thumb} />
          <Pressable accessibilityLabel="حذف الصورة" style={styles.removeImage} onPress={() => setImages(current => current.filter((_, itemIndex) => itemIndex !== index))}>
            <Text style={styles.removeImageText}>×</Text>
          </Pressable>
        </View>)}
      </View>
      <Text style={styles.label}>التصنيف</Text>
      <ScrollView horizontal contentContainerStyle={styles.categories}>
        {categories.map(category => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.chip, categoryId === category.id && styles.chipActive]}><Text style={categoryId === category.id ? styles.chipActiveText : styles.chipText}>{category.name}</Text></Pressable>)}
      </ScrollView>
      <TextInput style={styles.input} placeholder="عنوان الإعلان" value={title} onChangeText={setTitle} textAlign="right" />
      <TextInput style={[styles.input, styles.textarea]} placeholder="وصف السلعة وحالتها..." value={description} onChangeText={setDescription} multiline textAlignVertical="top" textAlign="right" />
      <TextInput style={styles.input} placeholder="السعر (اختياري)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" textAlign="right" />
      <TextInput style={styles.input} placeholder="المدينة" value={city} onChangeText={setCity} textAlign="right" />
      <Pressable style={styles.location} onPress={locate}><Text style={styles.locationText}>{coords ? '✓ تم تحديد الموقع الدقيق' : 'تحديد الموقع الحالي'}</Text></Pressable>
      <View style={styles.switchRow}><Switch value={showPhone} onValueChange={setShowPhone} trackColor={{ true: colors.primary }} /><Text style={styles.switchText}>إظهار رقم جوالي للمشترين</Text></View>
      <Pressable style={[styles.submit, busy && { opacity: .6 }]} onPress={submit} disabled={busy}><Text style={styles.submitText}>{busy ? 'جاري النشر...' : 'نشر الإعلان مجانًا'}</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  label: { color: colors.text, fontWeight: '800', textAlign: 'right', marginBottom: 9, marginTop: 5 },
  images: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 9, marginBottom: 17 },
  addImage: { width: 90, height: 90, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  addImageText: { color: colors.primary, fontWeight: '700', textAlign: 'center' },
  thumbWrap: { width: 90, height: 90, position: 'relative' },
  thumb: { width: 90, height: 90, borderRadius: 13 },
  removeImage: { position: 'absolute', top: 4, left: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,.65)', alignItems: 'center', justifyContent: 'center' },
  removeImageText: { color: '#fff', fontSize: 20, fontWeight: '800', lineHeight: 21 },
  categories: { gap: 8, marginBottom: 14 },
  chip: { borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '700' },
  chipActiveText: { color: '#fff', fontWeight: '800' },
  input: { height: 53, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 11, fontSize: 16 },
  textarea: { height: 125 },
  location: { borderWidth: 1, borderColor: colors.primary, borderRadius: 13, padding: 14, alignItems: 'center' },
  locationText: { color: colors.primary, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 13, padding: 13, marginTop: 11 },
  switchText: { color: colors.text, fontWeight: '700' },
  submit: { backgroundColor: colors.primary, borderRadius: 14, padding: 17, alignItems: 'center', marginTop: 17 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
