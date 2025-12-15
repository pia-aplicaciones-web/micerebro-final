'use client';

import { useEffect, useRef } from 'react';

type DictationTarget =
  | React.RefObject<HTMLElement>
  | React.RefObject<HTMLInputElement>
  | React.RefObject<HTMLTextAreaElement>;

type DictationInputParams = {
  elementRef?: DictationTarget;
  isListening?: boolean;
  liveTranscript?: string;
  finalTranscript?: string;
  interimTranscript?: string;
  isSelected?: boolean;
  enabled?: boolean;
};

/**
 * Aplica transcripciones de dictado en tiempo real a un elemento contentEditable o input/textarea.
 * - Muestra interim (gris) mientras se dicta.
 * - Inyecta finalTranscript al terminar sin borrar el contenido previo.
 */
export function useDictationInput(params?: DictationInputParams) {
  const {
    elementRef,
    isListening = false,
    liveTranscript = '',
    finalTranscript = '',
    interimTranscript = '',
    isSelected = true,
    enabled = true,
  } = params || {};

  const baseTextRef = useRef<string>('');

  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const placeCaretAtEnd = (el: HTMLElement) => {
    try {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!enabled || !elementRef?.current || !isSelected) return;

    const el = elementRef.current as HTMLElement;
    const isContentEditable = (el as HTMLElement).isContentEditable;

    // Helpers para limpiar interim y obtener texto base sin duplicar
    const getCleanText = (): string => {
      if (isContentEditable) {
        const clone = el.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('[data-dict-interim]').forEach((n) => n.remove());
        return (clone.textContent || '').trim();
      }
      if ((el as HTMLInputElement).value !== undefined) return (el as HTMLInputElement).value || '';
      if ((el as HTMLTextAreaElement).value !== undefined) return (el as HTMLTextAreaElement).value || '';
      return '';
    };

    const setValue = (text: string) => {
      if (isContentEditable) {
        (el as HTMLElement).innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
        placeCaretAtEnd(el as HTMLElement);
      } else if ((el as HTMLInputElement).value !== undefined) {
        (el as HTMLInputElement).value = text;
        const len = text.length;
        (el as HTMLInputElement).setSelectionRange?.(len, len);
      } else if ((el as HTMLTextAreaElement).value !== undefined) {
        (el as HTMLTextAreaElement).value = text;
        const len = text.length;
        (el as HTMLTextAreaElement).setSelectionRange?.(len, len);
      }
    };

    const applyInterim = (base: string, interim: string) => {
      if (isContentEditable) {
        const html = `${escapeHtml(base)}${base ? ' ' : ''}<span data-dict-interim style="color:#9ca3af;">${escapeHtml(interim)}</span>`;
        (el as HTMLElement).innerHTML = html;
        placeCaretAtEnd(el as HTMLElement);
      } else if ((el as HTMLInputElement).value !== undefined || (el as HTMLTextAreaElement).value !== undefined) {
        const val = `${base}${base ? ' ' : ''}${interim}`.trim();
        setValue(val);
      }
    };

    const applyFinal = (base: string, finalText: string) => {
      const next = `${base}${base ? ' ' : ''}${finalText}`.trim();
      setValue(next);
      baseTextRef.current = next;
    };

    const base = baseTextRef.current || getCleanText();
    const interim = interimTranscript || liveTranscript || '';

    if (isListening) {
      // Guardar base solo al iniciar escucha
      if (!baseTextRef.current) {
        baseTextRef.current = base;
      }
      if (interim) {
        applyInterim(baseTextRef.current, interim);
      }
    } else {
      // Se detuvo el dictado
      if (finalTranscript) {
        applyFinal(baseTextRef.current || base, finalTranscript);
      } else {
        // Solo limpiar interim y restaurar base
        setValue(baseTextRef.current || base);
      }
      // Reset base para próxima sesión
      baseTextRef.current = '';
    }
  }, [elementRef, isListening, interimTranscript, finalTranscript, liveTranscript, isSelected, enabled]);
}

export default useDictationInput;
