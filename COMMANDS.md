# ApexTrade Academy: Command Cheat Sheet

## Every working session (the routine)
1. Open a terminal (Ctrl + Alt + T)
2. Go to the project:        cd ~/apextrade-academy
3. Start the site:           npm run dev      -> open http://localhost:3000
4. Make your changes, save, check them in the browser
5. Stop the site:            Ctrl + C
6. Check nothing is broken:  npm run build
7. Save and upload:          git add .
                             git commit -m "what I changed"
                             git push
   (If Vercel is connected to GitHub, step 7 also deploys the site.)

## Project basics
cd ~/apextrade-academy        go to the project folder
pwd                           show which folder I am in
ls                            list files   (ls -a shows hidden ones like .env.local)
code .                        open the project in VS Code (if installed)
npm install                   install the project's packages (run after unzipping/pulling)
npm install PACKAGE-NAME      add a new package to the project (e.g. npm install pdf-lib)
npm run dev                   start the site locally (localhost:3000)
npm run build                 test a production build: finds errors BEFORE deploying
Ctrl + C                      stop whatever is running in the terminal
rm -rf .next                  clear Next.js cache (fixes weird stale-page problems)
rm -rf node_modules && npm install     full reinstall if packages seem broken
npx kill-port 3000            free port 3000 if "port already in use"

## Adding files from a zip I received
cd ~/apextrade-academy
git add . && git commit -m "Before update"       (so I can undo if needed)
unzip -o ~/FILE-NAME.zip                         (-o = overwrite existing files)
npx supabase db push                             (only if the update has a new database file)
npm run dev

## Git (saving and uploading code)
git status                    what has changed
git diff                      see the exact changes
git add .                     stage everything
git commit -m "message"       save a snapshot with a note
git push                      upload to GitHub
git pull                      download the latest from GitHub
git log --oneline             history of saves
git restore FILE              throw away unsaved changes in ONE file
git restore .                 throw away ALL unsaved changes (careful!)
git checkout COMMIT_ID        look at an old version (git checkout main to come back)

## Supabase (database)
npx supabase login                               log in (once per computer)
npx supabase link --project-ref YOUR_REF         connect to my project (once)
npx supabase db push                             send new database changes (migrations) live
npx supabase migration new what_it_does          create a new empty migration file
npx supabase migration list                      which migrations are applied

Dashboard: Table Editor = view data, SQL Editor = run SQL, Storage = files,
Authentication = users + settings.

## Vercel (deploying)
vercel login                  log in (once)
vercel                        deploy a preview
vercel --prod                 deploy to the live site
vercel env pull .env.local    download env variables from Vercel

## Useful SQL (Supabase SQL Editor)
-- Make someone an admin
update public.profiles set role = 'admin' where email = 'name@example.com';

-- Clear a student manually
update public.profiles set payment_status = 'cleared' where email = 'name@example.com';

-- See all students
select full_name, email, payment_status, role from public.profiles order by created_at desc;

## Editing a file in the terminal (nano)
nano FILE                     open a file
Ctrl + O, Enter               save
Ctrl + X                      exit
Ctrl + K                      cut a line
Ctrl + W                      search
Ctrl + Shift + V              paste

## Linux basics
cd ..                         go up one folder
mkdir -p app/newpage          make a folder
cp a b                        copy a file
mv a b                        move or rename
rm FILE                       delete a file (no recycle bin!)
cat FILE                      print a file
grep -rn "text" app           find text inside files

## Where things live
app/                    pages (each folder = a web address)
app/admin/              admin pages
app/dashboard/          student area
components/             reusable pieces (buttons, forms, sidebar)
lib/config.ts           brand name + WhatsApp number
lib/legal.ts            contact email, refund days, draft notice
lib/pricing.ts          course prices (D7,000 / D10,000) and the 5% discount
app/tools/              market tools (sessions, calculator, calendar)
app/admin/analytics/    analytics page
app/admin/settings/     devices-per-student setting
public/sw.js            tiny service worker for the installable app
lib/landing.ts          landing page text: steps, FAQ, testimonials (add real ones)
app/classes/            live classes (student)   app/admin/classes/  (admin)
app/quiz/               module quizzes (student) app/admin/quizzes/  (admin)
app/admin/notes/        upload notes and files   app/admin/payouts/  payout requests
lib/supabase/           connection to Supabase
supabase/migrations/    database changes, in order
.env.local              secret keys (NEVER upload or share)
app/globals.css         colours, fonts, corner roundness

## Phase 8 quick tests
Install test: npm run build && npm run start, open http://localhost:3000 in Chrome
   (the app only registers its service worker in a production build)
Device limit test: log in as a paid student in Chrome, then Firefox, then a
   private window -> the 3rd one lands on /device-limit (when limit is 2)

## Phase 9 quick tests
SQL: paste supabase/migrations/20261020000000_phase9.sql into Supabase SQL Editor, run ONCE
Quiz: Admin > Quizzes > pick a module > add 2 questions; as a paid student finish the
   module's lessons, then the "Module quiz" row appears in the sidebar
Payout: Admin > Settings > set reward; clear a student who joined with a code;
   the referrer's Profile shows Earned; press Request payout; Admin shows a red alert
Theme: account menu (top right) > Light mode / Dark mode

## When something breaks
1. Read the error in the terminal: the first lines usually say which file
2. The browser console (F12) shows errors from the page
3. "Failed to fetch" / "Invalid path": check .env.local, restart npm run dev
4. A page looks stale: rm -rf .next then npm run dev
5. Undo my last edit: git restore FILE
