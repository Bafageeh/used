import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export default function TabsLayout() {
  return <Tabs screenOptions={{
    headerTitleAlign: 'center',
    headerStyle: { backgroundColor: colors.card },
    headerTintColor: colors.primary,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8 },
    tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
  }}>
    <Tabs.Screen name="index" options={{
      title: 'الرئيسية',
      headerTitle: 'مستعمل مجاني',
      tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
    }} />
    <Tabs.Screen name="search" options={{
      title: 'البحث',
      tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" color={color} size={size} />,
    }} />
    <Tabs.Screen name="add" options={{
      title: 'أضف إعلان',
      headerShown: false,
      tabBarIcon: ({ color }) => <Ionicons name="add-circle" color={color} size={35} />,
    }} />
    <Tabs.Screen name="my-listings" options={{
      title: 'إعلاناتي',
      tabBarIcon: ({ color, size }) => <Ionicons name="albums-outline" color={color} size={size} />,
    }} />
    <Tabs.Screen name="account" options={{
      title: 'حسابي',
      tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
    }} />
  </Tabs>;
}
