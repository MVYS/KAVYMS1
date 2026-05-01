import Papa from 'papaparse';
import { SHEET_URLS, type SheetKey } from '../config';

const cache = new Map<SheetKey, Promise<unknown>>();

/**
 * Normalize any Google Sheets URL to a CSV-returning endpoint that the browser
 * can fetch without CORS errors.
 *
 *   - published CSV  (`.../pub?...output=csv`)              → unchanged (CORS OK)
 *   - gviz CSV       (`.../gviz/tq?tqx=out:csv...`)         → unchanged (CORS OK)
 *   - editor URL     (`.../edit?gid=N#gid=N`)               → converted to gviz CSV
 *   - export CSV     (`.../export?format=csv...`)           → converted to gviz CSV
 *                                                              (the export endpoint
 *                                                              works server-side but
 *                                                              is CORS-blocked in browsers)
 *   - any non-Google URL                                    → unchanged
 *
 * The gviz endpoint is the same one Google Charts uses; it supports CORS and works
 * for any sheet shared as "Anyone with the link → Viewer".
 */
export function normalizeSheetUrl(url: string): string {
  if (!url) return url;
  if (url.includes('output=csv') || url.includes('tqx=out:csv')) return url;

  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return url;
  const id = m[1];

  // Find the gid in either the query string or the URL fragment.
  let gid: string | undefined;
  const qMatch = url.match(/[?&]gid=([0-9]+)/);
  if (qMatch) gid = qMatch[1];
  if (!gid) {
    const hMatch = url.match(/#gid=([0-9]+)/);
    if (hMatch) gid = hMatch[1];
  }

  const base = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv`;
  return gid ? `${base}&gid=${gid}` : base;
}

async function fetchAndParse<T>(rawUrl: string): Promise<T[]> {
  const url = normalizeSheetUrl(rawUrl);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet (${res.status} ${res.statusText}). Make sure the sheet is shared as "Anyone with the link can view".`);
  }
  const csv = await res.text();
  const parsed = Papa.parse<T>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
    transform: (v) => (typeof v === 'string' ? v.trim() : v),
  });
  return parsed.data.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    return Object.values(row as Record<string, unknown>).some(
      (v) => v !== null && v !== undefined && String(v).length > 0
    );
  });
}

export async function fetchSheet<T>(key: SheetKey): Promise<T[]> {
  const url = SHEET_URLS[key];
  if (!url) {
    throw new Error(`SHEET_URLS.${key} is empty in src/config.ts. Paste the published CSV URL of the ${key} sheet.`);
  }
  const cached = cache.get(key);
  if (cached) return cached as Promise<T[]>;
  const promise = fetchAndParse<T>(url);
  cache.set(key, promise);
  try {
    return await promise;
  } catch (e) {
    cache.delete(key);
    throw e;
  }
}

/** SiteContent is key/value — return a flat record. */
export async function fetchSiteContent(): Promise<Record<string, string>> {
  type Row = { Key?: string; Value?: string };
  const rows = await fetchSheet<Row>('siteContent');
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (r.Key) out[r.Key] = r.Value ?? '';
  }
  return out;
}
