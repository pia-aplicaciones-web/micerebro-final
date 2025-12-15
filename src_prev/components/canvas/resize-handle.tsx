// src/components/canvas/resize-handle.tsx
'use client';

import React from 'react';

export interface ResizeHandleProps {
  type: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
  onResize: (e: React.MouseEvent, type: string) => void;
  onResizeStop: (e: React.MouseEvent, type: string) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ type, onResize, onResizeStop }) => {
  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: '10px',
    height: '10px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #6366F1',
    borderRadius: '2px',
    pointerEvents: 'auto',
  };

  const currentStyle = ((): React.CSSProperties => {
    switch (type) {
      case 'tl': return { top: -5, left: -5, cursor: 'nwse-resize' };
      case 'tr': return { top: -5, right: -5, cursor: 'nesw-resize' };
      case 'bl': return { bottom: -5, left: -5, cursor: 'nesw-resize' };
      case 'br': return { bottom: -5, right: -5, cursor: 'nwse-resize' };
      case 't':  return { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'b':  return { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' };
      case 'l':  return { left: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' };
      case 'r':  return { right: -5, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' };
      default: return {}; // Fallback
    }
  })();


  return (
    <div
      style={{ ...handleStyle, ...currentStyle }}
      onMouseDown={(e) => onResize(e, type)}
      onMouseUp={(e) => onResizeStop(e, type)}
    />
  );
};

export default ResizeHandle;
