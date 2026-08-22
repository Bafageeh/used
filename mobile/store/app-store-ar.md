# بيانات App Store — تنازل

## البيانات الأساسية
- اسم التطبيق: تنازل
- العنوان الفرعي المقترح: سوق للتنازل عن المستعمل
- التصنيف الأساسي المقترح: Shopping
- Bundle ID: sa.pm.used
- الإصدار الأول: 1.0.0
- Support URL: https://used.pm.sa/support
- Privacy Policy URL: https://used.pm.sa/privacy
- Privacy Choices / Account Deletion URL: https://used.pm.sa/delete-account
- Terms URL: https://used.pm.sa/terms

## الوصف المقترح
تنازل هو تطبيق يسهّل عرض السلع المستعملة للتنازل دون مقابل والتواصل بين صاحب الإعلان والمهتم.

يمكن للمستخدم تصفح الإعلانات والبحث حسب التصنيف والمنطقة، مشاهدة صور وفيديو السلعة، عرض الإعلانات على الخريطة عند توفر الموقع، حفظ الإعلانات في المفضلة، والتواصل مع البائع عبر الرسائل داخل التطبيق.

لصاحب الإعلان إمكانية إنشاء إعلان وإضافة عدة صور وفيديو ووصف حالة السلعة وتحديد موقع الإعلان واختيار إظهار رقم الجوال للمهتمين. يوفر التطبيق أدوات للإبلاغ عن المحتوى أو المستخدمين وحظر المستخدمين وإدارة الحساب وحذفه نهائيًا.

لا يفرض التطبيق رسومًا على نشر الإعلان، ولا ينفذ عمليات دفع أو تحويل أموال بين المستخدمين.

## الكلمات المفتاحية المقترحة
تنازل,مستعمل,إعلانات,سوق,أغراض,سيارات,جوالات,أثاث,إلكترونيات

## ملاحظات المراجعة المقترحة
- يمكن تصفح الإعلانات بدون تسجيل دخول.
- التسجيل مطلوب لإضافة إعلان أو استخدام الرسائل وبعض وظائف الحساب.
- يمكن إنشاء حساب باسم مستخدم ورقم سري بالكامل من داخل التطبيق، كما يستمر دعم دخول الحسابات الحالية برقم الجوال والرقم السري.
- التطبيق يدعم محتوى ينشئه المستخدمون، ويحتوي على الإبلاغ عن الإعلان والمستخدم والرسالة، وحظر المستخدم، وفلترة أولية للنصوص المخالفة.
- حذف الحساب متاح من داخل التطبيق، كما توجد صفحة خارجية لطلب/شرح الحذف على https://used.pm.sa/delete-account.
- الموقع اختياري ويستخدم فقط عندما يختار المستخدم إضافة موقع إعلان أو استخدام ميزات القرب.
- لا توجد مشتريات داخل التطبيق ولا اشتراكات ولا معالجة مدفوعات.

## App Privacy — إجابات مبدئية يجب مطابقتها في App Store Connect
### Contact Info
- Name: Collected, Linked to User, App Functionality
- Phone Number: Collected, Linked to User, App Functionality / Account Management

### Location
- Precise Location: Collected only when the user chooses location features, Linked to User/Listing, App Functionality

### User Content
- Photos or Videos: Collected, Linked to User, App Functionality
- Other User Content: listing title/description and messages, Collected, Linked to User, App Functionality

### Identifiers
- User ID: Collected, Linked to User, App Functionality

### Tracking
- التطبيق لا يستخدم حاليًا SDK إعلانات أو تحليلات أو تتبع عبر تطبيقات ومواقع شركات أخرى؛ لا تعلن Tracking ما لم يضاف لاحقًا SDK يقوم بذلك.

## Age Rating
التطبيق يحتوي على:
- User-Generated Content: نعم
- Messaging and Chat: نعم
- Age Assurance: نعم

شروط التطبيق الحالية تتطلب عمر 18 سنة أو أكثر عند إنشاء حساب، لذلك عند إعداد Age Rating في App Store Connect استخدم Override to Higher Age Rating بما يتوافق مع حد العمر المذكور في الشروط.

## معلومات يلزم إدخالها عند توفر حساب App Store Connect
- SKU: used-ios-001
- Copyright: اسم صاحب الحقوق/الكيان في حساب Apple
- App Review contact name / phone / email
- Reviewer demo account (اسم مستخدم + PIN)، مع إمكانية إنشاء حساب جديد من داخل التطبيق دون أي تطبيق إضافي
- Apple ID (ascAppId) بعد إنشاء سجل التطبيق في App Store Connect، ثم يضاف إلى eas.json
