// src/components/canvas/elements/element-handles.tsx
'use client';

import React from 'react';

// Define la interfaz de las propiedades que ElementHandles espera recibir.
// Estas props generalmente se usarían para posicionar los handles alrededor de un elemento.
export interface ElementHandlesProps {
  elementX: number;
  elementY: number;
  elementWidth: number;
  elementHeight: number;
  scale: number;
  offset: { x: number; y: number };
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent, type: string) => void; // Manejador para el inicio del arrastre de los handles
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
    return null; // Solo renderiza los handles si el elemento está seleccionado
  }

  // Calcula la posición y tamaño de los handles en relación con el canvas
  const handleSize = 8; // Tamaño de cada handle (cuadrado pequeño)
  const handleOffset = handleSize / 2;

  // Posiciona los handles en las esquinas y puntos medios de los bordes del elemento
  const handles = [
    // Esquinas
    { type: 'tl', style: { top: -handleOffset, left: -handleOffset, cursor: 'nwse-resize' } }, // Top-left
    { type: 'tr', style: { top: -handleOffset, right: -handleOffset, cursor: 'nesw-resize' } }, // Top-right
    { type: 'bl', style: { bottom: -handleOffset, left: -handleOffset, cursor: 'nesw-resize' } }, // Bottom-left
    { type: 'br', style: { bottom: -handleOffset, right: -handleOffset, cursor: 'nwse-resize' } }, // Bottom-right
    // Bordes
    { type: 't', style: { top: -handleOffset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } }, // Top
    { type: 'b', style: { bottom: -handleOffset, left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } }, // Bottom
    { type: 'l', style: { left: -handleOffset, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } }, // Left
    { type: 'r', style: { right: -handleOffset, top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } }, // Right
  ];

  return (
    <div
      style={{
        position: 'absolute',
        width: elementWidth * scale,
        height: elementHeight * scale,
        top: elementY * scale + offset.y,
        left: elementX * scale + offset.x,
        pointerEvents: 'none', // Los handles no deben bloquear el clic en el elemento
        border: '1px dashed #6366F1', // Borde de selección visible
      }}
    >
      {handles.map((handle) => (
        <div
          key={handle.type}
          style={{
            position: 'absolute',
            width: handleSize,
            height: handleSize,
            backgroundColor: '#FFFFFF', // Color del cuadrado del handle
            border: '1px solid #6366F1', // Borde del handle
            pointerEvents: 'auto', // Los handles sí son clickeables
            ...handle.style,
          }}
          onMouseDown={(e) => onMouseDown(e, handle.type)} // Pasa el tipo de handle al manejador
        />
      ))}
    </div>
  );
};

export default ElementHandles;