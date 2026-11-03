# تفعيل الحسابات والدفع الحقيقي (لاحقاً)

الصفحة تشتغل الحين بوضع تجريبي: الحسابات والمشتريات محفوظة في المتصفح نفسه فقط.
للتشغيل الحقيقي (حسابات آمنة على سيرفر، والدفع بالبطاقة):

1. **Supabase** (مجاني): أنشئ مشروع ← SQL Editor ← شغّل `supabase/schema.sql`.
   انسخ `Project URL` و `anon key` وحطها في `CFG` داخل `docs/index.html`.
2. **Stripe**: أنشئ Payment Link للنسخة القياسية ($69.99) وللذهبية ($999,999.99)،
   وخلّ رابط الرجوع بعد الدفع: صفحة المتجر + `?paid=1`. حط الروابط في `CFG.payLinks`.
3. انشر `supabase/functions/stripe-webhook` واربطه في Stripe Webhooks على حدث `checkout.session.completed`،
   وعرّف المتغيرات: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_LINK_ID_STANDARD`, `STRIPE_LINK_ID_GOLD`.

معلومات البطاقة تنكتب في صفحة Stripe الآمنة، وما تمر على موقعنا أبداً.
كود الخصم `ABC466` يعطي النسخة القياسية مجاناً، ويتحقق منه السيرفر.
