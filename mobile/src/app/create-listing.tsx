import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { File } from 'expo-file-system';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { api, getErrorMessage } from '@/lib/api';
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 8, quality: .8 });
    if (!result.canceled) setImages(result.assets.slice(0, 8));
  };
  const locate = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return Alert.alert('الموقع', 'يرجى السماح بالوصول إلى الموقع.');
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords(current.coords);
  };
  const submit = async () => {
    if (!categoryId || !title.trim() || !description.trim() || !city.trim()) return Alert.alert('بيانات ناقصة', 'أكمل التصنيف والعنوان والوصف والمدينة.');
    setBusy(true);
    try {
      const listing = await api<Listing>('/listings', { method: 'POST', body: JSON.stringify({
        category_id: categoryId, title, description, price: price || null, city,
        latitude: coords?.latitude, longitude: coords?.longitude, show_phone: showPhone, status: 'published',
      }) });
      if (images.length) {
        const form = new FormData();
        images.forEach(image => {
          const file = new File(image.uri);
          form.append('images[]', file);
        });
        await api(`/listings/${listing.id}/images`, { method: 'POST', body: form });
      }
      Alert.alert('تم بنجاح', 'نُشر إعلانك.', [{ text: 'عرض الإعلان', onPress: () => router.replace(`/listing/${listing.id}`) }]);
    } catch (e) { Alert.alert('تعذر النشر', getErrorMessage(e)); } finally { setBusy(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>صور الإعلان ({images.length}/8)</Text>
      <ScrollView horizontal contentContainerStyle={styles.images}>
        <Pressable style={styles.addImage} onPress={chooseImages}><Text style={styles.addImageText}>+ إضافة صور</Text></Pressable>
        {images.map(image => <Image key={image.uri} source={image.uri} style={styles.thumb} />)}
      </ScrollView>
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
  images: { gap: 9, marginBottom: 17 },
  addImage: { width: 110, height: 90, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  addImageText: { color: colors.primary, fontWeight: '700' },
  thumb: { width: 90, height: 90, borderRadius: 13 },
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
