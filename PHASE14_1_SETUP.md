# Phase 14.1: admin upgrade + a surprise

This zip ALSO contains everything from Phase 14 (landing page, login/signup, profile pictures), so you
can install it whether or not you already installed Phase 14. Overwriting the same files is harmless.

## What is new
### Admin
- Students table: the row of packed buttons is now one **Options** button. Click it for: Clear / Unclear,
  Give certificate, Notes, Devices, Open WhatsApp chat, Delete student. (Arrow keys and Esc work.)
  "Approve certificate" still shows by itself when a student finished and has no certificate yet.
- Students: search box (name, email, WhatsApp), sort (newest, oldest, A-Z, most lessons done),
  "Showing X of Y", **Export CSV** of whatever is on screen, student profile pictures in the list.
- Numbers count up on the Students and Overview cards. Rows slide in. Pop-ups fade in. Each admin page fades in.
- Admin menu stays at the top while you scroll, highlights where you are, and scrolls sideways on phones.
- Clearing a student now fires a small confetti burst.

### The surprise (whole platform)
1. **Quick search (Ctrl+K, or Cmd+K on Mac, or press "/")**: type to jump to any page. For admins it also
   finds a student by name or email and opens the Students page already filtered to them.
   Students can open it from the top right menu ("Quick search"). Admins have a Search button in the admin menu.
2. **Hidden Easter egg:** on any page, with the keyboard, press
   Up Up Down Down Left Right Left Right B A
   -> confetti and the whole site switches to GOLD mode (remembered on that device).
   Enter the code again to switch back. (Not on phones: needs a keyboard.)

## Install (Ubuntu terminal)
cd ~/apextrade-academy
git add -A && git commit -m "before phase 14.1"
unzip -o ~/Downloads/apextrade-phase14-1.zip      # change the path if your zip is somewhere else

### SQL
Only if you have NOT already run it for Phase 14: Supabase -> SQL Editor -> paste
supabase/migrations/20261215000000_phase14_avatars.sql -> Run. Phase 14.1 itself needs no new SQL.

npm run build
git add -A
git commit -m "Phase 14.1: admin Options menu, search/sort/export, quick search, easter egg"
git push

## Check after Vercel deploys
- /admin: click Options on a student, try each item. Clear a pending student -> confetti.
- Search a name, change the sort, click Export CSV (opens fine in Excel/Sheets).
- Press Ctrl+K anywhere, type "pay", Enter. As admin type 2+ letters of a student's name.
- Enter the Konami code (not while typing in a box).

## Honest notes
- Tested: the search matching, the Konami detector, the count-up number parsing and the CSV escaping
  (including spreadsheet-formula protection) with node tests; TypeScript check. No new SQL.
- NOT tested: `next build`, and how any of it looks and feels in a real browser (menu position near the
  bottom of the screen, animations, confetti, gold colours in light mode). Please click through and tell me
  anything that looks off.
- Some hard-coded green spots (a few chart colours) do not change in gold mode.
