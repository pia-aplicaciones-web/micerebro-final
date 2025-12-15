// src/components/canvas/elements/drawing-element.tsx
import React from 'react';
import type { CommonElementProps } from '@/lib/types'; 

export default function DrawingElement(props: CommonElementProps) {
  const { id, x, y, width, height, properties, isSelected, onSelectElement, scale, offset } = props;
  const rotation = properties?.rotation || 0;

  const positionStyle = {
    left: x * scale + (offset?.x || 0),
    top: y * scale + (offset?.y || 0),
    width: width * scale,
    height: height * scale,
    transform: `rotate(${rotation || 0}deg)`,
    zIndex: props.zIndex || 1,
  };

  return (
    <div
      id={id}
      className={`absolute border border-dashed ${isSelected ? 'border-purple-500' : 'border-gray-400'} bg-transparent`}
      style={positionStyle}
      onMouseDown={(e) => onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey)}
    >
      <span className="text-xs text-gray-500 p-1">Dibujo (ID: {id.substring(0,4)})</span>
      {/* Aquí iría el SVG o Canvas de tu dibujo */}
    </div>
  );
};
