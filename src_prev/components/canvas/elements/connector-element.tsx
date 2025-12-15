// src/components/canvas/elements/connector-element.tsx

import React from 'react';
import type { CommonElementProps, ConnectorContent, WithId, CanvasElement } from '@/lib/types';
import { cn } from '@/lib/utils';

// Helper function: calcula el centro de un elemento
function getElementCenter(element: WithId<CanvasElement>): { x: number; y: number } | null {
    if (typeof element.x !== 'number' || typeof element.y !== 'number' ||
        typeof element.width !== 'number' || typeof element.height !== 'number') {
        return null;
    }

    return {
        x: element.x + element.width / 2,
        y: element.y + element.height / 2
    };
}

export default function ConnectorElement(props: CommonElementProps) {
  const { allElements, isSelected, content, scale, offset, onSelectElement, id } = props; 
  const { fromElementId, toElementId, label, color } = content as ConnectorContent;
  
  if (!fromElementId || !toElementId || !allElements) {
    return null;
  }

  const fromElement = allElements.find(el => el.id === fromElementId);
  const toElement = allElements.find(el => el.id === toElementId);

  if (!fromElement || !toElement) {
    return null;
  }

  const fromCenter = getElementCenter(fromElement);
  const toCenter = getElementCenter(toElement);

  if (!fromCenter || !toCenter) {
    return null;
  }

  // Aplicar escala y offset a las coordenadas del conector
  const scaledFromX = fromCenter.x * scale + (offset?.x || 0);
  const scaledFromY = fromCenter.y * scale + (offset?.y || 0);
  const scaledToX = toCenter.x * scale + (offset?.x || 0);
  const scaledToY = toCenter.y * scale + (offset?.y || 0);

  const lineProps = {
    x1: scaledFromX,
    y1: scaledFromY,
    x2: scaledToX,
    y2: scaledToY,
    stroke: color || "hsl(var(--foreground))",
    strokeWidth: 2,
    markerEnd: "url(#arrowhead)",
  };

  return (
    <g className={cn("connector", { "selected": isSelected })} onMouseDown={(e) => onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey)}>
      <line {...lineProps} />
      {label && (
        <text
          x={(scaledFromX + scaledToX) / 2}
          y={(scaledFromY + scaledToY) / 2}
          fill={color || "hsl(var(--foreground))"}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          className="pointer-events-none"
        >
          {label}
        </text>
      )}
    </g>
  );
};
