// src/lib/hooks/useCanvasDragAndDrop.ts
import { useCallback, useRef, useState } from 'react';
import type { WithId, CanvasElement, Point } from '@/lib/types';

// Define la interfaz de las props que el hook recibe
interface UseCanvasDragAndDropProps {
  elements: WithId<CanvasElement>[];
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void;
  onSelectElement: (elementId: string | null) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
  scale: number;
  offset: { x: number; y: number };
  selectedElementIds: string[];
  clearSelection: () => void;
  addSelection: (id: string) => void;
  updateSelectionBounds: (newBounds: DOMRect) => void;
}

// Define la interfaz de lo que el hook devuelve
interface UseCanvasDragAndDropReturn {
  startDrag: (event: React.MouseEvent) => void;
  draggedElementId: string | null;
  handleDrag: (event: React.MouseEvent) => void;
  handleDragStop: (event: React.MouseEvent) => void;
  handleResize: (elementId: string, delta: { x: number; y: number; width: number; height: number; }) => void;
  handleResizeStop: (elementId: string, finalRect: { x: number; y: number; width: number; height: number; }) => void;
}

export const useCanvasDragAndDrop = ({
  elements,
  onElementUpdate,
  onSelectElement,
  canvasRef,
  scale,
  offset,
  selectedElementIds,
  clearSelection,
  addSelection,
  updateSelectionBounds,
}: UseCanvasDragAndDropProps): UseCanvasDragAndDropReturn => {
  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const startDragPosition = useRef<Point | null>(null);
  const startElementPosition = useRef<{ [key: string]: Point } | null>(null);
  const isDraggingCanvas = useRef(false);

  const startDrag = useCallback((event: React.MouseEvent) => {
    if (!canvasRef.current) return;

    const target = event.target as HTMLElement;
    const clickedElement = target.closest('[data-element-id]') as HTMLElement;
    const elementId = clickedElement?.dataset.elementId;

    // Si se hizo clic en un elemento arrastrable
    if (elementId) {
        setDraggedElementId(elementId);
        startDragPosition.current = { x: event.clientX, y: event.clientY };
        
        // Si el elemento no está seleccionado, seleccionarlo
        if (!selectedElementIds.includes(elementId)) {
            onSelectElement(elementId);
        }

        // Guardar posiciones iniciales de los elementos seleccionados
        const initialPositions: { [key: string]: Point } = {};
        selectedElementIds.forEach(id => {
            const el = elements.find(e => e.id === id);
            if (el) {
                initialPositions[id] = { x: el.x, y: el.y };
            }
        });
        // Asegurarse de incluir el elemento actual si no estaba previamente seleccionado
        if (!initialPositions[elementId]) {
          const el = elements.find(e => e.id === elementId);
          if (el) {
            initialPositions[elementId] = { x: el.x, y: el.y };
          }
        }
        startElementPosition.current = initialPositions;

        isDraggingCanvas.current = false; // No estamos arrastrando el canvas si un elemento fue clickeado
    } else {
        // Si se hizo clic en el canvas, iniciar arrastre del canvas
        isDraggingCanvas.current = true;
        startDragPosition.current = { x: event.clientX, y: event.clientY };
        // Aquí la lógica para panCanvas, si la necesitas, sería mejor pasarla como prop
        // o manejarla en el BoardContent que tiene el estado de offset.
    }
  }, [canvasRef, elements, onSelectElement, selectedElementIds]);

  const handleDrag = useCallback((event: React.MouseEvent) => {
    if (!startDragPosition.current || (!draggedElementId && !isDraggingCanvas.current)) return;

    const deltaX = (event.clientX - startDragPosition.current.x) / scale;
    const deltaY = (event.clientY - startDragPosition.current.y) / scale;

    if (draggedElementId && startElementPosition.current) {
      // Arrastrar elementos seleccionados
      selectedElementIds.forEach(id => {
        const initialPos = startElementPosition.current![id];
        if (initialPos) {
          const newX = initialPos.x + deltaX;
          const newY = initialPos.y + deltaY;
          onElementUpdate(id, { x: newX, y: newY });
        }
      });
    }
    // Si estuviéramos arrastrando el canvas, aquí actualizaríamos el offset
    // pero esa lógica se gestiona mejor en useZoomPan y no en este hook para elementos.
  }, [draggedElementId, scale, onElementUpdate, selectedElementIds]);

  const handleDragStop = useCallback(() => {
    setDraggedElementId(null);
    startDragPosition.current = null;
    startElementPosition.current = null;
    isDraggingCanvas.current = false;
  }, []);

  const handleResize = useCallback((elementId: string, delta: { x: number; y: number; width: number; height: number; }) => {
    // Implementación de redimensionamiento en tiempo real
    onElementUpdate(elementId, delta);
  }, [onElementUpdate]);

  const handleResizeStop = useCallback((elementId: string, finalRect: { x: number; y: number; width: number; height: number; }) => {
    // Implementación de actualización final de redimensionamiento
    onElementUpdate(elementId, finalRect);
  }, [onElementUpdate]);

  return {
    startDrag,
    draggedElementId,
    handleDrag,
    handleDragStop,
    handleResize,
    handleResizeStop,
  };
};
