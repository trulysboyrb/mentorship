# Phase 17: prices, referral %, payment switches, signups, maintenance

Needs Phases 14.1 and 16 installed first (you already have them if the admin Options menu works).

## What is new (Admin > Settings, at the top)
1. **Prices and referral discount** - Online price, In person price and the referral % are now editable.
   Landing page, sign up page, dashboard, payment pages, WhatsApp message, share text and admin figures all follow.
   Checkout always takes the price from the database on the server. A payment a student already started keeps
   the price it was created with.
2. **Payment buttons** - switches for Wave, Card, Crypto and WhatsApp. Off = students do not see the button AND
   the server refuses it. Payments already made still clear automatically. Shows a warning when a method's secret
   keys are not set up on Vercel.
3. **Signups open** - off = the sign up page says "Signups are closed" and the database refuses new accounts
   (even if someone calls the sign-up API directly). Existing students can still log in.
4. **Maintenance mode** - on = students see their pages (dashboard, classes, tools, quiz, profile, payment pages)
   blurred with "We're Currently On Maintenance, Come Back Soon". Admins are never blocked and see a red reminder
   chip. Login, signup, home and legal pages are never covered, so you can always get in to switch it off.
   Online checkout is also refused while it is on.

## Install (Ubuntu terminal)
cd ~/apextrade-academy
git add -A && git commit -m "before phase 17"
unzip -o ~/Downloads/apextrade-phase17.zip      # change the path if your zip is somewhere else

### SQL (required)
Supabase -> SQL Editor -> New query -> paste the whole file
supabase/migrations/20261230000000_phase17.sql -> Run. It should say "Success".
(It starts every setting at today's values: D7,000 online, D10,000 in person, 5%, everything on, signups open,
maintenance off. Safe to run once; running it twice does not reset your changes.)

npm run build
git add -A
git commit -m "Phase 17: editable prices, payment switches, signups, maintenance mode"
git push

## Check after Vercel deploys
1. /admin/settings: change nothing, the Save prices button is greyed out. Change the online price, Save.
   Open the landing page: the new price shows. Change it back.
2. Turn Wave off: log in as a test student, the Wave button is gone. Turn it back on.
3. Turn Signups off: open /signup in a private window, you see "Signups are closed". Turn it back on.
4. Turn Maintenance on (confirm the pop-up): open the student dashboard in a private window logged in as a student
   -> blurred with the message. You as admin are not blocked. Turn it off: students are released within a minute
   (or at their next click / tab switch).

## Honest notes
- Tested on a scratch Postgres: saving prices / switches, every bad input rejected (0, negative, decimals, 51%,
  unknown keys, injection text), students can not save settings, anonymous visitors can read only the public
  values, and a closed-signups setting really blocks the creation of a new account while an open one works.
- Tested in a real headless Chrome with your real CSS: the maintenance cover (full screen, blurred, page behind
  can not be clicked or scrolled, not shown on login / signup / admin / home / legal pages, admins not blocked,
  disappears when switched off, fits a phone screen) and the Settings screen (exact data sent for each save and
  switch, bad numbers blocked, confirm pop-up for maintenance, errors shown).
- NOT tested: `next build`, and the full app against your live Supabase and payment providers (I can not reach them).
  Please try the 4 checks above.
- If the SQL trigger line fails in the Supabase editor (it adds a block on auth.users), tell me the error text:
  everything else still works and the sign up page still shows the closed message.
- Maintenance is a screen cover, not a lock on the database. Online payments already in progress still clear.
- Estimated manual revenue on Overview / Analytics (students you cleared by hand) is calculated from the CURRENT
  prices, so changing a price changes that estimate. Real online payments are unaffected.
- Not in this phase (from your longer list): Contact Us, certificate template, activity log, alerts.
