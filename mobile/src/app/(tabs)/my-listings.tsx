import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Listing, Paginated } from '@/types';
import { colors } from '@/theme';
import { ListingCard } from '@/components/ListingCard';
import { EmptyState } from '@/components/EmptyState';

export default function MyListingsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try { setItems((await api<Paginated<Listing>>('/my/listings')).data); } finally { setLoading(false); }
  }, [user]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (!authLoading && !user) router.push('/auth'); }, [authLoading, user]);
  if (!user) return <EmptyState title="سجّل دخولك" message="لعرض إعلاناتك وإدارتها." />;
  return <FlatList style={styles.root} data={items} keyExtractor={item => String(item.id)} renderItem={({ item }) => <ListingCard item={item} />}
    contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    ListHeaderComponent={<Pressable style={styles.button} onPress={() => router.push('/create-listing')}><Text style={styles.buttonText}>+ إضافة إعلان جديد</Text></Pressable>}
    ListEmptyComponent={!loading ? <EmptyState title="لا توجد إعلانات" message="أضف إعلانك الأول." /> : null} />;
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.background },
  list: { padding: 14, flexGrow: 1 },
  button: { backgroundColor: colors.primary, borderRadius: 14, padding: 15, alignItems: 'center', marginBottom: 15 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
