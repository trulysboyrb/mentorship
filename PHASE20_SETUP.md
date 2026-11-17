# Phase 20: Prices in the visitor's currency

Needs Phases 14.1 to 19 installed.

## What visitors see
| Visitor | Price shown | Card is charged in | Crypto | Wave |
|---|---|---|---|---|
| In the Gambia | D7,000.00 GMD | Dalasi (as before) | USD (as before) | Yes |
| USA, Ecuador, Liberia ... | $100 | US dollars | USD | Hidden |
| Europe (euro countries) | about €92 | US dollars ($100) | USD | Hidden |
| UK | about £79 | US dollars | USD | Hidden |
| Canada, Australia, Nigeria, Senegal, Japan, India, UAE, Brazil ... (about 50 currencies) | about their own currency | US dollars | USD | Hidden |
| Any country not in the list, or country unknown | US dollars | US dollars | USD | Hidden |

- "about" prices (euro, pound ...) are a guide. The dollar amount is exact: dalasi price divided by **your** dalasi-per-dollar rate
  (Admin > Settings > Crypto price), rounded up to the next cent. The pay page shows it as "Charged in US dollars".
- Landing page, signup, pending page and dashboard show the visitor's currency. The pay page shows the exact dollar amount.
- Visitors can change the currency with the small **Prices in** menu under the prices (landing page and pending page). "Automatic" goes back to country detection.
- Admin pages stay in dalasi. In Admin > Payments a dollar card payment shows "charged $100.00 (US dollars)" under the dalasi amount.
- Students are still cleared against the dalasi price. A dollar payment that is short is flagged "underpaid" like before.

## Admin settings
Admin > Settings > **Currencies**: one switch, "Show prices in the visitor's currency". Off = everyone sees dalasi and cards are charged in dalasi, exactly like before Phase 20.
A preview table shows what a US, euro, UK, Canada, Nigeria and South Africa visitor sees. It needs your dalasi-per-dollar rate to be set.

## Where the exchange rates come from
Approximate prices use free live rates from open.er-api.com, cached for 6 hours. If that service is down, built-in rough rates are used, so a price never goes blank. These rates only change the "about" price.

## IMPORTANT before the demo
1. **Modem Pay must accept US dollar card payments on your account.** The code sends the card payment as USD. I could not test the real Modem Pay.
   If your account does not allow USD, the student sees "Modem Pay could not take a US dollar card payment... please use Crypto or WhatsApp" and nothing is charged.
   Ask Modem Pay to enable USD, or switch the currency switch off. Do one small real test from a VPN before the demo.
2. **Country detection only works on the deployed Vercel site.** Vercel reads the visitor's country from their internet address. On localhost there is no country, so you will see dollars.
3. **Testing with a VPN:** connect to the country, open the live site in a private window. If you previously picked a currency in the "Prices in" menu, set it back to Automatic.
   The Admin > Settings > Currencies page tells you which country your own browser is detected as.

## SQL
Run `supabase/migrations/20270201000000_phase20.sql` once in the Supabase SQL Editor (safe to run twice). It adds two columns to payments (currency, amount_charged), the new switch,
and updates the public settings function so pages know the switch and your dalasi-per-dollar rate (a rate is not a secret).

## After deploy: check
1. Settings > Currencies: switch is on, the preview table shows dollars, euros and pounds.
2. Open the landing page normally (Gambia): dalasi. Through a VPN in the US: dollars. UK: pounds. Germany: euros. A small country not in the list: dollars.
3. As a student in a non-Gambia country: Pending page shows only Card and Crypto, no Wave. Card checkout opens in dollars.
4. Switch the setting off: everyone sees dalasi again.
