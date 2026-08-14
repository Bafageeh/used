import { Link, Slot, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

const items = [
  { href: '/(tabs)', label: 'الرئيسية', icon: 'home-outline', match: '/' },
  { href: '/(tabs)/search', label: 'البحث', icon: 'search-outline', match: '/search' },
  { href: '/(tabs)/add', label: 'أضف إعلان', icon: 'add-circle', match: '/add' },
  { href: '/(tabs)/my-listings', label: 'إعلاناتي', icon: 'albums-outline', match: '/my-listings' },
  { href: '/(tabs)/account', label: 'حسابي', icon: 'person-outline', match: '/account' },
] as const;

export default function TabsLayout() {
  const pathname = usePathname();

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>مستعمل مجاني</Text>
      </View>

      <View style={styles.content}>
        <Slot />
      </View>

      <View style={styles.tabBar}>
        {items.map(item => {
          const active = item.match === '/' ? pathname === '/' : pathname.endsWith(item.match);
          const color = active ? colors.primary : colors.muted;
          const size = item.match === '/add' ? 32 : 23;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable style={styles.tabItem}>
                <Ionicons name={item.icon} color={color} size={size} />
                <Text style={[styles.label, active && styles.activeLabel]}>{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 54,
    backgroundColor: colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  content: { flex: 1 },
  tabBar: {
    height: 66,
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
    paddingTop: 5,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  activeLabel: { color: colors.primary },
});
