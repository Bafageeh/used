import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type LegalType = 'privacy' | 'terms';

type Section = {
  title: string;
  body?: string;
  bullets?: string[];
};

const PURPLE = '#6426C8';
const PURPLE_DARK = '#4B169E';
const PURPLE_LIGHT = '#F2EBFF';
const TEXT = '#18181B';
const MUTED = '#71717A';
const BORDER = '#E7E2EF';
const SITE_URL = 'https://used.pm.sa';
const CONTACT_EMAIL = 'a.baf@live.com';
const UPDATED_AT = '15 أغسطس 2026';

const privacySections: Section[] = [
  {
    title: '1. من نحن',
    body: 'توضح هذه السياسة كيفية تعامل تطبيق «تنازل» مع بيانات المستخدمين. التطبيق منصة إعلانات للسلع المستعملة للتنازل دون مقابل، ويشغله المطور أحمد بافقيه عبر used.pm.sa.',
  },
  {
    title: '2. البيانات التي نجمعها',
    bullets: [
      'بيانات الحساب: الاسم، رقم الجوال، حالة التحقق، ورموز الجلسة اللازمة لتسجيل الدخول. الرقم السري ورمز OTP لا يُحفظان كنص مقروء؛ بل تتم حمايتهما بصيغ تجزئة آمنة على الخادم.',
      'بيانات الإعلانات: العنوان، الوصف، حالة السلعة، المدينة، التصنيف، الصور والفيديو.',
      'بيانات الموقع: الإحداثيات الدقيقة فقط عندما يختار المستخدم إضافة موقعه إلى الإعلان أو تشغيل ميزة «القريب».',
      'بيانات التواصل: الرسائل التي يرسلها المستخدم داخل المحادثات مع أوقات الإرسال والقراءة.',
      'بيانات تقنية وأمنية محدودة، مثل اسم الجهاز عند إنشاء جلسة الدخول وسجلات الخادم اللازمة للأمان وتشخيص الأعطال ومنع إساءة الاستخدام.',
    ],
  },
  {
    title: '3. لماذا نستخدم البيانات',
    bullets: [
      'إنشاء الحساب والتحقق من رقم الجوال وتسجيل الدخول.',
      'نشر الإعلانات وعرضها والبحث والتصفية وتشغيل ميزات الموقع والقرب.',
      'تمكين المراسلة بين المستخدمين وإدارة الإعلانات والمفضلة.',
      'حماية الحسابات والخدمة من الاحتيال والإساءة والمحتوى المخالف.',
      'تشغيل الخدمة ومعالجة الأعطال والالتزام بالمتطلبات النظامية عند انطباقها.',
    ],
  },
  {
    title: '4. مشاركة البيانات',
    bullets: [
      'لا نبيع أو نؤجر البيانات الشخصية، ولا نستخدمها للإعلانات الموجهة في النسخة الحالية من التطبيق.',
      'قد يُرسل رقم الجوال ورمز التحقق إلى خدمة WhatsApp/Meta بالقدر اللازم لتسليم رمز OTP عندما يطلب المستخدم التحقق.',
      'قد نعتمد على مزودي استضافة وبنية تحتية لمعالجة البيانات بالقدر اللازم لتشغيل الخدمة.',
      'قد تظهر للمستخدمين الآخرين البيانات التي يختار صاحب الإعلان نشرها مثل الاسم والمدينة ومحتوى الإعلان، ولا يظهر رقم الجوال إلا عند تفعيل خيار إظهاره.',
      'قد نفصح عن معلومات إذا أوجب النظام ذلك أو لحماية المستخدمين والخدمة من احتيال أو إساءة جسيمة.',
    ],
  },
  {
    title: '5. أذونات الجهاز',
    bullets: [
      'الكاميرا: عند اختيار تصوير صورة أو فيديو للإعلان.',
      'الصور والوسائط: عند اختيار صور أو فيديو من الجهاز.',
      'الموقع: عند اختيار إضافة الموقع الدقيق أو استخدام «القريب». ويمكن استخدام التطبيق وإدخال المدينة يدويًا دون منح إذن الموقع.',
    ],
  },
  {
    title: '6. الحماية',
    body: 'نستخدم اتصال HTTPS، ورموز جلسات وصول، وتجزئة للرقم السري ورموز التحقق، وضوابط وصول على الخادم. ومع ذلك لا توجد وسيلة نقل أو تخزين إلكتروني يمكن ضمان أمانها بنسبة 100%.',
  },
  {
    title: '7. الاحتفاظ والحذف',
    bullets: [
      'نحتفظ ببيانات الحساب والمحتوى ما دام الحساب قائمًا أو بقدر ما يلزم لتقديم الخدمة والأمان والالتزامات النظامية.',
      'رموز OTP صالحة لمدة زمنية محدودة ولا يمكن استخدامها بعد انتهاء صلاحيتها.',
      'يمكن حذف الإعلانات من داخل التطبيق.',
      'يمكن حذف الحساب نهائيًا من «حسابي ← حذف الحساب». يؤدي ذلك إلى حذف الحساب وإعلاناته وصوره وفيديوهاته ورسائله المرتبطة التي لا يلزم الاحتفاظ بها نظامًا.',
      'يمكن كذلك بدء طلب حذف الحساب خارج التطبيق من used.pm.sa/delete-account بعد التحقق من ملكية الحساب.',
    ],
  },
  {
    title: '8. حقوق المستخدم',
    body: 'يمكن للمستخدم تعديل أو حذف إعلاناته، والتحكم في إظهار رقم الجوال، ورفض أذونات الموقع والكاميرا، وتسجيل الخروج، وطلب حذف الحساب والبيانات المرتبطة به. للاستفسارات المتعلقة بالخصوصية تواصل معنا عبر البريد أدناه.',
  },
  {
    title: '9. الأطفال',
    body: 'الخدمة غير موجهة للأطفال. لا يجوز استخدامها بطريقة تخالف الأنظمة المتعلقة بالقُصّر أو تعرضهم للخطر.',
  },
  {
    title: '10. تحديثات السياسة',
    body: 'قد نحدّث هذه السياسة عند تغيير خصائص التطبيق أو المتطلبات النظامية. سيظهر تاريخ آخر تحديث في هذه الصفحة، وقد نطلب موافقة جديدة عندما يكون التغيير جوهريًا ويتطلب ذلك.',
  },
];

const termsSections: Section[] = [
  {
    title: '1. قبول الشروط',
    body: 'باستخدام «تنازل» أو إنشاء حساب أو نشر إعلان، فإنك توافق على هذه الشروط وسياسة الخصوصية. إذا لم توافق عليها فلا تستخدم الميزات التي تتطلب حسابًا أو نشر محتوى.',
  },
  {
    title: '2. طبيعة الخدمة',
    body: '«تنازل» منصة إعلانات تتيح للمستخدمين عرض سلع مستعملة للتنازل دون مقابل والتواصل بشأنها. التطبيق ليس بائعًا أو مشتريًا أو وسيط دفع أو ضامنًا لأي صفقة، ولا يستلم قيمة السلع نيابةً عن المستخدمين.',
  },
  {
    title: '3. الحساب وأمنه',
    bullets: [
      'يجب تقديم بيانات صحيحة والمحافظة على سرية الرقم السري وعدم تمكين الآخرين من استخدام الحساب بصورة غير مشروعة.',
      'أنت مسؤول عن النشاط الصادر من حسابك ما لم تبلغنا عن اختراق أو استخدام غير مصرح به.',
      'يجوز تعليق أو حذف الحسابات المستخدمة في الاحتيال أو الإساءة أو مخالفة هذه الشروط أو الأنظمة.',
    ],
  },
  {
    title: '4. قواعد الإعلانات والمحتوى',
    bullets: [
      'يجب أن يكون الإعلان صحيحًا وواضحًا وأن تكون لك صلاحية نظامية لعرض السلعة أو المحتوى.',
      'يُمنع المحتوى غير القانوني أو الاحتيالي أو المضلل، والسلع المسروقة أو المقلدة، والأسلحة والمتفجرات والمواد الخطرة أو المخدرات والمواد المحظورة، والمحتوى الجنسي أو الاستغلالي، وخطاب الكراهية أو التهديد أو التحرش، وانتهاك الخصوصية أو الملكية الفكرية، والرسائل المزعجة أو الروابط الضارة.',
      'يُمنع نشر بيانات شخصية تخص الآخرين دون حق أو موافقة، أو استخدام التطبيق لانتحال الهوية أو الإضرار بالغير.',
      'يجوز حذف أو إخفاء أي إعلان أو رسالة أو حساب مخالف واتخاذ الإجراءات اللازمة لحماية المستخدمين والمنصة.',
    ],
  },
  {
    title: '5. المحتوى الذي تنشره',
    body: 'تظل مالكًا للمحتوى الذي ترفعه. وتمنح «تنازل» ترخيصًا غير حصري ومحدودًا بالقدر اللازم لاستضافة المحتوى ومعالجته وعرضه وتشغيل ميزات التطبيق، وينتهي هذا الترخيص عند حذف المحتوى إلا بالقدر اللازم للنسخ الفنية المؤقتة أو الالتزامات النظامية.',
  },
  {
    title: '6. التواصل والصفقات',
    bullets: [
      'الاتفاق والاستلام والفحص وأي تعامل بين المستخدمين مسؤولية أطراف الصفقة.',
      'تحقق من السلعة والطرف الآخر قبل التسليم، ولا ترسل أموالًا أو معلومات حساسة استجابةً لرسالة أو رابط غير موثوق.',
      'لا نضمن صحة كل إعلان أو هوية كل مستخدم، مع اتخاذ إجراءات معقولة للحد من الإساءة عند اكتشافها أو الإبلاغ عنها.',
    ],
  },
  {
    title: '7. الموقع ورقم الجوال',
    body: 'إضافة الموقع الدقيق واختيار إظهار رقم الجوال ميزتان اختياريتان. يتحمل المستخدم مسؤولية المعلومات التي يقرر نشرها للآخرين، ويمكنه تعطيل إظهار الرقم أو عدم إضافة موقع دقيق.',
  },
  {
    title: '8. الإبلاغ والإدارة',
    body: 'يمكن التواصل مع إدارة التطبيق بشأن المحتوى أو السلوك المخالف عبر البريد المنشور أدناه. ويحق للإدارة التحقيق في البلاغات وإزالة المحتوى أو تقييد الحسابات عند الحاجة. ولا يمنع ذلك المستخدم من اللجوء إلى الجهات المختصة عند وجود احتيال أو تهديد أو مخالفة نظامية.',
  },
  {
    title: '9. إخلاء المسؤولية',
    body: 'تُقدم الخدمة كما هي ضمن الحدود المسموح بها نظامًا. لا نضمن إتمام أي صفقة أو ملاءمة أو جودة أي سلعة أو استمرار الخدمة دون انقطاع. ولا نستبعد أي مسؤولية لا يجوز استبعادها نظامًا.',
  },
  {
    title: '10. إنهاء الاستخدام وحذف الحساب',
    body: 'يمكن للمستخدم التوقف عن استخدام الخدمة وحذف حسابه من داخل التطبيق. ويجوز لنا تعليق أو إنهاء الحساب عند المخالفات الجسيمة أو المتكررة، مع مراعاة الأنظمة والحقوق التي لا يجوز التنازل عنها.',
  },
  {
    title: '11. النظام الواجب التطبيق',
    body: 'تخضع هذه الشروط لأنظمة المملكة العربية السعودية، دون الإخلال بأي حقوق إلزامية للمستخدم يقررها نظام واجب التطبيق.',
  },
  {
    title: '12. تعديل الشروط',
    body: 'قد نعدّل هذه الشروط عند تطوير الخدمة أو تغير المتطلبات. سيتم تحديث تاريخ الصفحة، وقد نطلب موافقة جديدة عند وجود تغيير جوهري يتطلب ذلك.',
  },
];

export default function LegalScreen({ type }: { type: LegalType }) {
  const privacy = type === 'privacy';
  const title = privacy ? 'سياسة الخصوصية' : 'الشروط والأحكام';
  const sections = privacy ? privacySections : termsSections;
  const publicUrl = `${SITE_URL}/${privacy ? 'privacy' : 'terms'}`;

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name={privacy ? 'shield-checkmark-outline' : 'document-text-outline'} size={31} color={PURPLE} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.updated}>آخر تحديث: {UPDATED_AT}</Text>
        <Text style={styles.intro}>تنازل • used.pm.sa</Text>
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.card}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.body ? <Text style={styles.body}>{section.body}</Text> : null}
          {section.bullets?.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Text style={styles.body}>{item}</Text>
              <Text style={styles.bullet}>•</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={styles.contactCard}>
        <Text style={styles.contactTitle}>التواصل</Text>
        <Text style={styles.contactText}>للاستفسارات القانونية أو المتعلقة بالخصوصية:</Text>
        <Pressable onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)} style={styles.linkButton}>
          <Ionicons name="mail-outline" size={19} color={PURPLE} />
          <Text style={styles.linkText}>{CONTACT_EMAIL}</Text>
        </Pressable>
        <Pressable onPress={() => void Linking.openURL(publicUrl)} style={styles.linkButton}>
          <Ionicons name="globe-outline" size={19} color={PURPLE} />
          <Text style={styles.linkText}>فتح النسخة المنشورة على الموقع</Text>
        </Pressable>
        {privacy ? (
          <Pressable onPress={() => void Linking.openURL(`${SITE_URL}/delete-account`)} style={styles.linkButton}>
            <Ionicons name="trash-outline" size={19} color="#B91C1C" />
            <Text style={[styles.linkText, { color: '#B91C1C' }]}>طلب حذف الحساب خارج التطبيق</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 14, paddingBottom: 34, backgroundColor: '#F8F7FA' },
  hero: { alignItems: 'center', paddingVertical: 13 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  title: { color: TEXT, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  updated: { color: MUTED, fontSize: 11, marginTop: 5 },
  intro: { color: PURPLE_DARK, fontSize: 12, fontWeight: '800', marginTop: 4 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 16, padding: 15, marginBottom: 10 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '900', textAlign: 'right', marginBottom: 8 },
  body: { flex: 1, color: '#4F4955', fontSize: 13, lineHeight: 22, textAlign: 'right' },
  bulletRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 8, marginBottom: 5 },
  bullet: { color: PURPLE, fontSize: 17, fontWeight: '900', lineHeight: 22 },
  contactCard: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D8C8EB', borderRadius: 16, padding: 15, marginTop: 4 },
  contactTitle: { color: TEXT, fontSize: 16, fontWeight: '900', textAlign: 'right' },
  contactText: { color: MUTED, fontSize: 12, textAlign: 'right', marginTop: 5, marginBottom: 7 },
  linkButton: { minHeight: 44, borderRadius: 12, backgroundColor: '#FAF7FF', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingHorizontal: 12, marginTop: 7 },
  linkText: { flex: 1, color: PURPLE, fontSize: 12, fontWeight: '900', textAlign: 'right' },
});
