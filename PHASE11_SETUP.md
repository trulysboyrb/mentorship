# Phase 11: Admin Overview + Delete student

## 1. Save your work
    cd ~/apextrade-academy
    git add -A && git commit -m "before phase 11"

## 2. Unzip
    unzip -o ~/Downloads/apextrade-phase11.zip
(Change the path if the zip is elsewhere.) Replaces: components/AdminNav.tsx, components/AdminStudents.tsx,
app/admin/payments/page.tsx. New: Overview page, delete route, delete popup, overview helpers.

## 3. Run the database file ONCE
Supabase > SQL Editor > New query > paste `supabase/migrations/20261110000000_phase11.sql` > Run.
(Needs the Phase 10 SQL to have been run first.)

## 4. Check the build, then push
    npm run build
    git add -A && git commit -m "phase 11" && git push

## 5. Using it
- Admin > **Overview** (first link): revenue, signups, charts, who needs a nudge (WhatsApp buttons).
- Admin > Students > **Delete** on any student row. Type DELETE to confirm.
  The student can then sign up again from scratch, even with the same email.

## What delete does and does not do
- Erases the account, progress, devices, notes, certificates (and certificate files).
- KEEPS their payment records (shown as "Name (deleted)" in Admin > Payments).
- Refuses admins, yourself, students with an open payout request, and students owed referral money.
- Warns (asks twice) if the student paid, or if they earned a referral reward for someone: deleting them removes that reward.
- If money arrives later for a deleted student, the payment is recorded and flagged for you to refund.

## Needs SUPABASE_SERVICE_ROLE_KEY
Delete uses the same server key as payments. It is already on Vercel from Phase 10 and in .env.local.
