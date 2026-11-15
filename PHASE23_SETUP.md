# Phase 23

- Login: "Keep me signed in" (ticked by default) sits left of "Forgot password?". Placeholders are now "you@example.com" and "Your password".
  Unticked = the login ends when the browser is fully closed. Ticked = it lasts like before.
- Sign up: the WhatsApp field is a country-code picker ("NG +234") beside the number box. Gambia (+220) is the default;
  picking another code also updates the Country field. The same picker is used for each person in a group.
  Numbers are saved with their code, e.g. +2348030000000 (a leading 0 is dropped).
- Landing page and the login/signup side panel say "Public Speaking".

No SQL this time.

## Install (run inside your project folder; Phase 22 first)
```
git add -A && git commit -m "before phase 23"
unzip -o ~/Downloads/apextrade-phase23.zip
npm run build
git add -A
git commit -m "Phase 23: login, phone input, title"
git push
```
