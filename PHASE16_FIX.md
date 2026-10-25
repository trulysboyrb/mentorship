# Phase 16 fix: admin Options button

## What was wrong
In 14.1 I added slide-in animations to the table rows and pages. A browser keeps the "end position" of such an
animation, and that made the row (and the whole admin page) the anchor for pop-up things like the Options menu.
The menu was being drawn far below the button / off the screen, and the Delete / Notes / Devices pop-ups were
being placed off-centre. It looked like "nothing happens".

## The fix (one file: app/globals.css)
Entrance animations no longer keep their end position.

## How I checked it
I reproduced the bug in a headless Chrome using your real AdminStudents component and the real compiled CSS
(menu landed 600+ pixels below the button). After the fix, on a desktop window and a phone-size touch screen:
the menu opens right next to the button for the top, middle and bottom rows (flips above the button when low
on the screen), closes with Esc, and the Delete pop-up is centred on the screen. I have not seen it on your
live site, so please tell me if anything is still off.

## Install
cd ~/apextrade-academy
git add -A && git commit -m "before phase 16 fix"
unzip -o ~/Downloads/apextrade-phase16.zip      # change the path if needed
npm run build
git add -A
git commit -m "Phase 16: fix admin Options menu and pop-ups position"
git push
(No SQL.)  After Vercel deploys: hard refresh /admin (Ctrl+Shift+R), click Options on a few students.
