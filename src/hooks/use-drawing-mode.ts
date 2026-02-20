'use client';

import { useState, useCallback, useEffect } from 'react';

export type DrawingColor = 'red' | 'white' | 'calipso' | 'fucsia' | 'purple';

const COLOR_MAP: Record<DrawingColor, string> = {
  red: '#ef4444',
  white: '#ffffff',
  calipso: '#28c4d8',
  fucsia: '#e91e8c',
  purple: '#a855f7',
};

export type StrokeWidth = 2 | 4 | 6;

export function useDrawingMode() {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState<DrawingColor>('red');
  const [strokeWidth, setStrokeWidthState] = useState<StrokeWidth>(4);

  const toggleDrawingMode = useCallback(() => {
    setIsDrawingMode(prev => !prev);
  }, []);

  const setColor = useCallback((color: DrawingColor) => {
    setDrawingColor(color);
  }, []);

  const setStrokeWidth = useCallback((width: StrokeWidth) => {
    setStrokeWidthState(width);
  }, []);

  const getColorHex = useCallback(() => {
    return COLOR_MAP[drawingColor];
  }, [drawingColor]);

  const getStrokeWidth = useCallback(() => strokeWidth, [strokeWidth]);

  return {
    isDrawingMode,
    drawingColor,
    strokeWidth,
    toggleDrawingMode,
    setColor,
    setStrokeWidth,
    getColorHex,
    getStrokeWidth,
  };
}
