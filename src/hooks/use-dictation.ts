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

  // Remover el nodo interim
  const removeInterimNode = useCallback(() => {
    if (interimNodeRef.current && interimNodeRef.current.parentNode) {
      interimNodeRef.current.parentNode.removeChild(interimNodeRef.current);
      interimNodeRef.current = null;
    }
  }, []);

  // Guardar la posición del cursor cuando empieza el dictado
  useEffect(() => {
    if (isListening) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        savedRangeRef.current = selection.getRangeAt(0).cloneRange();
      }
    } else {
      savedRangeRef.current = null;
      removeInterimNode();
      lastTranscriptRef.current = '';
    }
  }, [isListening, removeInterimNode]);

  // Insertar texto en el cursor actual
  const insertTextAtCursor = useCallback((text: string, isInterim: boolean = false) => {
    const activeElement = document.activeElement;
    
    // Si es un input o textarea
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      if (isInterim) return; // No mostramos interim en inputs
      
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      const value = activeElement.value;
      
      activeElement.value = value.slice(0, start) + text + value.slice(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Si es un contentEditable
    const selection = window.getSelection();
    if (!selection) return;

    let range: Range;
    
    // Restaurar la posición guardada o usar la actual
    if (savedRangeRef.current) {
      range = savedRangeRef.current;
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    } else {
      return;
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
      // Insertar texto final
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Actualizar la posición guardada
      savedRangeRef.current = range.cloneRange();
    }
  }, [removeInterimNode]);

  // Procesar comandos especiales de dictado
  const processDictationCommand = useCallback((text: string) => {
    // Comandos especiales del dictado
    if (text.includes('//')) {
      return text.replace(/\/\//g, '\n'); // Líneas: // -> nueva línea
    }
    if (text.includes('#')) {
      return text.replace(/#/g, '**').replace(/$/, '** '); // Marca: # -> **texto**
    }
    if (text.includes('**')) {
      return text.replace(/\*\*/g, '**'); // Resaltar: ** -> formato markdown
    }
    if (text.includes('niu')) {
      return text.replace(/niu/g, '\n'); // Nueva línea: niu -> nueva línea
    }
    if (text.includes('.')) {
      return text.replace(/\./g, '. '); // Punto: . -> . con espacio
    }
    if (text.includes(',')) {
      return text.replace(/,/g, ', '); // Coma: , -> , con espacio
    }
    return text;
  }, []);

  // Procesar cambios en transcript (texto final)
  useEffect(() => {
    if (!isListening) return;
    
    const newText = transcript.slice(lastTranscriptRef.current.length);
    
    if (newText.trim()) {
      removeInterimNode();
      // Procesar comandos especiales antes de insertar
      const processedText = processDictationCommand(newText);
      insertTextAtCursor(processedText, false);
      lastTranscriptRef.current = transcript;
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
};
