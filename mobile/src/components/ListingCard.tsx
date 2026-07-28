import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Listing } from '@/types';
import { colors } from '@/theme';

const money = new Intl.NumberFormat('ar-SA', { maximumFractionDigits: 0 });

export function ListingCard({ item }: { item: Listing }) {
  const image = item.images?.[0]?.url;
  return (
    <Pressable style={styles.card} onPress={() => router.push(`/listing/${item.id}`)}>
      <View style={styles.imageWrap}>
        {image ? <Image source={image} style={styles.image} contentFit="cover" transition={180} /> :
          <Ionicons name="image-outline" size={35} color={colors.muted} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.price}>{item.price ? `${money.format(Number(item.price))} ر.س` : 'السعر عند التواصل'}</Text>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <Text style={styles.city}>{item.city}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 14 },
  imageWrap: { height: 175, backgroundColor: '#E9EFEE', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  content: { padding: 13, alignItems: 'flex-end' },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  price: { color: colors.primary, fontSize: 17, fontWeight: '800', marginTop: 8 },
  meta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 3, marginTop: 7 },
  city: { color: colors.muted, fontSize: 13 },
});
