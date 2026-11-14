# Phase 21: Forbes Academy (public speaking), trading features removed, purple accent

Needs Phases up to 20 installed. The unzip does not delete files and does not touch `lib/config.ts` / `lib/legal.ts`
(they hold your own WhatsApp number and business details), so there are two extra command blocks below.

## What changed
Brand: ApexTrade Academy -> **Forbes Academy** (header, login/signup panel, dashboard, sidebar, legal pages header, contact page, browser tab title,
installed-app name, calendar files, checkout title, alert email sender name, WhatsApp messages, app icon: new purple "F").
Landing: removed "Trading and blockchain education", removed the practice chart and the scrolling markets banner, headline is now
"Learn Public speaking" with a public speaking description, removed the FAQ "Do I need any trading experience?".
Signup and Login panel: "Learn Public speaking", chart removed.
Student area: live practice chart removed; resources are now **TED Talks** (TradingView and Forex Factory gone); Market tools removed (page, sidebar link, menu link, Ctrl+K item).
Accent: green -> **#6c579e** in dark and light mode (text on purple is white, admin charts, certificate border, confetti, installed-app splash, icon).

### Also changed because the trading wording would have been left behind (tell me if you want any put back)
- Landing: "Practice chart" feature card, "Market tools" in the Online plan, "Trading carries risk..." line under Ready to start, FAQ "Is this financial advice?".
- Signup/Profile: "Trading experience" label is now "Experience". Signup checkbox no longer says "I understand trading involves risk of loss".
- Dashboard greeting fallback "Trader" -> "Student". Certificate PDF now says "public speaking course" and its trading disclaimer line was replaced.
- Settings > Site banner: the colour option "Green" is now called "Purple".

## NOT changed (please decide)
1. **Terms, Privacy and Refund pages** still contain trading text (risk disclaimer about forex and crypto, "trading losses"). They are legal documents, so I did not rewrite them.
2. **Your course content in the database** (modules, lessons, quizzes, announcements, class names) is whatever you entered. Change it in the Admin area.
3. Supabase confirmation emails and the project name, your Vercel project/domain, and the business name inside Modem Pay / NOWPayments dashboards still say ApexTrade if you set them that way.
4. Purple text on the dark theme is a little dim for very small labels (contrast about 3.4 to 1). Buttons are fine. A slightly lighter purple for text only is possible if you want it.

## Install (run inside your project folder)
1. `git add -A && git commit -m "before phase 21"`
2. `unzip -o ~/Downloads/apextrade-phase21.zip`
3. Rename in the two files that were not shipped:
```
sed -i 's/^export const BRAND = "ApexTrade Academy";/export const BRAND = "Forbes Academy";/' lib/config.ts
sed -i 's/^export const BUSINESS_NAME = "ApexTrade Academy";/export const BUSINESS_NAME = "Forbes Academy";/' lib/legal.ts
grep -n "BRAND =\|BUSINESS_NAME =" lib/config.ts lib/legal.ts
```
4. Delete the market tools and chart files:
```
rm -f app/tools/page.tsx
rmdir app/tools
rm -f components/EconomicCalendar.tsx components/RiskCalculator.tsx components/SessionClock.tsx
rm -f components/LiveChart.tsx components/HeroChart.tsx components/Ticker.tsx
rm -f lib/chartInstruments.ts lib/riskCalc.ts
```
5. SQL (Supabase SQL Editor): run `supabase/migrations/20270301000000_phase21.sql`. It changes the business name on the Contact page only if you never changed it yourself.
6. `npm run build`, `git add -A`, `git commit -m "Phase 21: Forbes Academy"`, `git push`.

## After deploy: check
Landing (dark and light), signup, login, student dashboard (resources show TED Talks, no chart), no "Market tools" anywhere, certificate PDF, browser tab name.
If you installed the site as an app on your phone before, remove it and install again to get the new name and icon.
