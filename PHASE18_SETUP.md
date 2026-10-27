# Phase 18: Site banner + Contact Us

Needs Phases 14.1, 16 and 17 already installed (it builds on the Phase 17 settings).

## What you get
1. **Site banner** (Admin > Settings > Site banner). One message, shown at the top of every student page
   (lessons, classes, tools, quiz, profile, payment pages). Three colours: neutral, green, red. Students can not
   close it. It is not shown on login, signup, the landing page, legal pages or the admin area. It updates by
   itself when students change page, return to the tab, or within 2 minutes.
2. **Contact Us** (Admin > Settings > Contact details, public page `/contact`, a Contact Us section on the landing page,
   a "Contact" link in the footer links, and Ctrl+K). Business name, WhatsApp number, support email, opening hours.
   The Contact page has a **send mail template**: the visitor picks a topic (payment problem, can't open course,
   certificate, technical, referral/payout, question before joining, other), the message is written for them
   (name and email are filled in if they are logged in), they can edit it and send it with **Open in my mail app**,
   **Open in Gmail**, **Send on WhatsApp** or **Copy message**. Nothing is sent from your server.
3. The WhatsApp number you save in Settings is now used by every WhatsApp button on the site (payment page, pending page,
   dashboard, device limit page, payment return page). If you leave it empty the number in `lib/config.ts` is still used.

## Install
See the commands in the chat message. In short: back up with git, unzip over the project, run the SQL file
`supabase/migrations/20270110000000_phase18.sql` once in the Supabase SQL Editor, `npm run build`, commit, push.

## After deploy: check
- Admin > Settings: fill in the banner, tick Show the banner, Save. Open a student page: the banner is at the top.
- Settings > Contact details: enter your WhatsApp number (digits only, with 220) and email, Save. Open `/contact`.
- On `/contact` choose a topic and press each button once. "Open in my mail app" needs a mail app set up on the device.
- Turn the banner off again when the news is old.

## Notes
- The SQL replaces `site_status()` and `admin_save_site_settings()` with versions that keep all Phase 17 settings and add the new ones.
  It is safe to run twice.
- The contact email, WhatsApp number, business name and hours are public on purpose (they are shown on the Contact page).
- If the SQL has not been run, the site keeps working: no banner and the old WhatsApp number are used.
