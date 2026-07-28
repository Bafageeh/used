import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { colors } from '@/theme';

I18nManager.allowRTL(true);

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{
          headerTitleAlign: 'center',
          headerTintColor: colors.primary,
          headerStyle: { backgroundColor: colors.card },
          contentStyle: { backgroundColor: colors.background },
        }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ title: 'الدخول والتسجيل', presentation: 'modal' }} />
          <Stack.Screen name="listing/[id]" options={{ title: 'تفاصيل الإعلان' }} />
          <Stack.Screen name="create-listing" options={{ title: 'إضافة إعلان' }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
