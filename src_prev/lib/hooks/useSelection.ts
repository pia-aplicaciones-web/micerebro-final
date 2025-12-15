// src/lib/hooks/useSelection.ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { WithId, CanvasElement } from '@/lib/types';

interface UseSelectionReturn {
  clearSelection: () => void;
  addSelection: (id: string) => void;
  removeSelection: (id: string) => void;
  isSelected: (id: string) => boolean;
  updateSelectionBounds: (newBounds: DOMRect) => void;
  selectionBounds: DOMRect | null;
}

export const useSelection = (
  initialSelectedElementIds: string[],
  onSelectElement: (id: string | null) => void,
  elements: WithId<CanvasElement>[],
  canvasRef: React.RefObject<HTMLDivElement>,
  scale: number,
  offset: { x: number; y: number }
): UseSelectionReturn => {
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>(initialSelectedElementIds);
  const [selectionBounds, setSelectionBounds] = useState<DOMRect | null>(null);

  // Actualizar la selección local si cambia la prop externa
  useEffect(() => {
    setSelectedElementIds(initialSelectedElementIds);
  }, [initialSelectedElementIds]);

  const clearSelection = useCallback(() => {
    setSelectedElementIds([]);
    onSelectElement(null);
    setSelectionBounds(null);
  }, [onSelectElement]);

  const addSelection = useCallback((id: string) => {
    setSelectedElementIds((prev) => {
      if (!prev.includes(id)) {
        const newSelection = [...prev, id];
        onSelectElement(newSelection.length > 0 ? newSelection[newSelection.length - 1] : null); // Seleccionar el último
        return newSelection;
      }
      return prev;
    });
  }, [onSelectElement]);

  const removeSelection = useCallback((id: string) => {
    setSelectedElementIds((prev) => {
      const newSelection = prev.filter((_id) => _id !== id);
      onSelectElement(newSelection.length > 0 ? newSelection[newSelection.length - 1] : null); // Seleccionar el último
      return newSelection;
    });
  }, [onSelectElement]);

  const isSelected = useCallback((id: string) => selectedElementIds.includes(id), [selectedElementIds]);

  const updateSelectionBounds = useCallback((newBounds: DOMRect) => {
    setSelectionBounds(newBounds);
  }, []);

  // CRÍTICO: useMemo NO debe tener side effects (setState)
  // Cambiar a useEffect para side effects correctos
  useEffect(() => {
    if (selectedElementIds.length === 0) {
      setSelectionBounds(null);
      return;
    }

    const selectedElements = elements.filter(e => selectedElementIds.includes(e.id));
    if (selectedElements.length === 0) {
      setSelectionBounds(null);
      return;
    }

    // Calcula un bounding box simple (esto sería más complejo en una implementación real)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    selectedElements.forEach(el => {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width); // Asumiendo que width existe en CanvasElement
      maxY = Math.max(maxY, el.y + el.height); // Asumiendo que height existe en CanvasElement
    });

    const rect = new DOMRect(minX * scale + offset.x, minY * scale + offset.y, (maxX - minX) * scale, (maxY - minY) * scale);
    setSelectionBounds(rect);

  }, [selectedElementIds, elements, scale, offset]);


  return {
    clearSelection,
    addSelection,
    removeSelection,
    isSelected,
    updateSelectionBounds,
    selectionBounds,
  };
};