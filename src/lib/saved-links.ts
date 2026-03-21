const STORAGE_KEY = 'micerebro-saved-links';
const STORAGE_KEY_PREFIX = 'micerebro-saved-links:';

export type SavedLink = {
  id: string;
  name: string;
  url: string;
};

export function getSavedLinks(boardId?: string): SavedLink[] {
  if (typeof window === 'undefined') return [];
  try {
    if (boardId) {
      const scopedRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${boardId}`);
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw) as SavedLink[];
        return Array.isArray(parsed) ? parsed : [];
      }
      // Migración: si existe el storage global, moverlo al tablero actual y limpiarlo
      const legacyRaw = localStorage.getItem(STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw) as SavedLink[];
        const list = Array.isArray(parsed) ? parsed : [];
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${boardId}`, JSON.stringify(list));
        localStorage.removeItem(STORAGE_KEY);
        return list;
      }
      return [];
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedLink[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addSavedLink(name: string, url: string, boardId?: string): SavedLink {
  const trimmedName = name.trim();
  const trimmedUrl = url.trim();
  const link: SavedLink = {
    id: crypto.randomUUID(),
    name: trimmedName || 'Sin nombre',
    url: trimmedUrl,
  };
  const list = getSavedLinks(boardId);
  list.push(link);
  const key = boardId ? `${STORAGE_KEY_PREFIX}${boardId}` : STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(list));
  return link;
}

export function removeSavedLink(id: string, boardId?: string): void {
  const list = getSavedLinks(boardId).filter((l) => l.id !== id);
  const key = boardId ? `${STORAGE_KEY_PREFIX}${boardId}` : STORAGE_KEY;
  localStorage.setItem(key, JSON.stringify(list));
}
