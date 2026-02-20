'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { DrawingColor } from '@/hooks/use-drawing-mode';

const COLOR_MAP: Record<DrawingColor, string> = {
  red: '#ef4444',
  white: '#ffffff',
  calipso: '#28c4d8',
  fucsia: '#e91e8c',
  purple: '#a855f7',
};

interface DrawingModeContextType {
  isDrawingMode: boolean;
  drawingColor: DrawingColor;
  toggleDrawingMode: () => void;
  setColor: (color: DrawingColor) => void;
  getColorHex: () => string;
}

const DrawingModeContext = createContext<DrawingModeContextType | undefined>(undefined);

export function DrawingModeProvider({ children }: { children: ReactNode }) {
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingColor, setDrawingColor] = useState<DrawingColor>('red');

  const toggleDrawingMode = useCallback(() => {
    setIsDrawingMode(prev => !prev);
  }, []);

  const setColor = useCallback((color: DrawingColor) => {
    setDrawingColor(color);
  }, []);

  const getColorHex = useCallback(() => {
    return COLOR_MAP[drawingColor];
  }, [drawingColor]);

  return (
    <DrawingModeContext.Provider
      value={{
        isDrawingMode,
        drawingColor,
        toggleDrawingMode,
        setColor,
        getColorHex,
      }}
    >
      {children}
    </DrawingModeContext.Provider>
  );
}

export function useDrawingModeContext() {
  const context = useContext(DrawingModeContext);
  if (!context) {
    throw new Error('useDrawingModeContext must be used within DrawingModeProvider');
  }
  return context;
}
