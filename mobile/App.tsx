import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.title}>مستعمل مجاني</Text>
      <Text style={styles.subtitle}>اختبار تشغيل مباشر بدون Expo Router</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#334155',
    textAlign: 'center',
  },
});
