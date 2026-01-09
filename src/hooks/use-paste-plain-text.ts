// Hook para manejar pegado de texto plano en elementos editables
// Limpia estilos HTML externos y mantiene solo texto sin formato

'use client';

import { useCallback } from 'react';

export const usePastePlainText = () => {
  const handlePaste = useCallback((event: ClipboardEvent) => {
    // Prevenir el comportamiento por defecto
    event.preventDefault();

    // Obtener el texto del clipboard
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    // Intentar obtener texto plano primero
    let plainText = clipboardData.getData('text/plain');

    // Si no hay texto plano, intentar limpiar HTML
    if (!plainText) {
      const htmlContent = clipboardData.getData('text/html');
      if (htmlContent) {
        // Crear un elemento temporal para parsear HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;

        // Extraer solo el texto, removiendo todas las etiquetas
        plainText = tempDiv.textContent || tempDiv.innerText || '';
      }
    }

    // Si aún no tenemos texto, intentar otros formatos
    if (!plainText) {
      // Intentar otros tipos de datos del clipboard
      const types = clipboardData.types;
      for (const type of types) {
        if (type !== 'text/html' && type !== 'text/plain') {
          try {
            const data = clipboardData.getData(type);
            if (data && typeof data === 'string') {
              plainText = data;
              break;
            }
          } catch (e) {
            // Ignorar errores de tipos no soportados
          }
        }
      }
    }

    // Limpiar el texto (remover caracteres de control extraños)
    plainText = plainText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remover caracteres de control
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();

    // Insertar el texto limpio en el elemento actual
    const target = event.target as HTMLElement;
    if (target && typeof target.ownerDocument !== 'undefined') {
      const selection = target.ownerDocument.getSelection();
      if (selection && selection.rangeCount > 0) {
        // Si hay una selección, reemplazar el contenido seleccionado
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Insertar el texto limpio
        const textNode = target.ownerDocument.createTextNode(plainText);
        range.insertNode(textNode);

        // Mover el cursor al final del texto insertado
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
      } else if (target.isContentEditable || target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') {
        // Para elementos contentEditable, textarea, o input
        if (target.isContentEditable) {
          // Para contentEditable
          const selection = target.ownerDocument.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = target.ownerDocument.createTextNode(plainText);
            range.insertNode(textNode);

            // Mover cursor
            range.setStartAfter(textNode);
            range.setEndAfter(textNode);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        } else {
          // Para textarea/input
          const start = (target as HTMLInputElement | HTMLTextAreaElement).selectionStart || 0;
          const end = (target as HTMLInputElement | HTMLTextAreaElement).selectionEnd || 0;
          const value = (target as HTMLInputElement | HTMLTextAreaElement).value;

          // Reemplazar el texto seleccionado con el texto limpio
          (target as HTMLInputElement | HTMLTextAreaElement).value =
            value.substring(0, start) + plainText + value.substring(end);

          // Mover el cursor
          (target as HTMLInputElement | HTMLTextAreaElement).selectionStart =
          (target as HTMLInputElement | HTMLTextAreaElement).selectionEnd = start + plainText.length;
        }
      }
    }

    // Disparar eventos para que otros listeners sepan que el contenido cambió
    target?.dispatchEvent(new Event('input', { bubbles: true }));
    target?.dispatchEvent(new Event('change', { bubbles: true }));
  }, []);

  return { handlePaste };
};

// Función utilitaria para aplicar a cualquier elemento editable
export const applyPlainTextPaste = (element: HTMLElement) => {
  const { handlePaste } = usePastePlainText();

  const pasteHandler = (e: ClipboardEvent) => {
    handlePaste(e);
  };

  element.addEventListener('paste', pasteHandler);

  // Retornar función para remover el listener
  return () => {
    element.removeEventListener('paste', pasteHandler);
  };
};
