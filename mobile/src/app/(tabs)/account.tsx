import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export default function AccountScreen() {
  const { user, logout } = useAuth();
  if (!user) return <View style={styles.root}>
    <Ionicons name="person-circle-outline" size={80} color={colors.primary} />
    <Text style={styles.title}>مرحبًا بك</Text>
    <Text style={styles.subtitle}>سجّل دخولك لإضافة الإعلانات وإدارتها</Text>
    <Pressable style={styles.primary} onPress={() => router.push('/auth')}><Text style={styles.primaryText}>الدخول أو إنشاء حساب</Text></Pressable>
  </View>;
  return <View style={styles.root}>
    <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.slice(0, 1)}</Text></View>
    <Text style={styles.title}>{user.name}</Text>
    <Text style={styles.subtitle}>+{user.phone}</Text>
    <Pressable style={styles.menu} onPress={() => router.push('/(tabs)/my-listings')}><Ionicons name="albums-outline" size={22} color={colors.primary} /><Text style={styles.menuText}>إعلاناتي</Text></Pressable>
    <Pressable style={[styles.menu, styles.logout]} onPress={logout}><Ionicons name="log-out-outline" size={22} color={colors.danger} /><Text style={[styles.menuText, { color: colors.danger }]}>تسجيل الخروج</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: 'center', padding: 24, paddingTop: 55 },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: '900' },
  title: { fontSize: 23, fontWeight: '900', color: colors.text, marginTop: 14 },
  subtitle: { color: colors.muted, marginTop: 6, marginBottom: 28, textAlign: 'center' },
  primary: { width: '100%', backgroundColor: colors.primary, padding: 16, borderRadius: 15, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  menu: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 16, marginBottom: 10, flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  menuText: { flex: 1, textAlign: 'right', color: colors.text, fontWeight: '700', fontSize: 16 },
  logout: { marginTop: 8 },
});
