import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, getErrorMessage } from '@/lib/api';
import type { Category, Listing, Paginated } from '@/types';
import { colors } from '@/theme';
import { ListingCard } from '@/components/ListingCard';
import { EmptyState } from '@/components/EmptyState';

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [categoryId, setCategoryId] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const [cats, result] = await Promise.all([
        api<Category[]>('/categories'),
        api<Paginated<Listing>>(`/listings${categoryId ? `?category_id=${categoryId}` : ''}`),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setListings(Array.isArray(result?.data) ? result.data : []);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  }, [categoryId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  return <View style={styles.root}>
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>بيع واشتري بسهولة</Text>
      <Text style={styles.heroText}>أعلن مجانًا وتواصل مباشرة مع البائع</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
      <Pressable style={[styles.category, !categoryId && styles.categoryActive]} onPress={() => setCategoryId(undefined)}>
        <Ionicons name="grid-outline" size={22} color={!categoryId ? '#fff' : colors.primary} />
        <Text style={[styles.categoryText, !categoryId && styles.categoryTextActive]}>الكل</Text>
      </Pressable>
      {categories.map(category =>
        <Pressable key={category.id} style={[styles.category, categoryId === category.id && styles.categoryActive]} onPress={() => setCategoryId(category.id)}>
          <Ionicons name={(category.icon as any) || 'pricetag-outline'} size={22} color={categoryId === category.id ? '#fff' : colors.primary} />
          <Text style={[styles.categoryText, categoryId === category.id && styles.categoryTextActive]}>{category.name}</Text>
        </Pressable>
      )}
    </ScrollView>
    {error ? <Pressable style={styles.error} onPress={load}><Text>{error} — اضغط للمحاولة</Text></Pressable> : null}
    <FlatList
      data={listings}
      keyExtractor={item => String(item.id)}
      renderItem={({ item }) => <ListingCard item={item} />}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
      ListEmptyComponent={!loading ? <EmptyState title="لا توجد إعلانات بعد" message="كن أول من يضيف إعلانًا في هذا القسم." /> : null}
    />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22, alignItems: 'flex-end' },
  heroTitle: { color: '#fff', fontWeight: '900', fontSize: 22 },
  heroText: { color: '#D5F2EF', marginTop: 5, fontSize: 14 },
  categories: { gap: 10, padding: 14 },
  category: { minWidth: 78, height: 72, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 5 },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.text, fontSize: 11, fontWeight: '700', maxWidth: 95 },
  categoryTextActive: { color: '#fff' },
  list: { paddingHorizontal: 14, paddingBottom: 28, flexGrow: 1 },
  error: { marginHorizontal: 14, marginBottom: 10, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, alignItems: 'center' },
});
