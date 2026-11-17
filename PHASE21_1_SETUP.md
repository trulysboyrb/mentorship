# Phase 21.1: "The Forbes Academy" + logo

- Name is now **The Forbes Academy** everywhere (header, login/signup panel, dashboard, sidebar, legal + contact pages,
  browser tab title, install-as-app name, WhatsApp message, calendar invites, payment title).
- Your seal logo sits next to the name on every page (new `components/BrandLogo.tsx`, image at `public/logo.png`).
- The same logo is the favicon (`app/favicon.ico`, `app/icon.png`), the phone/Apple icon (`app/apple-icon.png`) and the app icons (`public/icons/*`).

## Install (run inside your project folder, the one with package.json)
```
git add -A && git commit -m "before phase 21.1"
unzip -o ~/Downloads/apextrade-phase21-1.zip
sed -i 's/^export const BRAND = "Forbes Academy";/export const BRAND = "The Forbes Academy";/' lib/config.ts
sed -i 's/^export const BUSINESS_NAME = "Forbes Academy";/export const BUSINESS_NAME = "The Forbes Academy";/' lib/legal.ts
grep -n "BRAND =\|BUSINESS_NAME =" lib/config.ts lib/legal.ts
```
Then run `supabase/migrations/20270302000000_phase21_1.sql` in the Supabase SQL Editor.
```
npm run build
git add -A
git commit -m "Phase 21.1: The Forbes Academy + logo"
git push
```
Favicons are cached hard by browsers: if the old icon still shows, hard refresh (Ctrl+Shift+R) or open the site in a private window.
