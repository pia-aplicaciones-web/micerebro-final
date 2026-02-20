const STORAGE_KEY = 'micerebro-saved-links';

export type SavedLink = {
  id: string;
  name: string;
  url: string;
};

export function getSavedLinks(): SavedLink[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSavedLink(name: string, url: string): SavedLink {
  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  const link: SavedLink = {
    id: crypto.randomUUID(),
    name: trimmedName || 'Sin nombre',
    url: trimmedUrl,
  };
  const list = getSavedLinks();
  list.push(link);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return link;
}

export function removeSavedLink(id: string): void {
  const list = getSavedLinks().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
