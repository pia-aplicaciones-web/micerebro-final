'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook que inserta texto dictado donde esté el cursor
 * REGLA: CURSOR MANDA - donde esté el cursor, ahí va el dictado
 */
export const useDictation = (
  isListening: boolean,
  transcript: string,
  interimTranscript: string
) => {
  const lastTranscriptRef = useRef('');
  const interimNodeRef = useRef<HTMLSpanElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const savedInputRef = useRef<{ element: HTMLInputElement | HTMLTextAreaElement; start: number; end: number } | null>(null);

  // Modos de formato avanzados (solo para contentEditable)
  const underlineModeRef = useRef(false);
  const titleModeRef = useRef(false);
  const subtitleModeRef = useRef(false);
  const uppercaseModeRef = useRef(false);
  const listModeRef = useRef<'none' | 'bulleted' | 'numbered'>('none');
  const listIndexRef = useRef(1);

  // Remover el nodo interim
  const removeInterimNode = useCallback(() => {
    if (interimNodeRef.current && interimNodeRef.current.parentNode) {
      interimNodeRef.current.parentNode.removeChild(interimNodeRef.current);
      interimNodeRef.current = null;
    }
  }, []);

  // Guardar la selección/cursor actual (llamar desde onMouseDown del botón micrófono, antes de que el foco cambie)
  const saveSelectionBeforeMic = useCallback(() => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      savedInputRef.current = {
        element: active,
        start: active.selectionStart ?? 0,
        end: active.selectionEnd ?? 0,
      };
      savedRangeRef.current = null;
      return;
    }
    savedInputRef.current = null;
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const editable = range.commonAncestorContainer?.nodeType === Node.TEXT_NODE
        ? (range.commonAncestorContainer as Text).parentElement?.closest?.('[contenteditable="true"]')
        : (range.commonAncestorContainer as Node)?.parentElement?.closest?.('[contenteditable="true"]');
      if (editable) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Guardar la posición inicial del cursor cuando empieza el dictado (fallback si no se llamó saveSelectionBeforeMic)
  useEffect(() => {
    if (isListening) {
      lastTranscriptRef.current = '';
      if (!savedRangeRef.current && !savedInputRef.current) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          savedRangeRef.current = selection.getRangeAt(0).cloneRange();
        } else {
          const activeElement = document.activeElement;
          if (activeElement && (activeElement instanceof HTMLElement) && activeElement.isContentEditable) {
            const range = document.createRange();
            range.selectNodeContents(activeElement);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
            savedRangeRef.current = range.cloneRange();
          }
        }
      }
    } else {
      savedRangeRef.current = null;
      savedInputRef.current = null;
      removeInterimNode();
      lastTranscriptRef.current = '';
    }
  }, [isListening, removeInterimNode]);

  // Insertar texto en el cursor actual (o en el input/textarea guardado si el foco ya se movió al mic)
  const insertTextAtCursor = useCallback((text: string, isInterim: boolean = false) => {
    const activeElement = document.activeElement;

    // Input o textarea: usar el activo o el guardado (por si el foco está en el botón mic)
    const inputTarget = (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)
      ? activeElement
      : savedInputRef.current?.element;
    if (inputTarget && document.contains(inputTarget)) {
      if (isInterim) return;
      const start = inputTarget === activeElement
        ? (inputTarget.selectionStart ?? 0)
        : savedInputRef.current!.start;
      const end = inputTarget === activeElement
        ? (inputTarget.selectionEnd ?? 0)
        : savedInputRef.current!.end;
      const value = inputTarget.value;
      const newValue = value.slice(0, start) + text + value.slice(end);
      const newPos = start + text.length;
      inputTarget.value = newValue;
      inputTarget.setSelectionRange(newPos, newPos);
      if (savedInputRef.current && savedInputRef.current.element === inputTarget) {
        savedInputRef.current = { element: inputTarget, start: newPos, end: newPos };
      }
      inputTarget.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Si es un contentEditable
    const selection = window.getSelection();
    if (!selection) return;

    let range: Range;
    
    // REGLA: CURSOR MANDA - siempre priorizar la posición ACTUAL del cursor
    // Solo usar la posición guardada si no hay una posición actual válida
    if (selection.rangeCount > 0) {
      // Usar la posición ACTUAL del cursor (el usuario puede haberla movido)
      range = selection.getRangeAt(0);
    } else if (savedRangeRef.current) {
      // Si no hay cursor actual, usar el guardado como fallback
      range = savedRangeRef.current;
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Si no hay cursor ni posición guardada, intentar crear uno al final del elemento activo
      if (activeElement && (activeElement instanceof HTMLElement) && activeElement.isContentEditable) {
        range = document.createRange();
        range.selectNodeContents(activeElement);
        range.collapse(false); // Al final
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        return; // No hay donde insertar
      }
    }

    // Verificar que estamos en un contentEditable
    const container = range.commonAncestorContainer;
    const editableParent = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement?.closest('[contenteditable="true"]')
      : (container as HTMLElement).closest?.('[contenteditable="true"]');
    
    if (!editableParent) return;

    // Remover interim anterior
    removeInterimNode();

    if (isInterim) {
      // Crear span para texto interim (gris, cursiva)
      const span = document.createElement('span');
      span.style.color = '#9CA3AF';
      span.style.fontStyle = 'italic';
      span.textContent = text;
      interimNodeRef.current = span;

      range.insertNode(span);
      range.setStartAfter(span);
      range.setEndAfter(span);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      let finalText = text;
      if (!finalText) return;

      // Modo mayúsculas (solo una vez)
      if (uppercaseModeRef.current) {
        finalText = finalText.toUpperCase();
        uppercaseModeRef.current = false;
      }

      // Prefijos de lista
      if (listModeRef.current === 'bulleted') {
        finalText = (finalText.startsWith('\n') ? '' : '\n') + '• ' + finalText;
      } else if (listModeRef.current === 'numbered') {
        const index = listIndexRef.current;
        listIndexRef.current = index + 1;
        finalText = `\n${index}.- ` + finalText;
      }

      // Insertar nodo según modo activo
      let node: Node;

      if (titleModeRef.current) {
        const el = document.createElement('div');
        el.style.fontSize = '24px';
        el.style.fontWeight = '600';
        el.style.textAlign = 'center';
        el.style.display = 'block';
        el.textContent = finalText.trim();
        node = el;
        titleModeRef.current = false;
      } else if (subtitleModeRef.current) {
        const wrapper = document.createElement('div');
        wrapper.style.fontSize = '14px';
        wrapper.style.fontWeight = '600';
        wrapper.style.textTransform = 'uppercase';
        wrapper.style.color = '#374151';
        wrapper.style.marginTop = '8px';
        wrapper.style.marginBottom = '4px';
        wrapper.textContent = finalText.trim();

        const line = document.createElement('div');
        line.style.borderBottom = '1px solid #D1D5DB';
        line.style.marginBottom = '8px';

        range.insertNode(line);
        range.insertNode(wrapper);
        node = line;
        subtitleModeRef.current = false;
      } else if (underlineModeRef.current) {
        const span = document.createElement('span');
        span.style.textDecoration = 'underline';
        span.style.textDecorationColor = 'teal';
        span.textContent = finalText;
        node = span;
      } else {
        node = document.createTextNode(finalText);
      }

      range.insertNode(node);
      range.setStartAfter(node);
      range.setEndAfter(node);
      selection.removeAllRanges();
      selection.addRange(range);

      // Actualizar la posición guardada para el próximo insert (pero siempre priorizar posición actual)
      savedRangeRef.current = range.cloneRange();
    }
  }, [removeInterimNode]);

  // Procesar comandos especiales de dictado
  const processDictationCommand = useCallback((text: string) => {
    let processedText = text;

    const raw = processedText.trim();
    const lower = raw.toLowerCase();

    // Modos que solo cambian estado y NO insertan texto
    if (lower === 'subrayar') {
      underlineModeRef.current = true;
      return '';
    }
    if (lower === 'fin subrayar' || lower === 'fin sub-rayar') {
      underlineModeRef.current = false;
      return '';
    }
    if (lower === 'titulo' || lower === 'título') {
      titleModeRef.current = true;
      return '';
    }
    if (lower === 'mayuscula' || lower === 'mayúscula' || lower === 'mayusculas' || lower === 'mayúsculas') {
      uppercaseModeRef.current = true;
      return '';
    }
    if (lower === 'subtitulo' || lower === 'sub título' || lower === 'subtítulo') {
      subtitleModeRef.current = true;
      return '';
    }
    if (lower === 'lista') {
      listModeRef.current = 'bulleted';
      return '\n';
    }
    if (lower === 'fin lista' || lower === 'fin de lista') {
      listModeRef.current = 'none';
      listIndexRef.current = 1;
      return '';
    }
    if (lower === 'numeros' || lower === 'números' || lower === 'lista numerica') {
      listModeRef.current = 'numbered';
      listIndexRef.current = 1;
      return '\n';
    }

    // Comandos de dictado - frases completas que se convierten en símbolos
    // Hacer las búsquedas más flexibles para manejar variaciones del reconocimiento de voz
    processedText = processedText.replace(/\bnew\b/gi, '\n');
    processedText = processedText.replace(/\bpunto\b/gi, '.');
    processedText = processedText.replace(/\bcoma\b/gi, ',');
    processedText = processedText.replace(/agrega coma/gi, ',');
    processedText = processedText.replace(/\bresaltar\b/gi, '-*-');
    processedText = processedText.replace(/\blineas\b/gi, '//');
    processedText = processedText.replace(/\bmarca\b/gi, '#');

    // parrafo -> doble salto de línea
    processedText = processedText.replace(/\bparrafo\b/gi, '\n\n');

    // ENTER -> salto de línea simple
    processedText = processedText.replace(/\benter\b/gi, '\n');

    // fecha -> fecha actual amigable
    if (/\bfecha\b/i.test(processedText)) {
      const now = new Date();
      const fechaStr = now.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      processedText = processedText.replace(/\bfecha\b/gi, fechaStr);
    }

    // Añadir espacios después de puntuación (solo si no hay espacio ya)
    processedText = processedText.replace(/\.([^ \n])/g, '. $1'); // Punto seguido de texto -> . espacio
    processedText = processedText.replace(/,([^ \n])/g, ', $1'); // Coma seguida de texto -> , espacio

    return processedText;
  }, []);

  // Procesar cambios en transcript (texto final)
  useEffect(() => {
    if (!isListening) {
      // Si no está escuchando, resetear el transcript guardado
      lastTranscriptRef.current = '';
      return;
    }

    const currentTranscript = transcript || '';
    const lastTranscript = lastTranscriptRef.current || '';
    
    // Si el transcript está vacío o es igual al anterior, no hacer nada
    if (!currentTranscript || currentTranscript === lastTranscript) {
      return;
    }
    
    // Si el transcript es más corto que el anterior, significa que se reinició
    // En ese caso, resetear y procesar desde el inicio
    if (currentTranscript.length < lastTranscript.length) {
      lastTranscriptRef.current = '';
      // Procesar todo el transcript como nuevo
      if (currentTranscript.trim()) {
        removeInterimNode();
        const processedText = processDictationCommand(currentTranscript);
        insertTextAtCursor(processedText, false);
        lastTranscriptRef.current = currentTranscript;
      }
      return;
    }

    // Calcular solo el texto nuevo (diferencia)
    const newText = currentTranscript.slice(lastTranscript.length);

    if (newText.trim()) {
      removeInterimNode();
      // Procesar comandos especiales antes de insertar
      const processedText = processDictationCommand(newText);
      insertTextAtCursor(processedText, false);
      lastTranscriptRef.current = currentTranscript;
    }
  }, [transcript, isListening, insertTextAtCursor, removeInterimNode, processDictationCommand]);

  // Procesar cambios en interimTranscript
  useEffect(() => {
    if (!isListening) return;
    
    removeInterimNode();
    
    if (interimTranscript.trim()) {
      insertTextAtCursor(interimTranscript, true);
    }
  }, [interimTranscript, isListening, insertTextAtCursor, removeInterimNode]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      removeInterimNode();
    };
  }, [removeInterimNode]);

  return { saveSelectionBeforeMic };
};
