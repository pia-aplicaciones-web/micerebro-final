/**
 * Helper para preservar posición del cursor en elementos contentEditable
 * Evita que el cursor vuelva al inicio cuando se actualiza innerHTML
 */

/**
 * Guarda la posición actual del cursor en un elemento contentEditable
 */
export function saveCursorPosition(element: HTMLElement): { start: number; end: number; node: Node | null } | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(element);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  
  const start = preCaretRange.toString().length;
  const end = start + range.toString().length;
  
  return {
    start,
    end,
    node: range.endContainer,
  };
}

/**
 * Restaura la posición del cursor en un elemento contentEditable
 */
export function restoreCursorPosition(
  element: HTMLElement,
  savedPosition: { start: number; end: number; node: Node | null } | null
): boolean {
  if (!savedPosition) {
    return false;
  }

  const selection = window.getSelection();
  if (!selection) {
    return false;
  }

  try {
    // Buscar el nodo de texto más cercano a la posición guardada
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentPos = 0;
    let targetNode: Node | null = null;
    let targetOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nodeLength = node.textContent?.length || 0;
      
      if (currentPos + nodeLength >= savedPosition.start) {
        targetNode = node;
        targetOffset = savedPosition.start - currentPos;
        break;
      }
      
      currentPos += nodeLength;
    }

    // Si no encontramos el nodo, usar el último nodo de texto
    if (!targetNode) {
      const lastTextNode = getLastTextNode(element);
      if (lastTextNode) {
        targetNode = lastTextNode;
        targetOffset = lastTextNode.textContent?.length || 0;
      } else {
        // Si no hay nodos de texto, poner el cursor al final del elemento
        const range = document.createRange();
        range.selectNodeContents(element);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        return true;
      }
    }

    // Crear y aplicar el rango
    const range = document.createRange();
    range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
    
    // Si hay selección (start !== end), establecer el final también
    if (savedPosition.end !== savedPosition.start) {
      let endPos = 0;
      const endWalker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      while (endWalker.nextNode()) {
        const node = endWalker.currentNode;
        const nodeLength = node.textContent?.length || 0;
        
        if (endPos + nodeLength >= savedPosition.end) {
          range.setEnd(node, savedPosition.end - endPos);
          break;
        }
        
        endPos += nodeLength;
      }
    } else {
      range.collapse(true);
    }

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  } catch (error) {
    console.error('Error restaurando cursor:', error);
    // Fallback: poner cursor al final
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    return false;
  }
}

/**
 * Obtiene el último nodo de texto en un elemento
 */
function getLastTextNode(element: HTMLElement): Node | null {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  );

  let lastNode: Node | null = null;
  while (walker.nextNode()) {
    lastNode = walker.currentNode;
  }

  return lastNode;
}

/**
 * Actualiza innerHTML preservando la posición del cursor
 */
export function updateInnerHTMLPreservingCursor(
  element: HTMLElement,
  newHTML: string
): void {
  // Solo actualizar si realmente cambió
  if (element.innerHTML === newHTML) {
    return;
  }

  // Guardar posición del cursor
  const savedPosition = saveCursorPosition(element);
  
  // Actualizar contenido
  element.innerHTML = newHTML;
  
  // Restaurar posición del cursor
  if (savedPosition) {
    // Usar setTimeout para asegurar que el DOM se haya actualizado
    setTimeout(() => {
      restoreCursorPosition(element, savedPosition);
    }, 0);
  }
}

