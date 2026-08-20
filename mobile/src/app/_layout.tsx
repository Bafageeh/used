import { Text, View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Text style={{ fontSize: 28, fontWeight: '700', textAlign: 'center' }}>
        تنازل
      </Text>
      <Text style={{ marginTop: 12, fontSize: 16, textAlign: 'center' }}>
        اختبار تشغيل أساسي
      </Text>
    </View>
  );
}
