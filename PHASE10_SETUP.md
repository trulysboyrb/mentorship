# Phase 10: Online payments (Wave, Card, Crypto)

Students now see four coloured buttons: **Pay via Wave** (blue), **Pay via Card** (purple),
**Pay via Crypto** (orange) and **Pay via WhatsApp** (green). Wave, Card and Crypto clear the
student automatically once the payment company confirms the money. WhatsApp payments are still
cleared by you with the Clear button on the Students page.

A button only appears when its keys are set up, so you can switch them on one at a time.

## 0. Before you start
Commit your work first: `git add -A && git commit -m "before phase 10"`

## 1. Unzip over your project
    cd ~/apextrade-academy
    unzip -o ~/apextrade-phase10.zip
(adjust the zip path to wherever you saved it)
This replaces: middleware.ts, lib/supabase/middleware.ts, app/dashboard/page.tsx, app/pending/page.tsx,
app/admin/page.tsx, app/admin/settings/page.tsx, components/AdminNav.tsx, components/AdminStudents.tsx.
Everything else is new. Your lib/config.ts, lib/legal.ts and next.config.ts are NOT touched.

## 2. Install the Modem Pay package
    npm install modem-pay

## 3. Run the database file ONCE
Supabase > SQL Editor > paste `supabase/migrations/20261030000000_phase10.sql` > Run.
(Run the Phase 9 SQL first if you have not.)

## 4. Try it with NO accounts first (test mode)
Add to `.env.local`:
    SUPABASE_SERVICE_ROLE_KEY=...   (Supabase > Project Settings > API > service_role. SECRET. Never share it or put NEXT_PUBLIC in front.)
    PAYMENTS_MOCK=1
Then `npm run dev`, sign up a test student, tap any pay button > Continue > "Simulate successful payment".
The student should unlock by itself. Mock mode is ignored in production, so it can never be on live.
Remove PAYMENTS_MOCK=1 when you move on to the real providers.

## 5. Wave and Card (Modem Pay)
1. Create an account at modempay.com and finish their business verification.
2. Developer area: copy your **secret key** (use the TEST key first).
3. Add a webhook with the address `https://YOUR-SITE.vercel.app/api/webhooks/modempay` and copy its **signing secret**.
4. Env vars: `MODEMPAY_SECRET_KEY`, `MODEMPAY_WEBHOOK_SECRET`.
5. Wave: the checkout page lets the student choose Wave. If Modem Pay tells you an exact name for Wave
   to force it on the page, put it in `MODEMPAY_WAVE_METHODS` (comma separated). Optional.

## 6. Crypto (NOWPayments)
1. Create an account at nowpayments.io, add your payout wallet (e.g. USDT) in Settings > Payments.
2. Settings > API keys: copy the **API key**. Settings > IPN: generate the **IPN secret**.
3. Env vars: `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`. For their practice site also `NOWPAYMENTS_SANDBOX=1` (needs a separate sandbox account).
4. The callback address (`.../api/webhooks/nowpayments`) is sent automatically with every invoice.
5. In the site: Admin > Settings > **Crypto price**: type how many dalasi equal 1 US dollar. The Crypto button stays hidden until you do.

## 7. Put the keys on Vercel
Vercel > your project > Settings > Environment Variables: add every variable above
(plus `NEXT_PUBLIC_SITE_URL=https://YOUR-SITE.vercel.app`), then Deployments > Redeploy.
Then `git add -A && git commit -m "phase 10" && git push`.
Webhooks need the live address: payment companies cannot reach localhost.

## 8. Checking it works (use TEST keys, small amounts)
- Admin > Payments shows each attempt and its status, and a red box when something needs you
  (paid too little, paid twice, or a message that could not be matched to a student).
- Admin > Students shows "via Wave / Card / Crypto / Admin" under Cleared.

## Honest notes
- Tested here: database rules, the signature check, status handling, price maths and the type check.
- NOT tested here (no internet to provider accounts, and no full `next build`): real calls to Modem Pay and NOWPayments.
  Please do one TEST payment per method before going live.
- Things to confirm on your first test: Modem Pay's webhook format and `x-modem-signature` header (we use their
  official package to check it), the Wave option on their page, and that GMD checkout is enabled on your account.
- If a student pays but is not cleared, they see a reference code and a WhatsApp button; you can clear them by hand.
- Suggested wording for your Privacy page: "Payments are processed by Modem Pay and NOWPayments. We do not store card or wallet details."
