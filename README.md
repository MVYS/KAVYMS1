# KAVYMS — Vasavi Youth Community Website

A static, mobile-first community site built with [Astro](https://astro.build) and hosted on GitHub Pages. **All content is editable in Google Sheets at runtime — no redeploy needed.**

`Website managed by Team MVYS`

---

## Architecture in one paragraph

The site is fully static. Every data sheet's "Publish to web → CSV" URL is listed in [`src/config.ts`](src/config.ts) under `SHEET_URLS`. At page load, the browser fetches the relevant CSV(s) for that page and renders cards client-side. To swap a sheet, edit `src/config.ts` and push — content edits inside the sheets need no commit at all.

---

## 1 · Local development

```bash
npm install
npm run dev          # http://localhost:4321/KAVYMS1/
npm run build        # outputs to ./dist
npm run preview      # preview production build locally
```

Without a registry URL the site still loads — every page shows a friendly "Configure the sheet registry" message instead of crashing.

---

## 2 · Create the Google Sheets

Create **8 sheets** (one per data type). For each one:

1. **Share** as `Anyone with the link → Viewer` (`Share → General access → Anyone with the link → Viewer`).
2. Copy the URL from the address bar — even the regular `…/edit?gid=…#gid=…` URL works. The site automatically rewrites it to the CSV-returning `export?format=csv&gid=…` endpoint at fetch time. (Using "File → Publish to web → CSV" also works — the published URL is accepted as-is.)

### a) Data sheet schemas

| Sheet | Columns |
|-------|---------|
| `SiteContent` | `Key`, `Value` — see suggested keys below |
| `Banners` | `Message`, `Order`, `Dismiss`, `Expiry` |
| `Team` | `Name`, `Role`, `Description`, `Photo URL`, `Current Team`, `Year` |
| `Temples` | `Country`, `State`, `District`, `Locality`, `Address`, `GPS Co-ordinates` (single field, `lat,lng`). Optional: `Name` (otherwise the card uses Locality as the title), `City`, `Pincode`, `Phone`, `Email`, `MapsUrl`, `Description`. |
| `Hostels` | (same as Temples) |
| `Achievements` | `Year`, `Date`, `Title`, `Achievement`, `Description`, `PhotoUrl` |
| `Schemes` | `Scheme Name`, `Benefits`, `Terms and Conditions`, `ExpiryDate`, `ApplyLink` |
| `Roadmap` | `Year`, `Date`, `Roadmap`, `Description`, `PhotoUrl` |

> The **Contact page** does not have its own sheet. It renders directly from the `SiteContent` sheet (`primaryPhone`, `primaryEmail`, `address`, `addressMapsUrl`, plus the `*Url` social keys).

### b) Suggested `SiteContent` keys

| Key                | Value example                                  | Where used |
| ------------------ | ---------------------------------------------- | ---------- |
| `siteName`         | KAVYMS — Vasavi Youth                          | hero pill (fallback), **PWA manifest `name`** |
| `shortName`        | KAVYMS                                         | **PWA manifest `short_name`** (home-screen icon label) |
| `fullForm`         | (full form of KAVYMS)                          | hero pill |
| `mvysFullForm`     | (full form of MVYS)                            | reserved |
| `tagline`          | Connecting our community.                      | hero subtitle, **PWA description fallback** |
| `description`      | KAVYMS Vasavi Youth community website          | **PWA manifest `description`** |
| `themeColor`       | `#8B1538`                                      | **PWA manifest `theme_color`** |
| `backgroundColor`  | `#FFF8EC`                                      | **PWA manifest `background_color`** |
| `heroTitle`        | Welcome to KAVYMS                              | homepage `<h1>` |
| `heroSubtitle`     | A community of Vasavi youth across the nation. | homepage lead |
| `aboutUs`          | (long paragraph)                               | homepage About block |
| `facebookUrl`      | https://facebook.com/...                       | header + footer social |
| `instagramUrl`     | https://instagram.com/...                      | header + footer social |
| `youtubeUrl`       | https://youtube.com/...                        | header + footer social |
| `whatsappUrl`      | https://wa.me/91XXXXXXXXXX                     | header + footer social |
| `twitterUrl`       | https://twitter.com/...                        | header + footer social |
| `primaryEmail`     | hello@kavyms.org                               | footer + Contact page |
| `primaryPhone`     | +91 9XX XXX XXXX                               | footer + Contact page (clickable) |
| `address`          | Hyderabad, Telangana                           | footer + Contact page |
| `addressMapsUrl`   | https://maps.google.com/...                    | optional — Contact page address link (defaults to a Maps search of `address`) |

**Build-time vs runtime**

- **Runtime (browser)** keys — anything used in the live UI (hero, footer, socials, …) — are fetched on page load. Edit the sheet, refresh the browser, see the change.
- **Build-time** keys — `siteName`, `shortName`, `description`, `themeColor`, `backgroundColor` — are also fetched, but at `astro build` time, to populate the **PWA manifest** ([astro.config.ts](astro.config.ts)). The manifest is baked into `dist/` and served as a static file, so changing these requires a redeploy. If the SiteContent URL is empty or unreachable, the build falls back to safe defaults and continues.

### c) Behaviour notes

- **Banners**: Active = (`Expiry` blank OR `Expiry` ≥ today). Sorted by `Order` ascending. Top 4 shown. Set `Dismiss` to `TRUE` to give the banner a ✕ button (dismissals remembered in browser).
- **Team** vs **Past Team**: One sheet drives both. `Current Team = TRUE` → Team page. Otherwise → Past Team page (grouped by `Year`).
- **Schemes**: Rows with `ExpiryDate < today` are hidden automatically.
- **Photo URLs**: Paste Google Drive share links — they are auto-converted to direct image URLs at render time. Direct image URLs (Imgur, Cloudinary, etc.) also work.
- **Temples / Hostels filters**: Filter dropdowns (`Country`, `State`, `City`, …) are **auto-generated from your sheet's columns**. Add any new categorical column (e.g. `Type`, `Region`) and it shows up as a filter on next reload — no code change. Long-text columns and contact columns (`Phone`, `Email`, `Address`, `Description`, `Lat`, `Lng`, `MapsUrl`, `Pincode`) are intentionally excluded.
- **Map view (Temples / Hostels)**: Pins come from `Lat` + `Lng`. Rows missing coords don't appear on the map but still appear in the list view.
- **Sheet sharing**: Each sheet must be **shared as "Anyone with the link can view"** (`Share → General access → Anyone with the link → Viewer`). The site auto-converts a `/edit?gid=N` URL into a `/export?format=csv&gid=N` URL at fetch time, so there's no need to use "Publish to web" — sharing is enough.

---

## 3 · Connect the sheets to the site

Open [`src/config.ts`](src/config.ts) and paste each published-CSV URL into the matching slot:

```ts
export const SHEET_URLS: Record<SheetKey, string> = {
  siteContent:  'https://docs.google.com/spreadsheets/d/e/.../pub?gid=...&output=csv',
  banners:      'https://...',
  team:         'https://...',
  temples:      'https://...',
  hostels:      'https://...',
  achievements: 'https://...',
  schemes:      'https://...',
  roadmap:      'https://...',
};
```

Any URL left empty makes that one page show a "configure this sheet" notice — the rest of the site keeps working. Content edits inside each sheet need no code change at all; only swapping a sheet to a different URL does.

---

## 4 · Deploy to GitHub Pages

### One-time GitHub setup

1. **Settings → Pages → Source =** `GitHub Actions`
2. **Settings → Actions → General → Workflow permissions =** `Read and write`

### Push to `main`

The workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs on every push to `main` (and can be triggered manually). It builds the site with Node 20 and publishes `dist/` via the official `actions/deploy-pages@v4` flow.

Live URL after the first successful run: `https://<your-user>.github.io/KAVYMS1/`

### Custom domain (later)

1. Add `public/CNAME` containing your domain (e.g. `kavyms.org`).
2. In `astro.config.mjs`, change `site` to `https://kavyms.org` and `base` to `/`.
3. **Settings → Pages → Custom domain** → set the domain → enable **Enforce HTTPS**.

No workflow changes required.

---

## 5 · Replace placeholder assets

Drop the real assets into `public/` (overwriting the placeholders):

| File | Purpose |
|------|---------|
| `public/logo.svg` | Header logo (or replace with `logo.png` and update `src/components/Header.astro`) |
| `public/background.svg` | Vasavi Devi background watermark (or replace with `background.jpg` and update `src/styles/global.css`) |
| `public/favicon.svg` | Browser tab icon |
| `public/icons/icon.svg` | PWA install icon |

---

## 6 · Tech stack

- **Astro 5** — static site generator
- **PapaParse** — CSV parser for Google Sheets
- **@vite-pwa/astro** — installable PWA (works offline)
- **Google Translate widget** — runtime English → Telugu / Kannada / Hindi switcher

---

## File map

```
src/
├── config.ts                       # SHEET_URLS — one URL per data sheet
├── lib/
│   ├── sheets.ts                   # fetchSheet<T>(key) — used by every page
│   ├── drive.ts                    # Google Drive URL → direct image URL
│   ├── banner-store.ts             # Banner dismiss memory (localStorage)
│   ├── cards.ts                    # All card render functions
│   └── dom.ts                      # Tiny DOM/string helpers
├── styles/global.css               # Palette, layout, components
├── layouts/Base.astro              # Site shell
├── components/
│   ├── Header.astro                # Logo + responsive nav with dropdowns
│   ├── Footer.astro                # Quick links + socials + contact + watermark
│   ├── Banner.astro                # Banner stack (top of every page)
│   ├── BackgroundWatermark.astro   # Soft Vasavi Devi watermark
│   └── TranslateWidget.astro       # Language switcher
└── pages/                          # One file per route
    ├── index.astro
    ├── team.astro
    ├── past-team.astro
    ├── achievements.astro
    ├── schemes.astro
    ├── roadmap.astro
    ├── temples.astro
    ├── hostels.astro
    └── contact.astro
```
