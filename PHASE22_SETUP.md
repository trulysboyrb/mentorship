# Phase 22: In person groups, batch numbers, payment-only in person flow

## What is new
- Sign up: Online / In person. In person asks "Who is coming?": Just me / A group. A group lists everyone's name + WhatsApp
  (up to the group size limit, 10 to start). One person pays one flat group price.
- In person students (single or group) never see the video course. After sign up they go to the payment page; once you
  confirm the payment they see "You are confirmed, Batch N" and wait for your team to add them to the WhatsApp group.
- Admin > Students: new Batch column, "Group of N" dropdown listing everyone with WhatsApp links + "Copy names and numbers",
  filters for type and batch, search also finds group members, CSV has batch + group members.
- Admin > Settings: online price, in person price, in person GROUP price (whole group), referral %, current batch number,
  most people in one group.
- Landing page shows a third plan: In Person (Group).

## Install (run inside your project folder; Phases 21, 21.1 and 21.2 first)
```
git add -A && git commit -m "before phase 22"
unzip -o ~/Downloads/apextrade-phase22.zip
```
Then run `supabase/migrations/20270401000000_phase22.sql` in the Supabase SQL Editor (New query, paste, Run).
```
npm run build
git add -A
git commit -m "Phase 22: in person groups and batches"
git push
```

## After it is live
1. Admin > Settings: set the group price (starts at D50,000 as a placeholder) and check the current batch number (starts at 1).
2. Sign up a test group, pay (or Clear it in Admin > Students), and look at the dropdown.
