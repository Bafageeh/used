import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import type { Listing, Paginated } from '@/types';
import { colors } from '@/theme';
import { ListingCard } from '@/components/ListingCard';
import { EmptyState } from '@/components/EmptyState';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Listing[]>([]);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) { setItems([]); setSearched(false); return; }
      const result = await api<Paginated<Listing>>(`/listings?q=${encodeURIComponent(query.trim())}`);
      setItems(result.data);
      setSearched(true);
    }, 450);
    return () => clearTimeout(timer);
  }, [query]);

  return <View style={styles.root}>
    <View style={styles.search}>
      <Ionicons name="search" size={22} color={colors.muted} />
      <TextInput value={query} onChangeText={setQuery} placeholder="ابحث عن سلعة أو خدمة..." style={styles.input} textAlign="right" />
    </View>
    <FlatList data={items} keyExtractor={item => String(item.id)} renderItem={({ item }) => <ListingCard item={item} />} contentContainerStyle={styles.list}
      ListEmptyComponent={searched ? <EmptyState title="لا توجد نتائج" message="جرّب كلمة بحث أو تصنيفًا مختلفًا." /> : <EmptyState title="ابحث في الإعلانات" message="اكتب اسم السلعة التي تبحث عنها." />} />
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  search: { margin: 14, height: 52, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  input: { flex: 1, fontSize: 16, color: colors.text },
  list: { paddingHorizontal: 14, paddingBottom: 25, flexGrow: 1 },
});
