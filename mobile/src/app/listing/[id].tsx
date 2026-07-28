import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { Listing } from '@/types';
import { colors } from '@/theme';

export default function ListingDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Listing>();
  useEffect(() => { api<Listing>(`/listings/${id}`).then(setItem); }, [id]);
  if (!item) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />;
  const price = item.price ? `${new Intl.NumberFormat('ar-SA').format(Number(item.price))} ر.س` : 'السعر عند التواصل';
  return <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 35 }}>
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.gallery}>
      {item.images.length ? item.images.map(image => <Image key={image.id} source={image.url} style={styles.image} contentFit="cover" />) :
        <View style={[styles.image, styles.placeholder]}><Ionicons name="image-outline" size={60} color={colors.muted} /></View>}
    </ScrollView>
    <View style={styles.body}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.price}>{price}</Text>
      <View style={styles.row}><Ionicons name="location-outline" size={20} color={colors.primary} /><Text style={styles.meta}>{item.city}</Text></View>
      <View style={styles.divider} />
      <Text style={styles.heading}>وصف الإعلان</Text>
      <Text style={styles.description}>{item.description}</Text>
      <View style={styles.seller}>
        <Ionicons name="person-circle-outline" size={42} color={colors.primary} />
        <View style={{ flex: 1, alignItems: 'flex-end' }}><Text style={styles.sellerLabel}>البائع</Text><Text style={styles.sellerName}>{item.user?.name}</Text></View>
      </View>
      {item.user?.phone && <Pressable style={styles.contact} onPress={() => Linking.openURL(`tel:+${item.user?.phone}`)}>
        <Ionicons name="call" size={21} color="#fff" /><Text style={styles.contactText}>اتصال بالبائع</Text>
      </Pressable>}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  gallery: { height: 310, backgroundColor: '#E6ECEB' },
  image: { width: 390, height: 310 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, alignItems: 'flex-end' },
  title: { fontSize: 23, fontWeight: '900', color: colors.text, textAlign: 'right' },
  price: { fontSize: 22, fontWeight: '900', color: colors.primary, marginTop: 10 },
  row: { flexDirection: 'row-reverse', gap: 5, alignItems: 'center', marginTop: 12 },
  meta: { color: colors.muted },
  divider: { width: '100%', borderTopWidth: 1, borderColor: colors.border, marginVertical: 19 },
  heading: { fontWeight: '800', fontSize: 18, color: colors.text },
  description: { color: colors.text, fontSize: 16, lineHeight: 27, textAlign: 'right', marginTop: 9, writingDirection: 'rtl' },
  seller: { width: '100%', flexDirection: 'row-reverse', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 15, padding: 14, marginTop: 22 },
  sellerLabel: { color: colors.muted, fontSize: 12 },
  sellerName: { color: colors.text, fontWeight: '800', fontSize: 16 },
  contact: { width: '100%', backgroundColor: colors.primary, borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 13 },
  contactText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
