// src/components/canvas/element-handles.tsx
'use client';

import React from 'react';

export interface ElementHandlesProps {
  elementX: number;
  elementY: number;
  elementWidth: number;
  elementHeight: number;
  scale: number;
  offset: { x: number; y: number };
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, type: string) => void;
}

const ElementHandles: React.FC<ElementHandlesProps> = ({
  elementX,
  elementY,
  elementWidth,
  elementHeight,
  scale,
  offset,
  isSelected,
  onMouseDown,
}) => {
  if (!isSelected) {
    return null;
  }

  const handleSize = 8;
  const handleOffset = handleSize / 2;

  const handles = [
    { type: 'tl', style: { top: -handleOffset, left: -handleOffset, cursor: 'nwse-resize' } },
    { type: 'tr', style: { top: -handleOffset, right: -handleOffset, cursor: 'nesw-resize' } },
    { type: 'bl', style: { bottom: -handleOffset, left: -handleOffset, cursor: 'nesw-resize' } },
    { type: 'br', style: { bottom: -handleOffset, right: -handleOffset, cursor: 'nwse-resize' } },
    { type: 't', style: { top: -handleOffset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
    { type: 'b', style: { bottom: -handleOffset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
    { type: 'l', style: { left: -handleOffset, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
    { type: 'r', style: { right: -handleOffset, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        width: elementWidth * scale,
        height: elementHeight * scale,
        top: elementY * scale + offset.y,
        left: elementX * scale + offset.x,
        pointerEvents: 'none',
        border: '1px dashed #6366F1',
      }}
    >
      {handles.map((handle) => (
        <div
          key={handle.type}
          style={{
            position: 'absolute',
            width: handleSize,
            height: handleSize,
            backgroundColor: '#FFFFFF',
            border: '1px solid #6366F1',
            pointerEvents: 'auto',
            ...handle.style,
          }}
          onMouseDown={(e) => onMouseDown(e, handle.type)}
        />
      ))}
    </div>
  );
};

export default ElementHandles;
