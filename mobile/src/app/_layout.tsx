import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';

enableScreens(false);

export default function RootLayout() {
  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <Slot />
        </AuthProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
