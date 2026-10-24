# Phase 13: Live practice chart in the student area

A box under "Lesson notes" and "Resources" with a live candlestick chart. Students switch between
Forex, Metals and oil, Crypto and Indices, pick a timeframe (5m, 15m, 1H, 4H, 1D), draw trend lines and
levels with the tools on the left, and can go full screen. It follows the site's dark/light switch and only
loads when scrolled into view (saves mobile data). Only paid students see it.

No database changes. No new keys. No new packages.

## Install
    cd ~/apextrade-academy
    git add -A && git commit -m "before phase 13"
    unzip -o ~/Downloads/apextrade-phase13.zip
    npm run build
    git add -A && git commit -m "phase 13 live chart" && git push

## Change the instruments
Edit `lib/chartInstruments.ts` (the list at the top). Each line is a label and a TradingView symbol like
`FX:EURUSD`. Students can also type any other symbol inside the chart.

## Honest notes
- The chart is TradingView's free embeddable widget. It needs internet and TradingView must stay reachable.
  Keep the small "TradingView" credit under the chart (their rule for the free widget).
- Some symbols are delayed or may change on TradingView's side. If one shows "symbol not found", fix its
  symbol in `lib/chartInstruments.ts`.
- Not tested here: the chart itself (my sandbox cannot reach TradingView). Tested: the instrument list,
  settings builder and type check. Open a lesson as a paid student and check it loads.
