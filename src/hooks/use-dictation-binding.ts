'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Hook para conectar elementos con el sistema de dictado
 * Permite que el dictado se inserte correctamente en inputs/textarea
 */
export function useDictationBinding({
  isListening,
  finalTranscript,
  interimTranscript,
  isSelected,
}: {
  isListening: boolean;
  finalTranscript: string;
  interimTranscript: string;
  isSelected: boolean;
}) {
  const lastTranscriptRef = useRef('');
  const boundElementRef = useRef<HTMLElement | null>(null);

  // Función para insertar texto en el elemento enfocado
  const insertTextAtCursor = useCallback((text: string, isInterim: boolean = false) => {
    const element = boundElementRef.current;
    if (!element) return;

    // Para inputs y textareas
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (isInterim) return; // No mostrar interim en inputs

      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const value = element.value;

      // Insertar texto en la posición del cursor
      const newValue = value.slice(0, start) + text + value.slice(end);
      element.value = newValue;

      // Actualizar posición del cursor
      const newCursorPos = start + text.length;
      element.setSelectionRange(newCursorPos, newCursorPos);

      // Disparar evento change
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  // Conectar elemento al dictado
  const bindDictationTarget = useCallback((element: HTMLElement) => {
    boundElementRef.current = element;
  }, []);

  // Escuchar cambios en transcripts cuando el elemento está seleccionado
  useEffect(() => {
    if (!isSelected || !boundElementRef.current) return;

    // Procesar transcript final
    if (finalTranscript && finalTranscript !== lastTranscriptRef.current) {
      const newText = finalTranscript.slice(lastTranscriptRef.current.length);
      if (newText) {
        insertTextAtCursor(newText);
      }
      lastTranscriptRef.current = finalTranscript;
    }
  }, [finalTranscript, isSelected, insertTextAtCursor]);

  // Limpiar referencias cuando deja de escuchar
  useEffect(() => {
    if (!isListening) {
      lastTranscriptRef.current = '';
      boundElementRef.current = null;
    }
  }, [isListening]);

  return {
    bindDictationTarget,
    insertTextAtCursor,
  };
}