/** Minimal DOM helpers used by client-side renderers. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | boolean | number | null | undefined> = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'html') node.innerHTML = String(v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Convert sheet truthy values: "TRUE", "yes", "1", true → true. */
export function isTruthy(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === 'number') return v !== 0;
  if (typeof v !== 'string') return false;
  const s = v.trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1';
}

/** Parse a date column. Returns null on blank/invalid. */
export function parseDate(v: unknown): Date | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatDate(v: unknown): string {
  const d = parseDate(v);
  if (!d) return String(v ?? '');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function showError(container: HTMLElement, err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  container.innerHTML = '';
  container.appendChild(
    el('div', { class: 'state state-error' }, '⚠ ', msg)
  );
}

export function showEmpty(container: HTMLElement, msg: string): void {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'state state-empty' }, msg));
}

export function showLoading(container: HTMLElement, msg = 'Loading…'): void {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'state state-loading' }, msg));
}
