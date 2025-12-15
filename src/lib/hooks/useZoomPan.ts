// src/lib/hooks/useZoomPan.ts
import { useState, useCallback, useEffect } from 'react';

interface Point {
  x: number;
  y: number;
}

interface UseZoomPanReturn {
  scale: number;
  offset: Point;
  panMode: boolean;
  setPanMode: (enabled: boolean) => void;
  panCanvas: (deltaX: number, deltaY: number) => void;
  zoomIn: (focusPoint?: Point) => void;
  zoomOut: (focusPoint?: Point) => void;
  resetZoomPan: () => void;
  clientToCanvas: (clientX: number, clientY: number) => Point;
}

const INITIAL_SCALE = 1;
const INITIAL_OFFSET: Point = { x: 0, y: 0 };
const ZOOM_FACTOR = 1.1; // Cuánto se acerca/aleja en cada paso

export const useZoomPan = (canvasRef: React.RefObject<HTMLDivElement>): UseZoomPanReturn => {
  const [scale, setScale] = useState<number>(INITIAL_SCALE);
  const [offset, setOffset] = useState<Point>(INITIAL_OFFSET);
  const [panMode, setPanMode] = useState<boolean>(false);

  // Función para mover el canvas
  const panCanvas = useCallback((deltaX: number, deltaY: number) => {
    setOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
  }, []);

  // Función para hacer zoom in
  const zoomIn = useCallback((focusPoint?: Point) => {
    setScale(prevScale => {
      const newScale = prevScale * ZOOM_FACTOR;
      if (focusPoint) {
        setOffset(prevOffset => ({
          x: focusPoint.x - (focusPoint.x - prevOffset.x) * (newScale / prevScale),
          y: focusPoint.y - (focusPoint.y - prevOffset.y) * (newScale / prevScale),
        }));
      }
      return newScale;
    });
  }, []);

  // Función para hacer zoom out
  const zoomOut = useCallback((focusPoint?: Point) => {
    setScale(prevScale => {
      const newScale = prevScale / ZOOM_FACTOR;
      if (focusPoint) {
        setOffset(prevOffset => ({
          x: focusPoint.x - (focusPoint.x - prevOffset.x) * (newScale / prevScale),
          y: focusPoint.y - (focusPoint.y - prevOffset.y) * (newScale / prevScale),
        }));
      }
      return newScale;
    });
  }, []);

  // Función para resetear zoom y pan
  const resetZoomPan = useCallback(() => {
    setScale(INITIAL_SCALE);
    setOffset(INITIAL_OFFSET);
    setPanMode(false);
  }, []);

  // Convertir coordenadas del cliente (pantalla) a coordenadas del canvas
  const clientToCanvas = useCallback((clientX: number, clientY: number): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - canvasRect.left - offset.x) / scale;
    const y = (clientY - canvasRect.top - offset.y) / scale;
    return { x, y };
  }, [canvasRef, offset, scale]);

  return {
    scale,
    offset,
    panMode,
    setPanMode,
    panCanvas,
    zoomIn,
    zoomOut,
    resetZoomPan,
    clientToCanvas,
  };
};
