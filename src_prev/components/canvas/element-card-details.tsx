// src/components/canvas/element-card-details.tsx
import React from 'react';
import type { WithId, CanvasElement, CanvasElementProperties } from '@/lib/types';

interface ElementCardDetailsProps {
  element: WithId<CanvasElement>;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onLocateElement: (id: string) => void;
}

const ElementCardDetails: React.FC<ElementCardDetailsProps> = ({
  element,
  onUpdate,
  onLocateElement,
}) => {
  const properties: CanvasElementProperties | undefined = element.properties;
  const position = properties?.position || { x: element.x, y: element.y };
  
  return (
    <div className="text-xs text-muted-foreground mt-1 pt-1 border-t border-dashed">
      <p>Propiedades: x:{position.x.toFixed(0)}, y:{position.y.toFixed(0)}</p>
      {/* Botones de acción, si los tiene */}
      {/* <button onClick={() => onLocateElement(element.id)}>Locate</button> */}
    </div>
  );
};

export default ElementCardDetails;