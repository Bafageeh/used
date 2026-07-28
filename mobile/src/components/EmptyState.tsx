import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

export function EmptyState({ title, message }: { title: string; message: string }) {
  return <View style={styles.root}>
    <Ionicons name="file-tray-outline" size={50} color={colors.primary} />
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.message}>{message}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 12 },
  message: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 7, lineHeight: 22 },
});
