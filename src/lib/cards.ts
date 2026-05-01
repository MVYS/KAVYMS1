import { el, escapeHtml, formatDate } from './dom';
import { toImageUrl } from './drive';
import { resolveCoords } from './coords';

export interface TeamRow {
  Name?: string;
  Role?: string;
  Description?: string;
  'Photo URL'?: string;
  'Current Team'?: string;
  Year?: string;
}

export interface PlaceRow {
  Name?: string;
  Locality?: string;
  Address?: string;
  City?: string;
  District?: string;
  State?: string;
  Country?: string;
  Pincode?: string;
  Phone?: string;
  Email?: string;
  MapsUrl?: string;
  GPS?: string;
  'GPS Co-ordinates'?: string;
  'GPS Coordinates'?: string;
  Lat?: string;
  Lng?: string;
  Description?: string;
  [k: string]: string | undefined;
}

const DIRECTIONS_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M21.71 11.29l-9-9a.996.996 0 0 0-1.41 0l-9 9a.996.996 0 0 0 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 0 0 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z"/></svg>';

export interface AchievementRow {
  Year?: string;
  Date?: string;
  Title?: string;
  Achievement?: string;
  Description?: string;
  PhotoUrl?: string;
}

export interface SchemeRow {
  'Scheme Name'?: string;
  Benefits?: string;
  'Terms and Conditions'?: string;
  ExpiryDate?: string;
  ApplyLink?: string;
}

export interface RoadmapRow {
  Year?: string;
  Date?: string;
  Roadmap?: string;
  Description?: string;
  PhotoUrl?: string;
}

function imgOrPlaceholder(url: string | undefined, alt: string, classes = 'card-photo'): HTMLElement {
  const src = toImageUrl(url);
  if (!src) {
    return el('div', { class: classes, style: 'display:flex;align-items:center;justify-content:center;color:#b8a08e;font-size:2.5rem' }, '🌸');
  }
  return el('img', { class: classes, src, alt, loading: 'lazy', referrerpolicy: 'no-referrer' });
}

export function renderTeamCard(r: TeamRow): HTMLElement {
  return el(
    'article',
    { class: 'card team-card' },
    imgOrPlaceholder(r['Photo URL'], r.Name || 'Team member', 'card-photo'),
    el(
      'div',
      { class: 'card-body' },
      el('h3', { class: 'card-title' }, r.Name || ''),
      r.Role ? el('div', { class: 'card-sub' }, r.Role) : null,
      r.Description ? el('p', { class: 'card-text' }, r.Description) : null,
      r.Year ? el('span', { class: 'tag' }, `Year: ${r.Year}`) : null
    )
  );
}

export function renderPlaceCard(r: PlaceRow): HTMLElement {
  const title = (r.Name || '').trim();
  const sub = r.Locality && r.Locality.trim() !== title ? r.Locality.trim() : '';
  const addressParts = [r.Address, r.City, r.District, r.State, r.Country, r.Pincode]
    .map((v) => (v ? v.trim() : ''))
    .filter((v) => v && v !== title && v !== sub)
    .join(', ');

  const coords = resolveCoords(r as Record<string, unknown>);
  const directionsHref = r.MapsUrl
    ? r.MapsUrl
    : coords
      ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}`
      : addressParts
        ? `https://www.google.com/maps/search/${encodeURIComponent(addressParts)}`
        : '';

  const body = el(
    'div',
    { class: 'card-body' },
    el('h3', { class: 'card-title' }, title),
    sub ? el('div', { class: 'card-sub' }, sub) : null,
    addressParts ? el('p', { class: 'card-text' }, `📍 ${addressParts}`) : null,
    r.Description ? el('p', { class: 'card-text' }, r.Description) : null,
    el(
      'div',
      { class: 'card-meta' },
      r.Phone ? el('a', { href: `tel:${r.Phone.replace(/\s+/g, '')}` }, `📞 ${r.Phone}`) : null,
      r.Email ? el('a', { href: `mailto:${r.Email}` }, `📧 ${r.Email}`) : null
    ),
    directionsHref
      ? el('a', {
          class: 'btn btn-icon',
          href: directionsHref,
          target: '_blank',
          rel: 'noopener',
          title: 'Get Directions',
          'aria-label': 'Get Directions',
          html: DIRECTIONS_ICON,
        })
      : null
  );

  let media: HTMLElement;
  if (coords) {
    media = el('iframe', {
      class: 'map-frame',
      loading: 'lazy',
      src: `https://www.google.com/maps?q=${coords.lat},${coords.lng}&hl=en&z=15&output=embed`,
      title: `Map of ${title || 'location'}`,
    });
  } else {
    media = el('div', { class: 'card-photo', style: 'display:flex;align-items:center;justify-content:center;color:#b8a08e;font-size:3rem' }, '🛕');
  }

  return el('article', { class: 'card' }, media, body);
}

export function renderAchievementCard(r: AchievementRow): HTMLElement {
  return el(
    'article',
    { class: 'card' },
    imgOrPlaceholder(r.PhotoUrl, r.Title || 'Achievement'),
    el(
      'div',
      { class: 'card-body' },
      el('h3', { class: 'card-title' }, r.Title || ''),
      r.Achievement ? el('div', { class: 'card-sub' }, r.Achievement) : null,
      r.Date ? el('div', { style: 'font-size:.85rem;color:var(--color-text-soft)' }, `📅 ${formatDate(r.Date)}`) : null,
      r.Description ? el('p', { class: 'card-text' }, r.Description) : null
    )
  );
}

export function renderSchemeCard(r: SchemeRow): HTMLElement {
  const card = el('article', { class: 'card' });
  const body = el(
    'div',
    { class: 'card-body' },
    el('h3', { class: 'card-title' }, r['Scheme Name'] || '')
  );
  if (r.Benefits) {
    body.appendChild(el('p', { class: 'card-text' }, el('strong', {}, 'Benefits: '), r.Benefits));
  }
  if (r['Terms and Conditions']) {
    const details = el('details', { style: 'margin-top:8px' });
    details.appendChild(el('summary', { style: 'cursor:pointer;color:var(--color-maroon);font-weight:600' }, 'Terms & Conditions'));
    details.appendChild(el('p', { class: 'card-text', style: 'margin-top:8px' }, r['Terms and Conditions']));
    body.appendChild(details);
  }
  if (r.ExpiryDate) {
    body.appendChild(el('div', { style: 'font-size:.85rem;color:var(--color-text-soft);margin-top:6px' }, `⏳ Apply before ${formatDate(r.ExpiryDate)}`));
  }
  if (r.ApplyLink) {
    body.appendChild(el('a', { class: 'btn', href: r.ApplyLink, target: '_blank', rel: 'noopener', style: 'margin-top:12px;align-self:flex-start' }, 'Apply Now →'));
  }
  card.appendChild(body);
  return card;
}

export function renderRoadmapCard(r: RoadmapRow): HTMLElement {
  return el(
    'article',
    { class: 'card' },
    imgOrPlaceholder(r.PhotoUrl, r.Roadmap || 'Roadmap item'),
    el(
      'div',
      { class: 'card-body' },
      el('h3', { class: 'card-title' }, r.Roadmap || ''),
      r.Date ? el('div', { class: 'card-sub' }, formatDate(r.Date)) : null,
      r.Description ? el('p', { class: 'card-text' }, r.Description) : null
    )
  );
}

/** Group rows by a key field, returning [groupKey, rows[]] sorted desc by group key. */
export function groupByDesc<T>(rows: T[], key: (r: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r) || '—';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0], undefined, { numeric: true }));
}

export function groupByAsc<T>(rows: T[], key: (r: T) => string): [string, T[]][] {
  return groupByDesc(rows, key).reverse();
}
