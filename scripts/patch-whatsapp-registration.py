from pathlib import Path

path = Path('mobile/App.tsx')
text = path.read_text(encoding='utf-8')
start = text.index('function LoginPanel(')
end = text.index('\nfunction CreateListing(', start)

block = r'''function LoginPanel({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [mode, setMode] = useState<'user' | 'register' | 'admin'>('user');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const normalizedPhone = () => {
    const digits = phone.replace(/\D/g, '');
    if (/^05\d{8}$/.test(digits)) return `966${digits.slice(1)}`;
    if (/^5\d{8}$/.test(digits)) return `966${digits}`;
    if (/^9665\d{8}$/.test(digits)) return digits;
    throw new Error('أدخل رقم جوال سعودي صحيح مثل 05xxxxxxxx.');
  };

  const submitLogin = async () => {
    setBusy(true);
    try {
      let result: { token: string; user: User };
      if (mode === 'admin') {
        if (!username.trim() || !password) throw new Error('أدخل اسم المستخدم وكلمة المرور.');
        result = await request<{ token: string; user: User }>('/auth/admin-login', {
          method: 'POST', body: JSON.stringify({ username: username.trim(), password, device_name: 'Used Admin Android' }),
        });
      } else {
        const normalized = normalizedPhone();
        if (!/^\d{4,8}$/.test(pin)) throw new Error('أدخل الرقم السري من 4 إلى 8 أرقام.');
        result = await request<{ token: string; user: User }>('/auth/login', {
          method: 'POST', body: JSON.stringify({ phone: normalized, pin, device_name: 'Used Android' }),
        });
      }
      onLogin(result.token, result.user);
    } catch (e) {
      Alert.alert('تعذر تسجيل الدخول', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const sendRegistrationOtp = async () => {
    setBusy(true);
    try {
      const normalized = normalizedPhone();
      if (!name.trim()) throw new Error('أدخل اسمك.');
      if (!/^\d{4,8}$/.test(pin)) throw new Error('اختر رقمًا سريًا من 4 إلى 8 أرقام.');
      await request<{ message: string; expires_in: number }>('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: normalized, purpose: 'register' }),
      });
      setOtpSent(true);
      setOtp('');
      Alert.alert('تم إرسال الرمز', 'أرسلنا رمز تحقق مكوّنًا من 6 أرقام إلى واتساب. الرمز صالح لمدة 5 دقائق.');
    } catch (e) {
      Alert.alert('تعذر إرسال الرمز', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const verifyRegistrationOtp = async () => {
    setBusy(true);
    try {
      const normalized = normalizedPhone();
      if (!name.trim()) throw new Error('أدخل اسمك.');
      if (!/^\d{4,8}$/.test(pin)) throw new Error('اختر رقمًا سريًا من 4 إلى 8 أرقام.');
      if (!/^\d{6}$/.test(otp)) throw new Error('أدخل رمز التحقق المكوّن من 6 أرقام.');
      const result = await request<{ token: string; user: User }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({
          phone: normalized,
          purpose: 'register',
          code: otp,
          name: name.trim(),
          pin,
          device_name: 'Used Android',
        }),
      });
      onLogin(result.token, result.user);
      Alert.alert('تم التسجيل', 'تم التحقق من رقم واتساب وإنشاء حسابك بنجاح.');
    } catch (e) {
      Alert.alert('تعذر التحقق', e instanceof Error ? e.message : 'حدث خطأ غير متوقع.');
    } finally {
      setBusy(false);
    }
  };

  const changeMode = (next: 'user' | 'register' | 'admin') => {
    setMode(next);
    setOtpSent(false);
    setOtp('');
  };

  const title = mode === 'admin' ? 'دخول الإدارة' : mode === 'register' ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
  const help = mode === 'admin'
    ? 'دخول المدير للتحكم الكامل بالحسابات والإعلانات والإعدادات.'
    : mode === 'register'
      ? 'سجّل برقم جوالك، وسنؤكد الرقم برمز OTP يُرسل إلى واتساب.'
      : 'سجّل الدخول لإضافة إعلان ومتابعة إعلاناتك.';

  return (
    <ScrollView contentContainerStyle={styles.formPage} keyboardShouldPersistTaps="handled">
      <View style={styles.formIcon}>
        <Ionicons name={mode === 'admin' ? 'shield-checkmark-outline' : mode === 'register' ? 'person-add-outline' : 'person-outline'} size={34} color={PURPLE} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.help}>{help}</Text>

      <View style={{ flexDirection: 'row-reverse', gap: 7, marginBottom: 14 }}>
        <Pressable onPress={() => changeMode('user')} style={{ flex:1, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='user'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='user'?PURPLE:BORDER }}>
          <Text style={{ color:mode==='user'?'#fff':PURPLE, fontWeight:'900' }}>دخول</Text>
        </Pressable>
        <Pressable onPress={() => changeMode('register')} style={{ flex:1.2, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='register'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='register'?PURPLE:BORDER }}>
          <Text style={{ color:mode==='register'?'#fff':PURPLE, fontWeight:'900' }}>تسجيل جديد</Text>
        </Pressable>
        <Pressable onPress={() => changeMode('admin')} style={{ flex:1, minHeight:44, borderRadius:12, alignItems:'center', justifyContent:'center', backgroundColor:mode==='admin'?PURPLE:'#fff', borderWidth:1, borderColor:mode==='admin'?PURPLE:BORDER }}>
          <Text style={{ color:mode==='admin'?'#fff':PURPLE, fontWeight:'900' }}>الإدارة</Text>
        </Pressable>
      </View>

      {mode === 'admin' ? <>
        <View style={styles.inputShell}><Ionicons name="person-circle-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={username} onChangeText={setUsername} placeholder="اسم المستخدم" autoCapitalize="none" textAlign="right" /></View>
        <View style={styles.inputShell}><Ionicons name="key-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={password} onChangeText={setPassword} placeholder="كلمة المرور" secureTextEntry textAlign="right" /></View>
        <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submitLogin} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>دخول لوحة الإدارة</Text>}</Pressable>
      </> : mode === 'register' ? <>
        <View style={styles.inputShell}><Ionicons name="person-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={name} onChangeText={setName} placeholder="الاسم" textAlign="right" editable={!otpSent} /></View>
        <View style={styles.inputShell}><Ionicons name="logo-whatsapp" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" textAlign="right" editable={!otpSent} /></View>
        <View style={styles.inputShell}><Ionicons name="lock-closed-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={pin} onChangeText={setPin} placeholder="اختر رقمًا سريًا من 4 إلى 8 أرقام" keyboardType="number-pad" secureTextEntry textAlign="right" editable={!otpSent} /></View>
        {otpSent ? <>
          <View style={styles.inputShell}><Ionicons name="chatbubble-ellipses-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={otp} onChangeText={setOtp} placeholder="رمز OTP المرسل على واتساب" keyboardType="number-pad" maxLength={6} textAlign="right" /></View>
          <Text style={[styles.help, { marginTop: 0 }]}>أدخل الرمز خلال 5 دقائق. إذا لم يصلك، يمكنك طلب رمز جديد بعد دقيقة.</Text>
          <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={verifyRegistrationOtp} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>تأكيد الرمز وإنشاء الحساب</Text>}</Pressable>
          <Pressable onPress={sendRegistrationOtp} disabled={busy} style={{ alignItems:'center', paddingVertical:13 }}><Text style={{ color:PURPLE, fontWeight:'900' }}>إعادة إرسال رمز واتساب</Text></Pressable>
          <Pressable onPress={() => { setOtpSent(false); setOtp(''); }} disabled={busy} style={{ alignItems:'center', paddingVertical:8 }}><Text style={{ color:MUTED, fontWeight:'800' }}>تعديل البيانات</Text></Pressable>
        </> : (
          <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={sendRegistrationOtp} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <View style={{ flexDirection:'row', gap:8, alignItems:'center' }}><Ionicons name="logo-whatsapp" size={20} color="#fff" /><Text style={styles.primaryButtonText}>إرسال رمز التحقق عبر واتساب</Text></View>}</Pressable>
        )}
      </> : <>
        <View style={styles.inputShell}><Ionicons name="call-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={phone} onChangeText={setPhone} placeholder="05xxxxxxxx" keyboardType="phone-pad" textAlign="right" /></View>
        <View style={styles.inputShell}><Ionicons name="lock-closed-outline" size={20} color={MUTED} /><TextInput style={styles.inputInner} value={pin} onChangeText={setPin} placeholder="الرقم السري" keyboardType="number-pad" secureTextEntry textAlign="right" /></View>
        <Pressable style={[styles.primaryButton, busy && styles.disabled]} onPress={submitLogin} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>دخول</Text>}</Pressable>
        <Pressable onPress={() => changeMode('register')} style={{ alignItems:'center', paddingVertical:16 }}><Text style={{ color:PURPLE, fontWeight:'900' }}>ليس لديك حساب؟ تسجيل جديد عبر واتساب</Text></Pressable>
      </>}
    </ScrollView>
  );
}
'''

new_text = text[:start] + block + text[end:]
path.write_text(new_text, encoding='utf-8')
print('Patched WhatsApp OTP registration in mobile/App.tsx')
