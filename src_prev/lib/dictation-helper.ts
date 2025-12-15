// Helpers de dictado eliminados; se mantiene la firma mínima para compatibilidad.
'use client';

export interface DictationState {
  lastInsertedText: string;
  lastFinalText: string;
}

export function createDictationState(): DictationState {
  return { lastInsertedText: '', lastFinalText: '' };
}

export function insertDictationTextToContentEditable(): void {
  // no-op
}

export function insertDictationTextToInput(): void {
  // no-op
}

export function finalizeInterimText(): void {
  // no-op
}
