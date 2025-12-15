// src/components/canvas/elements-panel.tsx
import React, { useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import type { CanvasElement, ContainerContent, WithId, CommonElementProps } from '@/lib/types';
import { GripVertical, Maximize, Minus, Trash2, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Rnd } from 'react-rnd';

// CRÍTICO: IMPORTACIONES DIRECTAS - Cambiar de lazy a imports directos para evitar problemas con chunks de webpack
// Esto previene errores como "Cannot find module './586.js'" durante desarrollo
import ElementCardContent from './element-card-content';
import ElementCardDetails from './element-card-details';

interface ElementsPanelProps {
  column: WithId<CanvasElement>;
  allElements: WithId<CanvasElement>[];
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
  onLocateElement: (id: string) => void;
  onEditElement: (id: string) => void;
  onActivateDrag: (id: string) => void;
  activatedElementId: string | null;
  unanchorElement: (id: string) => void; 
}

const dummyFunction = () => { /* noop */ }; 

export default function ElementsPanel({
  column,
  allElements,
  onUpdate,
  onDelete,
  onLocateElement,
  onEditElement,
  onActivateDrag,
  activatedElementId,
  unanchorElement,
}: ElementsPanelProps) {
  const elementsInColumn = useMemo(() => {
    const content = column.content as ContainerContent;
    if (!content || !content.elementIds) return [];
    return content.elementIds
      .map(id => allElements.find(el => el.id === id))
      .filter((el): el is WithId<CanvasElement> => el !== undefined);
  }, [column, allElements]);

  const handleMinimize = () => {
    onUpdate(column.id, { hidden: !column.hidden });
  };

  const handleMaximize = () => {
    console.log("Maximizing column", column.id);
  };

  const handleUnanchor = (elementId: string) => {
    unanchorElement(elementId);
  };

  const columnIsHidden = column.hidden;
  
  // Obtener el layout de la columna (single o double)
  const columnProps = typeof column.properties === 'object' && column.properties !== null ? column.properties : {};
  const layout = columnProps.layout || 'single';
  
  // Acceder directamente a las propiedades de column
  const initialX = column.x || (window.innerWidth - 320);
  const initialY = column.y || 20;
  const initialWidth = typeof column.width === 'number' ? column.width : 300;
  const initialHeight = typeof column.height === 'number' ? column.height : 600;
  const initialZIndex = column.zIndex || 1000;

  return (
    <Rnd
      default={{
        x: initialX,
        y: initialY,
        width: initialWidth,
        height: initialHeight,
      }}
      size={{
        width: initialWidth,
        height: initialHeight,
      }}
      onDragStop={(e, d) => onUpdate(column.id, { x: d.x, y: d.y })}
      onResizeStop={(e, dir, ref, delta, position) => {
        onUpdate(column.id, {
          width: parseFloat(ref.style.width),
          height: parseFloat(ref.style.height),
          x: position.x,
          y: position.y
        });
      }}
      minWidth={200}
      minHeight={150}
      bounds="parent"
      className={cn(
        "bg-card border shadow-lg rounded-lg flex flex-col overflow-hidden",
        activatedElementId === column.id && "ring-2 ring-primary ring-offset-2"
      )}
      style={{ zIndex: initialZIndex }}
      onMouseDown={() => onActivateDrag(column.id)}
    >
      <CardHeader className="flex flex-row items-center justify-between p-2 cursor-grab drag-handle">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">{(column.content as ContainerContent)?.title || "Contenedor"}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleMinimize}>
            {columnIsHidden ? <Maximize className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onDelete(column.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!columnIsHidden && (
        <div className="flex-grow p-2 overflow-y-auto">
          {elementsInColumn.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm mt-4">Arrastra elementos aquí.</p>
          ) : (
            <div className={cn(
              "grid gap-2",
              layout === 'double' ? "grid-cols-2" : "grid-cols-1"
            )}>
              {elementsInColumn.map((element) => (
                <Card
                  key={element.id}
                  className={cn(
                    "p-2 flex flex-col gap-1 hover:bg-muted/50 transition-colors cursor-pointer",
                    activatedElementId === element.id && "ring-2 ring-primary ring-offset-2"
                  )}
                  onMouseDown={(e) => { e.stopPropagation(); onEditElement(element.id); }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    // Centrar vista en el elemento al hacer doble clic
                    const elementProps = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
                    const position = elementProps.position || { x: element.x || 0, y: element.y || 0 };
                    // Si el elemento tiene posición guardada, centrar en esa posición
                    if (position.x !== undefined && position.y !== undefined) {
                      onLocateElement(element.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="capitalize text-xs">{element.type}</span>
                    <div className="flex gap-1">
                      {element.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: element.color }}
                          title={`Color: ${element.color}`}
                        />
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleUnanchor(element.id); }}>
                        <Unlink className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(element.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <ElementCardContent
                    element={element}
                    onUpdate={onUpdate}
                    onEditComment={dummyFunction}
                    onOpenNotepad={dummyFunction}
                    onLocateElement={onLocateElement}
                  />
                  <ElementCardDetails
                    element={element}
                    onUpdate={onUpdate}
                    onLocateElement={onLocateElement}
                  />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </Rnd>
  );
}
