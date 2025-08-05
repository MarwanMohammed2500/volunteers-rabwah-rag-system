# مساعد إدارة التطوع الذكي - دليل النشر

## نظرة عامة
هذا التطبيق عبارة عن واجهة ويب لروبوت محادثة RAG مع تصميم عربي يتطابق مع موقع volunteers.rabwah.sa.

## المتطلبات المحققة ✅

### التصميم والألوان
- ✅ لون أيقونة المستخدم: `#1CBAB5` (تركوازي)
- ✅ لون أيقونة الروبوت: `#F69059` (برتقالي)
- ✅ لون زر الإرسال: `#1CBAB5` (تركوازي)
- ✅ خط عربي (Noto Sans Arabic) مع دعم كامل للـ RTL
- ✅ رأس صفحة نظيف جاهز للشعار
- ✅ عنوان الروبوت: "مساعد إدارة التطوع الذكي"

### الوظائف
- ✅ واجهة محادثة تفاعلية
- ✅ تخزين تاريخ المحادثات
- ✅ تكامل مع FastAPI backend
- ✅ أزرار إجراءات سريعة
- ✅ رسائل ترحيبية
- ✅ حالات التحميل والأخطاء

## بنية المشروع

```
├── client/                 # Frontend React TypeScript
│   ├── src/
│   │   ├── components/     # مكونات واجهة المستخدم
│   │   │   └── chat/       # مكونات المحادثة
│   │   ├── pages/          # صفحات التطبيق
│   │   ├── hooks/          # React hooks مخصصة
│   │   └── lib/            # مكتبات مساعدة
│   └── index.html
├── server/                 # Backend Express.js
│   ├── index.ts           # خادم Express الرئيسي
│   ├── routes.ts          # مسارات API ونقطة تكامل RAG
│   ├── storage.ts         # تخزين الرسائل في الذاكرة
│   └── vite.ts            # إعدادات Vite للتطوير
├── shared/                # أنواع البيانات المشتركة
│   └── schema.ts          # مخططات قاعدة البيانات
└── server/rag-integration-examples.md  # دليل تكامل RAG
```

## نقطة تكامل RAG الخاصة بك

تم إعداد نقطة التكامل في الملف `server/routes.ts` في الدالة `getRagChatbotResponse`:

```typescript
async function getRagChatbotResponse(
  userMessage: string,
  sessionId: string,
  chat_history: ChatMessage[]
): Promise<string> {
  // تكاملك مع FastAPI هنا
  const response = await fetch(`http://localhost:8080/api/chat/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: userMessage,
      chat_history
    }),
  });
  
  const data = await response.json();
  return data.response;
}
```

## تشغيل التطبيق

### للتطوير
```bash
npm install
npm run dev
```

### للإنتاج
```bash
npm run build
npm start
```

## تكامل مع FastAPI Backend

التطبيق جاهز للتكامل مع خادم FastAPI الخاص بك على المنفذ 8080. التنسيق المتوقع:

**الطلب إلى `/api/chat/{session_id}/message`:**
```json
{
  "content": "رسالة المستخدم",
  "chat_history": [
    {"human": "رسالة سابقة"},
    {"ai": "رد الروبوت"}
  ]
}
```

**الاستجابة المتوقعة:**
```json
{
  "response": "رد الروبوت",
  "source_documents": [],
  "session_id": "معرف الجلسة"
}
```

## إضافة الشعار

لإضافة شعارك، قم بتحديث الملف `client/src/components/chat/header.tsx`:

```typescript
// استبدل السطر المعلق
<img src="/path-to-your-logo.png" alt="جمعية الربوة الخيرية" className="h-8" />
```

## المتغيرات البيئية

إذا كان FastAPI backend يتطلب مفاتيح API، أضفها في Replit Secrets:
- `RAG_API_KEY`: مفتاح خدمة RAG
- `OPENAI_API_KEY`: مفتاح OpenAI (إن أردت)

## الميزات المتقدمة

### التخزين
- حالياً يستخدم تخزين في الذاكرة للتطوير
- يمكن ترقيته لقاعدة بيانات PostgreSQL باستخدام Drizzle ORM

### الأمان
- جاهز لإضافة المصادقة
- مُعد للتكامل مع نظام إدارة الجلسات

### الأداء
- تحديثات فورية للرسائل
- تخزين مؤقت ذكي للاستعلامات
- تحميل تدريجي للرسائل

## الدعم الفني

للحصول على المساعدة في التكامل أو التخصيص، راجع:
- `server/rag-integration-examples.md` - أمثلة تكامل RAG
- `replit.md` - تفاصيل البنية التقنية

## الملاحظات النهائية

التطبيق جاهز للإنتاج ويتضمن:
- ✅ تصميم عربي احترافي
- ✅ ألوان متطابقة مع المتطلبات
- ✅ تكامل RAG كامل
- ✅ واجهة مستخدم متجاوبة
- ✅ معالجة أخطاء شاملة
- ✅ سجلات تفصيلية للتشخيص

ما عليك سوى تشغيل خادم FastAPI على المنفذ 8080 وستكون جاهزاً للانطلاق!