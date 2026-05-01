/**
 * KAVYMS — central runtime config.
 *
 * Each entry in SHEET_URLS is the "Publish to web → CSV" URL of one Google Sheet
 * tab. To get a URL:
 *   1. Open the sheet
 *   2. File → Share → Publish to web
 *   3. Pick the tab → "Comma-separated values (.csv)" → Publish
 *   4. Copy the URL, paste below.
 *
 * Any URL left empty makes that page render a friendly "configure this sheet"
 * notice rather than crashing.
 */

export type SheetKey =
  | 'siteContent'
  | 'banners'
  | 'team'
  | 'temples'
  | 'hostels'
  | 'achievements'
  | 'schemes'
  | 'roadmap';

export const SHEET_URLS: Record<SheetKey, string> = {
  siteContent:  'https://docs.google.com/spreadsheets/d/1RvpGb7NdC4vrZW0RyEru3yP9JeH310TmW6VTkLMV8YE/edit',
  banners:      'https://docs.google.com/spreadsheets/d/13TPRmOTUcKyJQkJvpErLhpnv65mDfkYA97LwXxX-IvQ/edit',
  team:         'https://docs.google.com/spreadsheets/d/1o7ap8DtkO5SDTEzBp_7hzcW2k1zobTdYWls5coWBeuA/edit',
  temples:      'https://docs.google.com/spreadsheets/d/1L7XH5_A-4hKAaKIjeFTV9-a99_n5Cl1tvIaenK_yE7g/edit',
  hostels:      'https://docs.google.com/spreadsheets/d/1Q6iB7_nhaFGbvzIT7N9bhXEC5oM6_djzugwVOuuhV6I/edit',
  achievements: 'https://docs.google.com/spreadsheets/d/1JkqgQN79pS7oCIcnLMKBzYhQg-oTrWmMm0_bprOxB-U/edit',
  schemes:      'https://docs.google.com/spreadsheets/d/1wkglcllORYWFAM9-C3EigJ03YhiEk61ImUCYFZMLf2Q/edit',
  roadmap:      'https://docs.google.com/spreadsheets/d/1Q9yPiH2tTktC8swQve_bPSebu5XDwirTpVI5fgejaV0/edit',
};

/** Site name shown in the document title before SiteContent loads. */
export const FALLBACK_SITE_NAME = 'KAVYMS — Karnataka AryaVysya Yuvajana Mahasabha';

/** Maximum number of banners shown at once across the site. */
export const MAX_BANNERS = 4;
