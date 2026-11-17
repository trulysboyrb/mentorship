# Phase 12: YouTube (unlisted) videos

## Install
    cd ~/apextrade-academy
    git add -A && git commit -m "before phase 12"
    unzip -o ~/Downloads/apextrade-phase12.zip
    # Supabase > SQL Editor > run supabase/migrations/20261120000000_phase12.sql ONCE
    npm run build
    git add -A && git commit -m "phase 12 youtube videos" && git push

## 1. Upload to YouTube (the right way)
1. Create a YouTube channel for the academy (youtube.com > profile picture > Create a channel).
2. Verify your phone number (youtube.com/verify). Without it, videos are limited to 15 minutes.
3. Click Create > Upload videos. For EACH video set:
   - Audience: **No, it's not made for kids**
   - Visibility: **Unlisted**  (NOT Private: private videos will not play for students. NOT Public.)
   - Open "Show more" and make sure **Allow embedding** is ticked.
4. Do not turn on monetisation (it would show ads to your students).
5. Open the video, click Share, copy the link.

## 2. Add the video on the site
Admin > Courses > open a lesson > "YouTube video": paste the link, press **Save YouTube video**.
The site reads the video length by itself. If it cannot, type the length (like 12:34) and save again.
A lesson showing "YouTube · needs length" blocks students from progressing until the length is set.

## 3. Many videos at once
Admin > Courses > under a module > "Add many lessons from YouTube links". One lesson per line:
    What is a pip? | https://youtu.be/xxxxxxxxxxx
    https://youtu.be/yyyyyyyyyyy
Lessons are added at the end of the module, in order. If you leave out the title, it is read from YouTube.

## What stays the same
Paywall, sequential unlocking, quizzes, watch-time tracking and "skipping ahead does not count" all work
for YouTube lessons too. Old uploaded-file lessons keep working.

## Honest limits
- The link is only shown to paid students who unlocked that lesson. But an unlisted link can be shared by a
  student who has it, and anyone with the link can watch it on YouTube. This cannot be fully prevented.
  If piracy becomes a problem, the next step is a protected video host (Bunny Stream): ask for it.
- YouTube may show its own suggested videos at the end of a video (limited to your channel).
- Tested here: link reading, length reading, bulk parsing, database rules. NOT tested here: the player and the
  "read length" feature inside a real browser (they need YouTube, which my sandbox cannot reach).
  Test one lesson first, and watch it until the progress bar fills.
