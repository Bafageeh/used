import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api, getErrorMessage } from '@/lib/api';
import type { User } from '@/types';
import { colors } from '@/theme';
import { useAuth } from '@/context/AuthContext';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { setSession } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const normalizedPhone = phone.startsWith('966') ? phone : `966${phone.replace(/^0/, '')}`;

  const finish = async (result: { token: string; user: User }) => {
    await setSession(result.token, result.user);
    router.replace('/(tabs)');
  };

  const submit = async () => {
    setBusy(true); setError('');
    try {
      if (mode === 'login') {
        await finish(await api('/auth/login', { method: 'POST', body: JSON.stringify({ phone: normalizedPhone, pin, device_name: Platform.OS }) }));
      } else {
        await api('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone: normalizedPhone, purpose: 'register' }) });
        setStep('otp');
      }
    } catch (e) { setError(getErrorMessage(e)); } finally { setBusy(false); }
  };

  const verify = async () => {
    setBusy(true); setError('');
    try {
      await finish(await api('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone: normalizedPhone, purpose: 'register', code, name, pin, device_name: Platform.OS }) }));
    } catch (e) { setError(getErrorMessage(e)); } finally { setBusy(false); }
  };

  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Text style={styles.brand}>تنازل</Text>
      <Text style={styles.subtitle}>{step === 'otp' ? 'أدخل الرمز المرسل عبر واتساب' : 'دخول آمن وسريع إلى حسابك'}</Text>
      {step === 'form' && <>
        <View style={styles.switch}>
          <Pressable style={[styles.switchItem, mode === 'login' && styles.switchActive]} onPress={() => setMode('login')}><Text style={mode === 'login' ? styles.switchActiveText : styles.switchText}>تسجيل الدخول</Text></Pressable>
          <Pressable style={[styles.switchItem, mode === 'register' && styles.switchActive]} onPress={() => setMode('register')}><Text style={mode === 'register' ? styles.switchActiveText : styles.switchText}>حساب جديد</Text></Pressable>
        </View>
        {mode === 'register' && <TextInput style={styles.input} placeholder="الاسم" value={name} onChangeText={setName} textAlign="right" />}
        <TextInput style={styles.input} placeholder="رقم الجوال 05xxxxxxxx" value={phone} onChangeText={setPhone} keyboardType="phone-pad" textAlign="right" />
        <TextInput style={styles.input} placeholder="الرقم السري (4 إلى 8 أرقام)" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry textAlign="right" />
        <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={submit}><Text style={styles.buttonText}>{busy ? 'جاري التحقق...' : mode === 'login' ? 'دخول' : 'إرسال رمز واتساب'}</Text></Pressable>
      </>}
      {step === 'otp' && <>
        <TextInput style={[styles.input, styles.otp]} placeholder="000000" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} textAlign="center" />
        <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={verify}><Text style={styles.buttonText}>تأكيد وإنشاء الحساب</Text></Pressable>
        <Pressable onPress={() => setStep('form')}><Text style={styles.link}>تعديل البيانات</Text></Pressable>
      </>}
      {!!error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, justifyContent: 'center', padding: 22, backgroundColor: colors.background },
  brand: { textAlign: 'center', color: colors.primary, fontSize: 30, fontWeight: '900' },
  subtitle: { textAlign: 'center', color: colors.muted, marginTop: 7, marginBottom: 28 },
  switch: { flexDirection: 'row-reverse', backgroundColor: '#E8EFEE', borderRadius: 14, padding: 4, marginBottom: 14 },
  switchItem: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 11 },
  switchActive: { backgroundColor: '#fff' },
  switchText: { color: colors.muted, fontWeight: '700' },
  switchActiveText: { color: colors.primary, fontWeight: '800' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 15, height: 54, marginBottom: 12, fontSize: 16 },
  otp: { fontSize: 26, letterSpacing: 8 },
  button: { backgroundColor: colors.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: .6 },
  error: { color: colors.danger, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginTop: 14, textAlign: 'center' },
  link: { color: colors.primary, textAlign: 'center', fontWeight: '700', marginTop: 18 },
});
