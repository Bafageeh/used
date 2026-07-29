import { StyleSheet, Text, View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>مستعمل مجاني</Text>
      <Text style={styles.message}>تم تشغيل التطبيق بنجاح</Text>
      <Text style={styles.note}>شاشة فحص مؤقتة لتحديد سبب الإغلاق</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F4F7F6',
  },
  title: {
    color: '#0F766E',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    marginTop: 14,
    color: '#17201E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  note: {
    marginTop: 8,
    color: '#64706D',
    fontSize: 14,
    textAlign: 'center',
  },
});
