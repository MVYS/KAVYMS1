import { defineConfig } from 'astro/config';
import AstroPWA from '@vite-pwa/astro';
import Papa from 'papaparse';
import { SHEET_URLS, FALLBACK_SITE_NAME } from './src/config';
import { normalizeSheetUrl } from './src/lib/sheets';

const repoBase = '/KAVYMS1/';

interface SiteContent {
  siteName?: string;
  shortName?: string;
  tagline?: string;
  description?: string;
  themeColor?: string;
  backgroundColor?: string;
  [k: string]: string | undefined;
}

/**
 * Fetch the SiteContent sheet at BUILD time and use it to populate the PWA manifest.
 * This is build-time only — runtime UI text continues to come from `fetchSiteContent()`
 * in the browser. If the URL is empty or the fetch fails, we fall back to safe defaults
 * so the build always succeeds (even offline).
 */
async function loadSiteContent(): Promise<SiteContent> {
  const raw = SHEET_URLS.siteContent;
  if (!raw) {
    console.log('[KAVYMS] SHEET_URLS.siteContent is empty — using fallback PWA manifest values.');
    return {};
  }
  const url = normalizeSheetUrl(raw);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const csv = await res.text();
    const parsed = Papa.parse<{ Key?: string; Value?: string }>(csv, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h: string) => h.trim(),
      transform: (v: string) => (typeof v === 'string' ? v.trim() : v),
    });
    const out: SiteContent = {};
    for (const row of parsed.data) {
      if (!row.Key) continue;
      out[row.Key] = row.Value ?? '';
    }
    console.log(`[KAVYMS] Loaded ${Object.keys(out).length} key(s) from SiteContent for the PWA manifest.`);
    return out;
  } catch (err) {
    console.warn(`[KAVYMS] Could not fetch SiteContent at build time: ${(err as Error).message}. Using fallback PWA manifest values.`);
    return {};
  }
}

const c = await loadSiteContent();

const manifestName = c.siteName || FALLBACK_SITE_NAME;
const manifestShort = c.shortName || 'KAVYMS';
const manifestDesc = c.description || c.tagline || 'A Vasavi Youth community website';
const themeColor = c.themeColor || '#8B1538';
const backgroundColor = c.backgroundColor || '#FFF8EC';

export default defineConfig({
  site: 'https://example.github.io',
  base: repoBase,
  trailingSlash: 'ignore',
  build: {
    assets: 'assets',
  },
  integrations: [
    AstroPWA({
      registerType: 'autoUpdate',
      base: repoBase,
      scope: repoBase,
      manifest: {
        name: manifestName,
        short_name: manifestShort,
        description: manifestDesc,
        theme_color: themeColor,
        background_color: backgroundColor,
        display: 'standalone',
        start_url: repoBase,
        scope: repoBase,
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: repoBase,
        globPatterns: ['**/*.{css,js,html,svg,png,ico,webmanifest}'],
      },
    }),
  ],
});
