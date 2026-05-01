const KEY = 'kavyms.dismissedBanners';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* localStorage might be blocked — silent no-op */
  }
}

/** Stable hash for a banner message (djb2 — sufficient for dismiss tracking). */
export function hashMessage(msg: string): string {
  let h = 5381;
  for (let i = 0; i < msg.length; i++) {
    h = ((h << 5) + h + msg.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export function isDismissed(hash: string): boolean {
  return read().includes(hash);
}

export function dismiss(hash: string): void {
  const list = read();
  if (!list.includes(hash)) {
    list.push(hash);
    write(list);
  }
}
