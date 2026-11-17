# Phase 19: Certificate template, Activity log, Alerts

Needs Phases 14.1, 16, 17 and 18 already installed.

## 1. Certificate template (admin only)
Admin > Settings > Certificate template.
- Upload your designed certificate (PNG, JPG or a PDF, up to 8 MB) with an empty space for the name.
  Only admins can see the template (private storage bucket).
- Place the student name (and, if you want, the date and certificate number) with the sliders: across %, down %, size,
  colour, font, alignment. A preview of the finished PDF updates as you move them. Press **Save layout**.
- Admin > Students > Options > **Give certificate**: the new top button **Give certificate from template** stamps the
  student's name on your template and sends the PDF to the student. The old "upload your own PDF" form is still there
  underneath. The quick green **Approve certificate** button on finished students also uses the template now.
- No template uploaded = the built-in design is used, exactly as before.
- Very long names shrink to fit. Names with letters outside A-Z (Arabic, Cyrillic, Chinese...) can not be printed
  automatically; the page tells you, and you can upload a designed PDF for that student instead.
- Some phones can not show a PDF inside the preview box. Use "Open preview in a new tab" there.

## 2. Activity log (Admin > Activity)
Who did what, and when: student cleared / set back to pending (and "Automatic" when a payment cleared them), student deleted,
role changed, certificate given or removed, payout paid or rejected, any setting changed (prices, switches, banner,
contact details, template). Filter by type, search by name. Nobody can edit or delete it from the app.
It only records from the moment you run the SQL. Past actions are not in it.

## 3. Alerts (Admin > Alerts, red number in the admin menu)
New payment, underpaid crypto payment, payout request. They appear live. Choose which ones you want in Settings > Alerts.
Test (mock) payments never alert. Optional **email** copy for payments and underpaid payments (not payouts):
1. Make a free account at resend.com and create an API key.
2. In Vercel > your project > Settings > Environment Variables add `RESEND_API_KEY` = your key. Optional:
   `ALERT_FROM_EMAIL` (for example `ApexTrade <alerts@yourdomain.com>`; the sender must be a domain you verified in Resend)
   and `NEXT_PUBLIC_SITE_URL` (your site address, adds a link in the email).
3. Redeploy, then type your email in Settings > Alerts > "Also email me about payments" and Save.
Without a verified domain, Resend's test sender only delivers to the email you signed up to Resend with.
Automatic **WhatsApp** messages are not possible without a paid WhatsApp business service, so that part is not included.

## SQL
Run `supabase/migrations/20270120000000_phase19.sql` once in the Supabase SQL Editor. It replaces
`admin_save_site_settings()` with a version that keeps every earlier setting, and creates the template bucket, the log and alert tables and their triggers.
Safe to run twice.

## After deploy: check
1. Settings > Certificate template: upload, move the name, Save layout.
2. Students > Options > Give certificate > Give certificate from template on a test student with a Latin name. Open it from the student's Profile.
3. Settings: change anything small, then open Admin > Activity: the change is listed.
4. Make a small real payment (or use a student's payout request): Admin > Alerts shows it, and the email arrives if you set it up.
