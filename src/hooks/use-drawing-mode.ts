'use client';

import { useState, useCallback, useEffect } from 'react';

export type DrawingColor = 'black' | 'teal' | 'red' | 'lime' | 'purple';

const COLOR_MAP: Record<DrawingColor, string> = {
  black: '#000000',
  teal: '#14b8a6',
  red: '#ef4444',
  lime: '#84cc16',
  purple: '#a855f7',
};

export type StrokeWidth = 2 | 4 | 6;

export function useDrawingMode() {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState<DrawingColor>('black');
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
