import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <Text style={styles.title}>تعذر عرض التطبيق</Text>
        <Text style={styles.message}>{this.state.error.message || 'حدث خطأ غير متوقع.'}</Text>
        <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  message: { color: colors.danger, marginTop: 12, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    marginTop: 22,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  buttonText: { color: '#fff', fontWeight: '800' },
});
