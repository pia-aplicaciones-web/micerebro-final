// src/components/canvas/element-resizer.tsx
'use client';

import React from 'react';
import { Rnd } from 'react-rnd';
import type { WithId, CanvasElement } from '@/lib/types';

export interface ElementResizerProps {
  element: WithId<CanvasElement>;
  children: React.ReactNode;
  scale: number;
  onResize: (elementId: string, delta: { x: number; y: number; width: number; height: number; }) => void;
  onResizeStop: (elementId: string, finalRect: { x: number; y: number; width: number; height: number; }) => void;
}

const ElementResizer: React.FC<ElementResizerProps> = ({
  element,
  children,
  scale,
  onResize,
  onResizeStop,
}) => {
  const currentWidth = element.width * scale;
  const currentHeight = element.height * scale;
  const currentX = element.x * scale;
  const currentY = element.y * scale;

  return (
    <Rnd
      size={{ width: currentWidth, height: currentHeight }}
      position={{ x: currentX, y: currentY }}
      scale={scale}
      onResize={(e, direction, ref, delta, position) => {
        const newWidth = ref.offsetWidth / scale;
        const newHeight = ref.offsetHeight / scale;
        const newX = position.x / scale;
        const newY = position.y / scale;

        onResize(element.id, { x: newX, y: newY, width: newWidth, height: newHeight });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        const finalWidth = ref.offsetWidth / scale;
        const finalHeight = ref.offsetHeight / scale;
        const finalX = position.x / scale;
        const finalY = position.y / scale;

        onResizeStop(element.id, { x: finalX, y: finalY, width: finalWidth, height: finalHeight });
      }}
      minWidth={50 * scale}
      minHeight={50 * scale}
      bounds="parent"
      style={{
        zIndex: element.zIndex || 1,
        pointerEvents: 'auto',
      }}
    >
      {children}
    </Rnd>
  );
};

export default ElementResizer;
