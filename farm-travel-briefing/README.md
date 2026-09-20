# Farm Travel Briefing (Mr_rsFarmer)

A travel briefing app for farm visitors. Step 1 of the roadmap: prove we can
pull a live, real transport datapoint from Taiwan's TDX open-data platform.

## What's here so far

- `src/lib/tdx.ts` — server-side helper that authenticates with TDX
  (OAuth2 client-credentials) and caches the access token in memory.
- `src/app/api/tdx/bus-eta/route.ts` — a test API route:
  `GET /api/tdx/bus-eta?city=Taipei&stopName=陽明山` returns live bus ETAs
  for stops whose name contains the given text.
- `src/app/page.tsx` — a simple browser test page with a form so you can
  try the above without needing to use curl or the terminal.

## Setup

1. Install dependencies (only needed once):
   ```bash
   npm install
   ```

2. Add your TDX credentials:
   ```bash
   cp .env.local.example .env.local
   ```
   Then open `.env.local` and paste in your real `TDX_CLIENT_ID` and
   `TDX_CLIENT_SECRET` (from the TDX Member Center → Application Key).

   **Never commit `.env.local`** — it's already in `.gitignore`, so this
   should happen automatically, but always double check before pushing.

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.
   Type a stop name (e.g. `陽明山`, or `台北車站` to sanity-check with a
   busy stop first) and click "Test live TDX call".

   - If it returns a list of routes with ETA minutes: your TDX credentials
     and the whole pipeline are working.
   - If it returns an error mentioning "TDX auth failed": double-check your
     `.env.local` values are correct and saved, then restart `npm run dev`.

## Why start here

Everything else in the plan (weather alerts, multilingual AI briefings,
disruption explanations) depends on this working first: real credentials,
a real API call, a real answer back. Once this round-trip is solid, the
rest is comparatively straightforward plumbing on top of it.

## Next steps (not built yet)

- Map specific farms to their nearest curated bus/rail stop (instead of a
  free-text name search).
- Add CWA weather data (current conditions + forecasts + warnings).
- Add the AI layer that turns verified TDX/CWA data into a multilingual,
  human-readable travel briefing.
