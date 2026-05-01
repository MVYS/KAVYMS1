import { fetchSheet } from './sheets';
import type { SheetKey } from '../config';
import { renderPlaceCard, type PlaceRow } from './cards';
import { el, showEmpty, showError } from './dom';
import { resolveCoords } from './coords';

// Leaflet is loaded from CDN at runtime — typed loosely to avoid an extra dev dep.
declare const L: any;

export interface DirectoryOptions {
  sheet: SheetKey;
  /** Singular noun, lowercase ("temple", "hostel") — used in empty/loading text */
  noun: string;
}

type Row = PlaceRow & Record<string, string | undefined>;

const HARD_SKIP = new Set([
  'Name', 'Address', 'Phone', 'Email', 'MapsUrl', 'Lat', 'Lng', 'Description',
  'GPS', 'GPS Co-ordinates', 'GPS Coordinates', 'Coords', 'Coordinates',
  // common alternate header spellings
  'Maps Url', 'Lat ', 'Lng ',
]);

/** Headers that we accept as the "name" of a row, in priority order. */
const NAME_HEADERS = ['Name', 'Title', 'Temple Name', 'Hostel Name', 'Place Name', 'Locality'];

/**
 * Map whatever header is being used for the place name onto a canonical `Name` field.
 * Falls back to the first non-empty column if no obvious name header is found.
 */
function normalizeNameColumn(rows: Row[]): { rows: Row[]; nameHeader: string | null; allHeaders: string[] } {
  if (rows.length === 0) return { rows, nameHeader: null, allHeaders: [] };
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const lower = new Map(headers.map((h) => [h.toLowerCase().replace(/[\s_-]/g, ''), h]));

  let chosen: string | undefined;
  for (const candidate of NAME_HEADERS) {
    const key = candidate.toLowerCase().replace(/[\s_-]/g, '');
    const match = lower.get(key);
    if (match) { chosen = match; break; }
  }
  if (!chosen) chosen = headers[0];

  if (chosen === 'Name') return { rows, nameHeader: chosen, allHeaders: headers };

  const mapped = rows.map((r) => ({ ...r, Name: (r as Record<string, string | undefined>)[chosen!] }));
  return { rows: mapped, nameHeader: chosen, allHeaders: headers };
}

const MIN_DISTINCT = 2;
const MAX_DISTINCT = 30;
const MAX_VAL_LEN = 60;

function unique<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

/** Detect which columns are useful as filter dropdowns. */
function detectFilterableColumns(rows: Row[], extraSkip: string[] = []): string[] {
  if (rows.length === 0) return [];
  const skip = new Set<string>([...HARD_SKIP, ...extraSkip]);
  const headers = unique(rows.flatMap((r) => Object.keys(r)));
  return headers.filter((h) => {
    if (skip.has(h)) return false;
    const vals = unique(
      rows.map((r) => String(r[h] ?? '').trim()).filter((v) => v.length > 0)
    );
    if (vals.length < MIN_DISTINCT || vals.length > MAX_DISTINCT) return false;
    if (vals.some((v) => v.startsWith('http') || v.includes('@') || v.length > MAX_VAL_LEN)) return false;
    return true;
  });
}

interface State {
  rows: Row[];
  filterCols: string[];
  filters: Map<string, string>; // column → selected value ('' means all)
  search: string;
  view: 'list' | 'map';
}

export async function mountDirectory(root: HTMLElement, opts: DirectoryOptions): Promise<void> {
  // Shell
  root.innerHTML = '';
  const controls = el('div', { class: 'dir-controls' });
  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = `Search ${opts.noun}s by name, address…`;
  search.className = 'dir-search';
  search.setAttribute('aria-label', 'Search');
  const filtersWrap = el('div', { class: 'dir-filters' });
  const viewToggle = el('div', { class: 'view-toggle', role: 'tablist' });
  const listBtn = document.createElement('button');
  listBtn.type = 'button';
  listBtn.className = 'view-btn active';
  listBtn.dataset.view = 'list';
  listBtn.setAttribute('role', 'tab');
  listBtn.setAttribute('aria-selected', 'true');
  listBtn.textContent = '☰ List';
  const mapBtn = document.createElement('button');
  mapBtn.type = 'button';
  mapBtn.className = 'view-btn';
  mapBtn.dataset.view = 'map';
  mapBtn.setAttribute('role', 'tab');
  mapBtn.setAttribute('aria-selected', 'false');
  mapBtn.textContent = '🗺️ Map';
  viewToggle.append(listBtn, mapBtn);
  controls.append(search, filtersWrap, viewToggle);

  const count = el('div', { class: 'dir-count', 'aria-live': 'polite' });
  const list = el('div', { class: 'grid grid-wide dir-list' });
  const map = el('div', { class: 'dir-map', style: 'display:none' });

  const loadingState = el('div', { class: 'state state-loading' }, `Loading ${opts.noun}s…`);
  root.append(controls, count, loadingState, list, map);

  // Fetch
  let rawRows: Row[];
  try {
    rawRows = await fetchSheet<Row>(opts.sheet);
  } catch (e) {
    loadingState.remove();
    showError(list, e);
    return;
  }
  loadingState.remove();

  const { rows: normalized, nameHeader, allHeaders } = normalizeNameColumn(rawRows);
  const rows = normalized.filter((r) => r.Name && String(r.Name).trim().length > 0);

  if (rawRows.length > 0 && rows.length === 0) {
    list.innerHTML = '';
    const detail = document.createElement('div');
    detail.className = 'state state-error';
    detail.innerHTML = `
      <strong>Sheet loaded but no rows had a usable name.</strong><br>
      Fetched ${rawRows.length} row${rawRows.length === 1 ? '' : 's'} from the ${opts.sheet} sheet.<br>
      Detected headers: <code>${escape(allHeaders.join(', '))}</code><br>
      Looked for a name column in: <code>${NAME_HEADERS.join(', ')}</code> (case-insensitive).<br>
      Add a column named <code>Name</code> (or rename your existing one) and reload.`;
    list.appendChild(detail);
    return;
  }
  if (nameHeader && nameHeader !== 'Name') {
    console.info(`[KAVYMS] Directory(${opts.sheet}): using "${nameHeader}" as the name column.`);
  }

  // If the row's "name" was sourced from a non-Name column (e.g. Locality), skip
  // that column from the filter set too — no point filtering by the title field.
  const skipForFilters = nameHeader && nameHeader !== 'Name' ? [nameHeader] : [];

  const state: State = {
    rows,
    filterCols: detectFilterableColumns(rows, skipForFilters),
    filters: new Map(),
    search: '',
    view: 'list',
  };

  // Build filter dropdowns from detected columns
  for (const col of state.filterCols) {
    const sel = document.createElement('select');
    sel.className = 'dir-select';
    sel.dataset.col = col;
    sel.setAttribute('aria-label', `Filter by ${col}`);
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = `All ${col}`;
    sel.appendChild(allOpt);
    const values = unique(
      rows.map((r) => String(r[col] ?? '').trim()).filter(Boolean)
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    for (const v of values) {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      if (sel.value) state.filters.set(col, sel.value);
      else state.filters.delete(col);
      apply();
    });
    filtersWrap.appendChild(sel);
  }

  if (rows.length === 0) {
    list.innerHTML = '';
    showEmpty(list, `No ${opts.noun}s published yet.`);
  }

  search.addEventListener('input', () => { state.search = search.value.trim().toLowerCase(); apply(); });

  for (const btn of [listBtn, mapBtn]) {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view as 'list' | 'map';
      if (state.view === view) return;
      state.view = view;
      [listBtn, mapBtn].forEach((b) => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      if (view === 'map') {
        list.style.display = 'none';
        map.style.display = 'block';
        renderMap(map, currentlyVisible(state));
      } else {
        map.style.display = 'none';
        list.style.display = '';
      }
    });
  }

  function apply(): void {
    const filtered = currentlyVisible(state);
    count.textContent = filtered.length === rows.length
      ? `${rows.length} ${opts.noun}${rows.length === 1 ? '' : 's'}`
      : `${filtered.length} of ${rows.length} ${opts.noun}${rows.length === 1 ? '' : 's'}`;
    if (state.view === 'list') renderList(list, filtered, opts.noun);
    else renderMap(map, filtered);
  }

  apply();
}

function currentlyVisible(state: State): Row[] {
  return state.rows.filter((r) => {
    for (const [col, val] of state.filters) {
      if (String(r[col] ?? '').trim() !== val) return false;
    }
    if (state.search) {
      const hay = Object.values(r).filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(state.search)) return false;
    }
    return true;
  });
}

function renderList(container: HTMLElement, rows: Row[], noun: string): void {
  container.innerHTML = '';
  if (rows.length === 0) {
    showEmpty(container, `No ${noun}s match your filters.`);
    return;
  }
  for (const r of rows) container.appendChild(renderPlaceCard(r));
}

// === Map (Leaflet) =========================================================

let mapInstance: any = null;

async function ensureLeaflet(): Promise<void> {
  if ((window as any).L) { configureLeafletIcons(); return; }
  if (!document.querySelector('link[data-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
    link.setAttribute('data-leaflet', '');
    document.head.appendChild(link);
  }
  if ((window as any).L) { configureLeafletIcons(); return; }
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load Leaflet from CDN')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.setAttribute('data-leaflet', '');
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Leaflet from CDN'));
    document.head.appendChild(script);
  });
  configureLeafletIcons();
}

let iconsConfigured = false;
function configureLeafletIcons(): void {
  if (iconsConfigured || !(window as any).L) return;
  // Leaflet's default icons use relative paths that fail when loaded from a CDN.
  // Pin them explicitly so markers actually render.
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
  iconsConfigured = true;
}

async function renderMap(container: HTMLElement, rows: Row[]): Promise<void> {
  try {
    await ensureLeaflet();
  } catch (e) {
    showError(container, e);
    return;
  }

  // Fully reset the container — Leaflet leaves DOM behind
  if (mapInstance) {
    try { mapInstance.remove(); } catch { /* ignore */ }
    mapInstance = null;
  }
  container.innerHTML = '';

  const points = rows
    .map((r) => {
      const c = resolveCoords(r as Record<string, unknown>);
      return c ? { row: r, lat: c.lat, lng: c.lng } : null;
    })
    .filter((p): p is { row: Row; lat: number; lng: number } => p !== null);

  if (points.length === 0) {
    const note = document.createElement('div');
    note.className = 'map-empty';
    note.textContent = rows.length === 0
      ? 'No locations match your filters.'
      : 'No locations have valid Lat/Lng — fill those columns in the sheet to see pins on the map.';
    container.appendChild(note);
    return;
  }

  try {
    mapInstance = L.map(container, { scrollWheelZoom: true }).setView([20.5937, 78.9629], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(mapInstance);

    const markerLayer = L.layerGroup().addTo(mapInstance);
    for (const p of points) {
      const marker = L.marker([p.lat, p.lng]).addTo(markerLayer);
      const r = p.row;
      const addr = [r.Address, r.City, r.District, r.State, r.Country, r.Pincode].filter(Boolean).join(', ');
      const directions = r.MapsUrl || `https://www.google.com/maps?q=${p.lat},${p.lng}`;
      const lines: string[] = [];
      lines.push(`<strong style="font-size:1.05rem;color:#8B1538">${escape(r.Name || '')}</strong>`);
      if (r.Locality) lines.push(`<div style="color:#FF6B35;font-weight:600;font-size:.85rem;text-transform:uppercase;letter-spacing:.04em">${escape(r.Locality)}</div>`);
      if (addr) lines.push(`<div style="margin-top:4px">📍 ${escape(addr)}</div>`);
      if (r.Description) lines.push(`<div style="margin-top:4px;color:#5a4a3e">${escape(r.Description)}</div>`);
      if (r.Phone) lines.push(`<div style="margin-top:4px">📞 <a href="tel:${escape((r.Phone || '').replace(/\s+/g, ''))}" class="notranslate" translate="no">${escape(r.Phone)}</a></div>`);
      if (r.Email) lines.push(`<div style="margin-top:2px">📧 <a href="mailto:${escape(r.Email)}" class="notranslate" translate="no">${escape(r.Email)}</a></div>`);
      lines.push(`<div style="margin-top:10px"><a href="${escape(directions)}" target="_blank" rel="noopener" style="display:inline-block;background:linear-gradient(90deg,#FF6B35,#F4A82B);color:#fff;padding:6px 12px;border-radius:999px;text-decoration:none;font-weight:600;font-size:.85rem">Get Directions →</a></div>`);
      marker.bindPopup(lines.join(''), { maxWidth: 280 });
    }

    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });

    // Leaflet needs to re-measure after the container becomes visible
    requestAnimationFrame(() => mapInstance?.invalidateSize());
    setTimeout(() => mapInstance?.invalidateSize(), 250);
  } catch (e) {
    showError(container, e);
  }
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
