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

  // Función para insertar texto en el elemento enfocado (compatible con inputs controlados por React)
  const insertTextAtCursor = useCallback((text: string, isInterim: boolean = false) => {
    const element = boundElementRef.current;
    if (!element) return;

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (isInterim) return;

      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const value = element.value;
      const newValue = value.slice(0, start) + text + value.slice(end);
      const newCursorPos = start + text.length;

      // Usar setter nativo para que React detecte el cambio en inputs controlados (timer-lista, listas de tareas)
      const proto = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor?.set) {
        descriptor.set.call(element, newValue);
      } else {
        element.value = newValue;
      }
      element.setSelectionRange(newCursorPos, newCursorPos);
      // InputEvent hace que React actualice el estado en componentes controlados
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
    }
  }, []);

  // Conectar elemento al dictado
  const bindDictationTarget = useCallback((element: HTMLElement) => {
    boundElementRef.current = element;
  }, []);

  // Escuchar cambios en transcript e insertar en el elemento enlazado (timer-lista, listas de tareas).
  // Insertar si hay elemento enlazado (foco); no exigir isSelected para evitar retrasos de un render.
  useEffect(() => {
    const el = boundElementRef.current;
    if (!el || !document.contains(el)) return;

    if (finalTranscript && finalTranscript !== lastTranscriptRef.current) {
      const newText = finalTranscript.slice(lastTranscriptRef.current.length);
      if (newText) {
        insertTextAtCursor(newText);
      }
      lastTranscriptRef.current = finalTranscript;
    }
  }, [finalTranscript, insertTextAtCursor]);

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