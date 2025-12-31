
'use client';

import React, { useCallback, useState } from 'react';
import type { CanvasElement, WithId, ElementType, CanvasElementProperties, ContainerContent, CommonElementProps, Point, ElementContent, BaseVisualProperties, StickyCanvasElement, NotepadCanvasElement, NotepadSimpleCanvasElement } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Rnd, type DraggableData, type ResizableDelta, type Position, type RndDragEvent } from 'react-rnd';
import { Button } from '@/components/ui/button';
import DeleteElementDialog from './elements/delete-element-dialog';

// IMPORTACIONES DIRECTAS: Cambiar de lazy a imports directos para evitar problemas con chunks de webpack
// Esto previene errores como "Cannot find module './948.js'" durante desarrollo
import NotepadElement from './elements/notepad-element';
import StickyNoteElement from './elements/sticky-note-element';
import TodoListElement from './elements/todo-list-element';
import ImageElement from './elements/image-element';
import TextElement from './elements/text-element';
import CommentElement from './elements/comment-element';
import CommentBubbleElement from './elements/comment-bubble-element';
import MoodboardElement from './elements/moodboard-element';
import GalleryElement from './elements/gallery-element';
import YellowNotepadElement from './elements/yellow-notepad-element';
import StopwatchElement from './elements/stopwatch-element';
import HighlightTextElement from './elements/highlight-text-element';
import PomodoroTimerElement from './elements/pomodoro-timer-element';
import WeeklyPlannerElement from './elements/weekly-planner-element';
import VerticalWeeklyPlannerElement from './elements/vertical-weekly-planner-element';
import WeeklyMenuElement from './elements/weekly-menu-element';
import ContainerElement from './elements/container-element';
import LocatorElement from './elements/locator-element';
import ImageFrameElement from './elements/image-frame-element';
import PhotoGridElement from './elements/photo-grid-element';
import CommentSmallElement from './elements/comment-small-element';
import CommentRElement from './elements/comment-r-element';
import PhotoGridHorizontalElement from './elements/photo-grid-horizontal-element';
import PhotoGridAdaptiveElement from './elements/photo-grid-adaptive-element';
import PhotoGridFreeElement from './elements/photo-grid-free-element';
import LibretaElement from './elements/libreta-element';
import NotesElement from './elements/notes-element';
import MiniElement from './elements/mini-element';
import CountdownElement from './elements/countdown-element';

const ElementComponentMap: { [key: string]: React.FC<CommonElementProps> } = {
  notepad: NotepadElement,
  sticky: StickyNoteElement,
  todo: TodoListElement,
  image: ImageElement,
  text: TextElement,
  comment: CommentElement,
  'comment-small': CommentElement, // Usa mismo componente con fontSize diferente
  'comment-r': CommentRElement,
  'comment-r': CommentRElement,
  moodboard: MoodboardElement,
  gallery: GalleryElement,
  'yellow-notepad': YellowNotepadElement,
  stopwatch: StopwatchElement,
  'highlight-text': HighlightTextElement,
  'pomodoro-timer': PomodoroTimerElement,
  'weekly-planner': WeeklyPlannerElement,
  'vertical-weekly-planner': VerticalWeeklyPlannerElement,
  'weekly-menu': WeeklyMenuElement,
  container: ContainerElement,
  'two-columns': ContainerElement,
  locator: LocatorElement,
  'image-frame': ImageFrameElement,
  'photo-grid': PhotoGridElement,
  'photo-grid-horizontal': PhotoGridHorizontalElement,
  'photo-grid-adaptive': PhotoGridAdaptiveElement,
  'photo-grid-free': PhotoGridFreeElement,
  'libreta': LibretaElement,
  'comment-small': CommentSmallElement,
  'notes': NotesElement,
  'mini': MiniElement,
  'countdown': CountdownElement,
};

type TransformableElementProps = {
  element: WithId<CanvasElement>;
  allElements: WithId<CanvasElement>[];
  scale: number;
  offset?: Point;
  isSelected: boolean;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  unanchorElement: (id: string) => void;
  deleteElement: (id: string) => void;
  onFormatToggle: () => void;
  onChangeNotepadFormat: (id: string) => void;
  onLocateElement: (elementId: string) => void;
  onSelectElement: (id: string | null, isMultiSelect: boolean) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onMoveBackward: (id: string) => void;
  onEditElement: (id: string) => void;
  onGroupElements: (frameId: string) => void;
  addElement: (type: ElementType, props?: { color?: string; content?: ElementContent; properties?: CanvasElementProperties; parentId?: string; tags?: string[] }) => Promise<string>;
  activatedElementId: string | null;
  onActivateDrag: (id: string) => void;
  onEditComment: (element: WithId<CanvasElement>) => void;
  onDuplicateElement: (elementId: string) => void;
  onUngroup: (groupId: string) => void;
  setIsDirty: (isDirty: boolean) => void;
  boardId: string;
  isListening?: boolean;
  liveTranscript?: string;
  finalTranscript?: string;
  interimTranscript?: string;
  user?: any;
  storage?: any;
  toast?: any;
  isPreview?: boolean;
};

const migrateElement = (element: WithId<CanvasElement>): WithId<CanvasElement> => {
    if (typeof element.properties === 'object' && element.properties !== null && 'position' in element.properties && 'size' in element.properties && 'zIndex' in element.properties) {
      return element;
    }
    
    const existingProps = (typeof element.properties === 'object' && element.properties !== null) ? element.properties : {};
    const legacyX = 'x' in element ? (element as BaseVisualProperties).x : undefined;
    const legacyY = 'y' in element ? (element as BaseVisualProperties).y : undefined;
    const legacyWidth = 'width' in element ? (element as BaseVisualProperties).width : undefined;
    const legacyHeight = 'height' in element ? (element as BaseVisualProperties).height : undefined;
    const legacyZIndex = 'zIndex' in element ? (element as BaseVisualProperties).zIndex : undefined;

    return {
      ...element,
      properties: {
        position: existingProps.position || { x: legacyX || 100, y: legacyY || 100 },
        size: existingProps.size || { width: legacyWidth || 200, height: legacyHeight || 150 },
        zIndex: existingProps.zIndex ?? legacyZIndex ?? 1,
        rotation: existingProps.rotation || 0,
        ...existingProps,
      },
    };
};


export default function TransformableElement({
  element: initialElement,
  allElements,
  scale,
  offset = { x: 0, y: 0 },
  isSelected,
  updateElement,
  unanchorElement,
  deleteElement,
  onFormatToggle,
  onChangeNotepadFormat,
  onLocateElement,
  onSelectElement,
  onBringToFront,
  onSendToBack,
  onMoveBackward,
  onEditElement,
  onGroupElements,
  addElement,
  activatedElementId,
  onActivateDrag,
  onEditComment,
  onDuplicateElement,
  onUngroup,
  setIsDirty,
  boardId,
  isListening,
  liveTranscript,
  finalTranscript,
  interimTranscript,
  user,
  storage,
  toast,
  isPreview = false,
}: TransformableElementProps) {
  
  const element = migrateElement(initialElement);
  
  // ✅ CRÍTICO: TODOS LOS HOOKS DEBEN IR ANTES DE CUALQUIER EARLY RETURN
  // REGLA #2: Estado para diálogo de confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Extraer posición y tamaño de properties para uso consistente
  const elementProps = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
  const position = (element.parentId && elementProps.relativePosition) ? elementProps.relativePosition : (elementProps.position || { x: element.x || 0, y: element.y || 0 });
  const size = elementProps.size || { width: element.width || 200, height: element.height || 150 };
  const rotation = elementProps.rotation ?? element.rotation ?? 0;
  // REGLA GENERAL: Elementos de cuadernos inician con zIndex -1, pasan al frente cuando se seleccionan
  const isNotebookElement = ['notepad', 'yellow-notepad', 'notes', 'mini', 'container', 'two-columns', 'libreta'].includes(element.type);
  const baseZIndex = isNotebookElement ? -1 : (elementProps.zIndex ?? element.zIndex ?? 1);
  const zIndex = isSelected ? 999 : baseZIndex;
  
  // Asegurar que size tenga valores numéricos válidos
  // Para pomodoro-timer usar ancho fijo de 180px
  const safeSize = {
    width: element.type === 'pomodoro-timer' ? 180 : (typeof size.width === 'number' && size.width > 0 ? size.width : 200),
    height: typeof size.height === 'number' && size.height > 0 ? size.height : 150
  };
  
  const handleMouseDown = (e: MouseEvent) => {
    onSelectElement(element.id, e.altKey || e.shiftKey || e.metaKey || e.ctrlKey);
  };
  
  const onDragStop = useCallback((e: RndDragEvent, d: DraggableData) => {
    const newPosition = { x: d.x, y: d.y };
    const safeProperties = (typeof element.properties === 'object' && element.properties !== null ? element.properties : {}) as CanvasElementProperties;
    
    // Intento de anclar a contenedor si se suelta sobre uno
    const containers = allElements?.filter(el => el.type === 'container' || el.type === 'two-columns') || [];
    // Usar esquina superior izquierda para detectar contenedor (regla especial)
    const elementRect = {
      x: newPosition.x,
      y: newPosition.y,
      width: safeSize.width,
      height: safeSize.height,
    };
    const targetContainer = containers.find((c) => {
      const cProps = (typeof c.properties === 'object' && c.properties !== null ? c.properties : {}) as CanvasElementProperties;
      const cPos = cProps.position || { x: c.x || 0, y: c.y || 0 };
      const cSize = cProps.size || { width: c.width || 300, height: c.height || 300 };
      const cw = typeof cSize.width === 'number' ? cSize.width : parseFloat(String(cSize.width));
      const ch = typeof cSize.height === 'number' ? cSize.height : parseFloat(String(cSize.height));
      // Chequear esquina superior izquierda del elemento dentro del contenedor
      return (
        elementRect.x >= cPos.x &&
        elementRect.x <= cPos.x + cw &&
        elementRect.y >= cPos.y &&
        elementRect.y <= cPos.y + ch
      );
    });

    if (targetContainer && element.type !== 'container' && element.type !== 'two-columns') {
      const cProps = (typeof targetContainer.properties === 'object' && targetContainer.properties !== null ? targetContainer.properties : {}) as CanvasElementProperties;
      const cPos = cProps.position || { x: targetContainer.x || 0, y: targetContainer.y || 0 };
      const relPos = { x: elementRect.x - cPos.x, y: elementRect.y - cPos.y };

      // Actualizar elemento: anclar al contenedor
      updateElement(element.id, { 
        parentId: targetContainer.id,
        hidden: true,
        properties: { 
          ...safeProperties, 
          position: elementRect, 
          relativePosition: relPos 
        } 
      });

      // Actualizar contenedor: agregar elementId
      const containerContent = (typeof targetContainer.content === 'object' && targetContainer.content !== null
        ? { ...(targetContainer.content as any) }
        : { title: 'Nuevo Contenedor', elementIds: [], layout: 'single' });
      const currentIds: string[] = Array.isArray(containerContent.elementIds) ? containerContent.elementIds : [];
      if (!currentIds.includes(element.id)) {
        updateElement(targetContainer.id, { 
          content: { 
            ...containerContent, 
            elementIds: [...currentIds, element.id] 
          } as any 
        });
      }
      return;
    }

    // Si no se soltó sobre contenedor: comportamiento normal
    const props = { ...safeProperties, position: newPosition, relativePosition: null };
    Object.keys(props).forEach((k) => {
      if ((props as any)[k] === undefined) delete (props as any)[k];
    });
    updateElement(element.id, { 
      parentId: null,
      hidden: false,
      x: newPosition.x,
      y: newPosition.y,
      properties: props,
    });
  }, [element, updateElement, allElements, safeSize.width, safeSize.height]);

  const onResizeStop = useCallback((e: MouseEvent | TouchEvent, direction: string, ref: HTMLElement, delta: ResizableDelta, newPosition: Position) => {
    const safeProperties = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
    
    const newSize = { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height) };
    const finalPosition = element.parentId ? newPosition : { x: newPosition.x, y: newPosition.y };
    const updates: Partial<CanvasElement> = { 
      properties: { 
        ...safeProperties, 
        size: newSize, 
        ...(element.parentId ? { relativePosition: finalPosition } : { position: finalPosition })
      } 
    };

    updateElement(element.id, updates);
  }, [element, updateElement]);
  
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDeleteDialogOpen(true);
  }, []);
  
  const handleDeleteConfirm = useCallback(() => {
    if (deleteElement) {
      deleteElement(element.id);
    }
    setIsDeleteDialogOpen(false);
  }, [deleteElement, element.id]);

  // ✅ EARLY RETURNS DESPUÉS DE TODOS LOS HOOKS
  const ElementComponent = ElementComponentMap[element.type as keyof typeof ElementComponentMap];
  
  if (!ElementComponent) {
    console.warn(`ElementComponent no encontrado para tipo: ${element.type}`);
    return null;
  }
  
  if (!safeSize || typeof safeSize.width !== 'number' || typeof safeSize.height !== 'number') {
    console.warn(`Tamaño inválido para elemento ${element.id}:`, safeSize);
    return null;
  }

  const isGroupedFrame = false;

  const handleDragStart = useCallback((e: RndDragEvent) => {
    // Configurar dataTransfer para drag and drop hacia otros elementos (como galería)
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/element-id', element.id);
      e.dataTransfer.effectAllowed = 'copy';
    }
  }, [element.id]);

  const rndProps = {
      style: {
        zIndex: zIndex,
        border: isSelected && element.type !== 'pomodoro-timer' ? '2px solid hsl(var(--primary))' : 'none',
        boxSizing: 'border-box' as 'border-box',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      },
      size: { width: safeSize.width, height: safeSize.height },
      position: position,
      onDragStart: handleDragStart,
      onDragStop: onDragStop,
      onResizeStop: onResizeStop,
      minWidth: 50,
      minHeight: 50,
      dragHandleClassName: 'drag-handle',
      className: cn("focus:outline-none"),
      onMouseDown: handleMouseDown,
      enableResizing: !isGroupedFrame,
      scale: scale,
      bounds: element.parentId ? `[data-element-id="${element.parentId}"]` : undefined,
      resizeHandleStyles: {
        bottomRight: {
          width: 12,
          height: 12,
          right: -6,
          bottom: -6,
          backgroundColor: 'hsl(var(--primary))',
          border: '2px solid white',
          borderRadius: '2px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }
      }
  };
  
  return (
    <>
      <Rnd {...rndProps}>
        <div
          data-element-id={element.id}
          data-element-type={element.type}
          className="w-full h-full relative group"
        >

          <ElementComponent
              id={element.id}
              type={element.type}
              x={position.x}
              y={position.y}
                  width={size.width as number}
                  height={size.height as number}
                  rotation={rotation}
                  zIndex={zIndex}
                  content={element.type === 'sticky' && typeof element.content === 'string' ? { text: element.content } : element.content}
                  properties={element.properties}
                  color={element.color}
                  backgroundColor={element.backgroundColor}
                  hidden={element.hidden}
                  minimized={
                    element.type === 'notepad'
                      ? (element as NotepadCanvasElement).minimized
                      : undefined
                  }
                  tags={element.type === 'sticky' ? (element as StickyCanvasElement).tags : undefined}
                  parentId={element.parentId}
                  isSelected={isSelected}
                  onUpdate={updateElement}
                  deleteElement={deleteElement}
                  onSelectElement={onSelectElement}
                  onEditElement={onEditElement}
                  onFormatToggle={onFormatToggle}
                  onChangeNotepadFormat={onChangeNotepadFormat}
                  onLocateElement={onLocateElement}
                  allElements={allElements}
                  onBringToFront={onBringToFront}
                  onSendToBack={onSendToBack}
                  onMoveBackward={onMoveBackward}
                  onGroupElements={onGroupElements}
                  addElement={addElement}
                  activatedElementId={activatedElementId}
                  onActivateDrag={onActivateDrag}
                  onEditComment={onEditComment}
                  onDuplicateElement={onDuplicateElement}
                  onUngroup={() => onUngroup(element.id)}
                  setIsDirty={() => {}}
                  scale={scale}
                  offset={offset}
              boardId={boardId}
              isListening={isListening}
              liveTranscript={liveTranscript}
              finalTranscript={finalTranscript}
              interimTranscript={interimTranscript}
              {...(element.type === 'photo-grid-free' && {
                user,
                storage,
                toast
              })}
          />
        </div>
      </Rnd>
      
      {/* REGLA #2: Diálogo de confirmación de eliminación */}
      <DeleteElementDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
