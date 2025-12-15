// src/lib/hooks/useKeyboardNavigation.ts
import { useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook'; // Asumo que este hook ya está disponible
import type { WithId, CanvasElement, Point } from '@/lib/types';

interface UseKeyboardNavigationProps {
  elements: WithId<CanvasElement>[];
  selectedElementIds: string[];
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void;
  onElementDelete: (elementId: string) => void;
  onSelectElement: (elementId: string | null) => void;
  canvasRef: React.RefObject<HTMLDivElement>; // Para contexto del canvas
  scale: number;
  offset: Point;
  panCanvas: (deltaX: number, deltaY: number) => void; // Para mover el canvas con flechas
}

export const useKeyboardNavigation = ({
  elements,
  selectedElementIds,
  onElementUpdate,
  onElementDelete,
  onSelectElement,
  canvasRef,
  scale,
  offset,
  panCanvas,
}: UseKeyboardNavigationProps) => {

  // Implementa la lógica de las flechas para mover elementos o el canvas
  useHotkeys('up', (e) => {
    e.preventDefault();
    if (selectedElementIds.length > 0) {
      // Mover elementos seleccionados
      selectedElementIds.forEach(id => {
        const element = elements.find(el => el.id === id);
        if (element) {
          onElementUpdate(id, { y: element.y - 5 / scale }); // Mueve hacia arriba
        }
      });
    } else {
      // Si no hay elementos seleccionados, mover el canvas
      panCanvas(0, 5); // Mueve el canvas hacia abajo visualmente
    }
  }, { enableOnFormTags: true }, [selectedElementIds, elements, onElementUpdate, panCanvas, scale]);

  useHotkeys('down', (e) => {
    e.preventDefault();
    if (selectedElementIds.length > 0) {
      selectedElementIds.forEach(id => {
        const element = elements.find(el => el.id === id);
        if (element) {
          onElementUpdate(id, { y: element.y + 5 / scale });
        }
      });
    } else {
      panCanvas(0, -5);
    }
  }, { enableOnFormTags: true }, [selectedElementIds, elements, onElementUpdate, panCanvas, scale]);

  useHotkeys('left', (e) => {
    e.preventDefault();
    if (selectedElementIds.length > 0) {
      selectedElementIds.forEach(id => {
        const element = elements.find(el => el.id === id);
        if (element) {
          onElementUpdate(id, { x: element.x - 5 / scale });
        }
      });
    } else {
      panCanvas(5, 0);
    }
  }, { enableOnFormTags: true }, [selectedElementIds, elements, onElementUpdate, panCanvas, scale]);

  useHotkeys('right', (e) => {
    e.preventDefault();
    if (selectedElementIds.length > 0) {
      selectedElementIds.forEach(id => {
        const element = elements.find(el => el.id === id);
        if (element) {
          onElementUpdate(id, { x: element.x + 5 / scale });
        }
      });
    } else {
      panCanvas(-5, 0);
    }
  }, { enableOnFormTags: true }, [selectedElementIds, elements, onElementUpdate, panCanvas, scale]);

  // Lógica para eliminar elementos seleccionados
  useHotkeys('backspace', (e) => {
    if (selectedElementIds.length > 0) {
      e.preventDefault(); // Evita navegar hacia atrás en el navegador
      selectedElementIds.forEach(id => onElementDelete(id));
      onSelectElement(null); // Deseleccionar después de borrar
    }
  }, { enableOnFormTags: true }, [selectedElementIds, onElementDelete, onSelectElement]);

  // Lógica para seleccionar todos (Ctrl/Cmd + A)
  useHotkeys('mod+a', (e) => {
    e.preventDefault();
    const allElementIds = elements.map(el => el.id);
    if (allElementIds.length > 0) {
      onSelectElement(allElementIds[0]); // Seleccionar el primer elemento como base
      // Aquí deberías añadir lógica para seleccionar todos los elementos
      // o pasar todos los IDs a onSelectElement si soporta selección múltiple
      // Por ahora, solo selecciona el primero para evitar errores.
    }
  }, { enableOnFormTags: true }, [elements, onSelectElement]);

  // Lógica para deseleccionar (Escape) ya manejada en BoardContent, pero puedes replicarla aquí si es un hook
  // useHotkeys('escape', () => { onSelectElement(null); }, { enableOnFormTags: true }, [onSelectElement]);

  // Puedes añadir más atajos de teclado aquí
};