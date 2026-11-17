# Phase 14: landing page, login/signup, profile pictures

## What is new
1. Landing page: animated hero (headline word changes, chart draws itself), scrolling market ticker,
   "What you get" cards, sections that fade in as you scroll, sticky top bar. Respects "reduce motion".
2. Login and Sign up: split screen with a brand panel on desktop, Show/Hide password, loading spinners.
   Sign up is now 2 steps (Account, then Your details) with a password strength bar.
   The reset-password page also gets Show/Hide.
3. Profile pictures: Profile page -> "Add photo". The picture shows in the top right circle on the
   dashboard, classes, tools, quiz and profile pages. No picture = the first letter like before.

## Install (Ubuntu terminal)
cd ~/apextrade-academy
git add -A && git commit -m "before phase 14"
unzip -o ~/Downloads/apextrade-phase14.zip      # change the path if your zip is somewhere else

### SQL (needed for profile pictures)
Supabase -> SQL Editor -> New query -> paste the whole file
supabase/migrations/20261215000000_phase14_avatars.sql -> Run. It should say "Success".

npm run build
git add -A
git commit -m "Phase 14: landing page, login/signup upgrade, profile pictures"
git push

## Check after Vercel finishes deploying
- Landing page (logged out): hero animates, words rotate, sections fade in while scrolling.
- Sign up: step 1 -> Continue -> step 2 -> Create account. Wrong email format or short password is caught on step 1.
- Log in, open Profile -> Add photo -> pick a picture. The top right circle shows it. Reload: still there.
- Remove -> back to the letter.
- Try the same on your phone.

## Honest notes
- Tested: the SQL on a scratch Postgres (own-folder only upload, cannot point at someone else's folder,
  path tricks rejected, anonymous blocked, remove works); the helper code with node tests; TypeScript check.
- NOT tested: `next build` and how the pages look and animate in a real browser (I cannot run a browser
  here). Look at the landing page, signup and profile on desktop and phone and tell me anything that looks off.
- Pictures are in a PUBLIC bucket so the top bar can show them. Anyone with the exact link can see a picture;
  links contain a long random-looking id and are not listed anywhere.
- The browser shrinks the photo to 256x256 before uploading. iPhone HEIC photos usually convert when picked
  from the photo library; if one cannot be read the student sees a message and can pick another.
- The hero chart is a decorative illustration (labelled), not real market data. The ticker shows names only.
- Multiple courses (the earlier Phase 14 plan) is parked, not included in this zip.
