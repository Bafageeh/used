import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AgeGate from './AgeGate';

type User = {
  id: number;
  name: string;
  phone?: string | null;
  username?: string | null;
  role?: string;
};

type Props = {
  onLogin: (token: string, user: User) => void;
};

const API_URL = 'https://used.pm.sa/api';
const SITE_URL = 'https://used.pm.sa';
const PURPLE = '#6426C8';
const PURPLE_LIGHT = '#F2EBFF';
const TEXT = '#18181B';
const MUTED = '#71717A';
const BORDER = '#E7E2EF';
const SURFACE = '#F8F7FA';

async function apiRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `تعذر إتمام الطلب (${response.status})`);
  }
  return data as T;
}

function normalizeSaudiPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
  if (/^5\d{8}$/.test(digits)) return `966${digits}`;
  if (/^9665\d{8}$/.test(digits)) return digits;
  throw new Error('أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx.');
}

export default function PhoneLoginPanel({ onLogin }: Props) {
  const [mode, setMode] = useState<'user' | 'register' | 'admin'>('user');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSent, setVerificationSent] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  const changeMode = (next: 'user' | 'register' | 'admin') => {
    setMode(next);
    setAgeVerified(false);
    setVerificationSent(false);
    setVerificationCode('');
    setTermsAccepted(false);
  };

  const login = async () => {
    setBusy(true);
    try {
      if (mode === 'admin') {
        if (!adminUsername.trim() || !adminPassword) throw new Error('أدخل اسم المستخدم وكلمة المرور.');
        const result = await apiRequest<{ token: string; user: User }>('/auth/admin-login', {
          username: adminUsername.trim(),
          password: adminPassword,
          device_name: 'Tanazul Admin',
        });
        onLogin(result.token, result.user);
        return;
      }

      const normalizedPhone = normalizeSaudiPhone(phone);
      if (!/^\d{4,8}$/.test(pin)) throw new Error('أدخل الرقم السري من 4 إلى 8 أرقام.');
      const result = await apiRequest<{ token: string; user: User }>('/auth/login', {
        phone: normalizedPhone,
        pin,
        device_name: 'Tanazul Mobile',
      });
      onLogin(result.token, result.user);
    } catch (error) {
      Alert.alert('تعذر تسجيل الدخول', error instanceof Error ? error.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    setBusy(true);
    try {
      if (!ageVerified) throw new Error('يجب التحقق من العمر قبل إنشاء الحساب.');
      if (!termsAccepted) throw new Error('يجب الموافقة على الشروط والأحكام وسياسة الخصوصية أولاً.');
      if (!name.trim()) throw new Error('أدخل اسمك.');
      const normalizedPhone = normalizeSaudiPhone(phone);
      if (!/^\d{4,8}$/.test(pin)) throw new Error('اختر رقمًا سريًا من 4 إلى 8 أرقام.');

      if (!verificationSent) {
        await apiRequest<{ message: string }>('/auth/request-otp', {
          phone: normalizedPhone,
          purpose: 'register',
        });
        setVerificationSent(true);
        Alert.alert('رمز التحقق', 'تم إرسال رمز التحقق إلى رقم الجوال المسجل.');
        return;
      }

      if (!/^\d{6}$/.test(verificationCode)) {
        throw new Error('أدخل رمز التحقق المكوّن من 6 أرقام.');
      }

      const result = await apiRequest<{ token: string; user: User }>('/auth/verify-otp', {
        phone: normalizedPhone,
        purpose: 'register',
        code: verificationCode,
        name: name.trim(),
        pin,
        device_name: 'Tanazul Mobile',
      });
      onLogin(result.token, result.user);
      Alert.alert('تم إنشاء الحساب', 'أصبح حسابك جاهزًا ويمكنك استخدام جميع ميزات تنازل.');
    } catch (error) {
      Alert.alert('تعذر إنشاء الحساب', error instanceof Error ? error.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'register' && !ageVerified) {
    return <AgeGate onAllowed={() => setAgeVerified(true)} onBack={() => changeMode('user')} />;
  }

  const title = mode === 'admin' ? 'دخول الإدارة' : mode === 'register' ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
  const help = mode === 'admin'
    ? 'دخول المدير للتحكم بالحسابات والإعلانات والإعدادات.'
    : mode === 'register'
      ? 'أنشئ حسابك برقم الجوال ورقم سري، ثم أكّد رمز التحقق.'
      : 'سجّل الدخول برقم الجوال لإضافة إعلان ومتابعة حسابك.';

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.icon}>
        <Ionicons name={mode === 'admin' ? 'shield-checkmark-outline' : mode === 'register' ? 'person-add-outline' : 'call-outline'} size={34} color={PURPLE} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.help}>{help}</Text>

      <View style={styles.tabs}>
        <Pressable onPress={() => changeMode('user')} style={[styles.tab, mode === 'user' && styles.tabActive]}>
          <Text style={[styles.tabText, mode === 'user' && styles.tabTextActive]}>دخول</Text>
        </Pressable>
        <Pressable onPress={() => changeMode('register')} style={[styles.tab, styles.registerTab, mode === 'register' && styles.tabActive]}>
          <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>تسجيل جديد</Text>
        </Pressable>
        <Pressable onPress={() => changeMode('admin')} style={[styles.tab, mode === 'admin' && styles.tabActive]}>
          <Text style={[styles.tabText, mode === 'admin' && styles.tabTextActive]}>الإدارة</Text>
        </Pressable>
      </View>

      {mode === 'admin' ? (
        <>
          <Field icon="person-circle-outline" value={adminUsername} onChangeText={setAdminUsername} placeholder="اسم المستخدم" />
          <Field icon="key-outline" value={adminPassword} onChangeText={setAdminPassword} placeholder="كلمة المرور" secureTextEntry />
          <PrimaryButton busy={busy} label="دخول لوحة الإدارة" onPress={login} />
        </>
      ) : mode === 'register' ? (
        <>
          <Field icon="person-outline" value={name} onChangeText={setName} placeholder="الاسم" />
          <Field
            icon="call-outline"
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              if (verificationSent) {
                setVerificationSent(false);
                setVerificationCode('');
              }
            }}
            placeholder="رقم الجوال مثل 05xxxxxxxx"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          <Field icon="lock-closed-outline" value={pin} onChangeText={setPin} placeholder="اختر رقمًا سريًا من 4 إلى 8 أرقام" keyboardType="number-pad" secureTextEntry />
          {verificationSent ? (
            <Field
              icon="keypad-outline"
              value={verificationCode}
              onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
              placeholder="رمز التحقق المكوّن من 6 أرقام"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={6}
            />
          ) : null}

          <Pressable onPress={() => setTermsAccepted((current) => !current)} style={[styles.terms, termsAccepted && styles.termsAccepted]}>
            <Ionicons name={termsAccepted ? 'checkbox' : 'square-outline'} size={23} color={PURPLE} />
            <Text style={styles.termsText}>أوافق على الشروط والأحكام وسياسة الخصوصية</Text>
          </Pressable>
          <View style={styles.links}>
            <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/terms`)}><Text style={styles.link}>الشروط والأحكام</Text></Pressable>
            <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/privacy`)}><Text style={styles.link}>سياسة الخصوصية</Text></Pressable>
          </View>
          <PrimaryButton busy={busy} label={verificationSent ? 'تأكيد وإنشاء الحساب' : 'إرسال رمز التحقق'} onPress={register} />
        </>
      ) : (
        <>
          <Field
            icon="call-outline"
            value={phone}
            onChangeText={setPhone}
            placeholder="رقم الجوال"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
          />
          <Field icon="lock-closed-outline" value={pin} onChangeText={setPin} placeholder="الرقم السري" keyboardType="number-pad" secureTextEntry />
          <PrimaryButton busy={busy} label="دخول" onPress={login} />
          <Pressable onPress={() => changeMode('register')} style={styles.createAccount}>
            <Text style={styles.createAccountText}>ليس لديك حساب؟ أنشئ حسابًا من داخل التطبيق</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap }) {
  const { icon, ...inputProps } = props;
  return (
    <View style={styles.inputShell}>
      <Ionicons name={icon} size={20} color={MUTED} />
      <TextInput style={styles.input} textAlign="right" {...inputProps} />
    </View>
  );
}

function PrimaryButton({ busy, label, onPress }: { busy: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} onPress={onPress}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingBottom: 30, backgroundColor: SURFACE, flexGrow: 1 },
  icon: { alignSelf: 'center', width: 70, height: 70, borderRadius: 35, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  title: { fontSize: 24, fontWeight: '900', color: TEXT, textAlign: 'right', marginBottom: 7 },
  help: { color: MUTED, fontSize: 13, textAlign: 'right', marginBottom: 16, lineHeight: 20 },
  tabs: { flexDirection: 'row-reverse', gap: 7, marginBottom: 14 },
  tab: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  registerTab: { flex: 1.2 },
  tabActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  tabText: { color: PURPLE, fontWeight: '900' },
  tabTextActive: { color: '#fff' },
  inputShell: { minHeight: 54, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 13, marginBottom: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 16, color: TEXT },
  button: { minHeight: 54, backgroundColor: PURPLE, borderRadius: 15, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  disabled: { opacity: 0.55 },
  terms: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#D8D2DF', backgroundColor: '#fff', paddingHorizontal: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 9, marginBottom: 7 },
  termsAccepted: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  termsText: { flex: 1, textAlign: 'right', color: TEXT, fontSize: 12, fontWeight: '800' },
  links: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 18, marginBottom: 10 },
  link: { color: PURPLE, fontSize: 11, fontWeight: '900', textDecorationLine: 'underline' },
  createAccount: { alignItems: 'center', paddingVertical: 16 },
  createAccountText: { color: PURPLE, fontWeight: '900' },
});
