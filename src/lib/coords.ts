/**
 * Parse a single-field "lat,lng" or "lat lng" string into numeric coordinates.
 * Accepts spaces, parentheses and degree marks. Returns null if no two finite
 * numbers can be extracted.
 */
export function parseGps(value: string | undefined | null): { lat: number; lng: number } | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/(-?\d+(?:\.\d+)?)[°\s]*[,;\s][\s°]*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/**
 * Resolve coordinates from a row using either a single GPS field
 * (e.g. "GPS Co-ordinates" / "GPS") or separate Lat/Lng fields.
 */
export function resolveCoords(r: Record<string, unknown>): { lat: number; lng: number } | null {
  const gpsCandidate =
    (r['GPS Co-ordinates'] as string | undefined) ??
    (r['GPS Coordinates'] as string | undefined) ??
    (r['GPS'] as string | undefined) ??
    (r['Coordinates'] as string | undefined) ??
    (r['Coords'] as string | undefined);
  const fromGps = parseGps(gpsCandidate);
  if (fromGps) return fromGps;
  const lat = Number(r['Lat']);
  const lng = Number(r['Lng']);
  if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) return { lat, lng };
  return null;
}
