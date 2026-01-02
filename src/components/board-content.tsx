// src/components/board-content.tsx

'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { AnimatePresence, motion } from 'framer-motion';
import { Rnd } from 'react-rnd';

import type { WithId, CanvasElement, Point, CommonElementProps } from '@/lib/types';

import { useBoardStore } from '@/lib/store/boardStore';
import TextElement from '@/components/canvas/elements/text-element';
import StickyNoteElement from '@/components/canvas/elements/sticky-note-element';
import ImageElement from '@/components/canvas/elements/image-element';
import NotepadElement from '@/components/canvas/elements/notepad-element';
// import CuadernoElement from '@/components/canvas/elements/cuaderno'; // DESACTIVADO - causando problemas
import TodoListElement from '@/components/canvas/elements/todo-list-element';
import CommentElement from '@/components/canvas/elements/comment-element';
import MoodboardElement from '@/components/canvas/elements/moodboard-element';
import YellowNotepadElement from '@/components/canvas/elements/yellow-notepad-element';
import GalleryElement from '@/components/canvas/elements/gallery-element';
import WeeklyPlannerElement from '@/components/canvas/elements/weekly-planner-element';
import VerticalWeeklyPlannerElement from '@/components/canvas/elements/vertical-weekly-planner-element';
import PhotoGridElement from '@/components/canvas/elements/photo-grid-element';
import PhotoGridHorizontalElement from '@/components/canvas/elements/photo-grid-horizontal-element';
import PhotoGridAdaptiveElement from '@/components/canvas/elements/photo-grid-adaptive-element';
import PhotoGridFreeElement from '@/components/canvas/elements/photo-grid-free-element';
import PhotoCollageElement from '@/components/canvas/elements/photo-collage-element';
import PhotoCollageFreeElement from '@/components/canvas/elements/photo-collage-free-element';
import LibretaElement from '@/components/canvas/elements/libreta-element';

import { useCanvasDragAndDrop } from '@/lib/hooks/useCanvasDragAndDrop';
import { useSelection } from '@/lib/hooks/useSelection';
import { useZoomPan } from '@/lib/hooks/useZoomPan';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';

import FormattingToolbar from '@/components/canvas/formatting-toolbar';

interface BoardContentProps {
  boardId: string;
  elements: WithId<CanvasElement>[];
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void;
  onElementDelete: (elementId: string) => void;
  onElementAdd: (element: CanvasElement) => void;
  onSelectElement: (elementId: string | null, isMultiSelect: boolean) => void;
  selectedElementIds: string[];
}

const ELEMENT_COMPONENTS = {
  text: TextElement,
  sticky: StickyNoteElement,
  image: ImageElement,
  notepad: NotepadElement,
  // cuaderno: CuadernoElement, // DESACTIVADO - causando problemas
  todo: TodoListElement,
  comment: CommentElement,
  moodboard: MoodboardElement,
  gallery: GalleryElement,
  'yellow-notepad': YellowNotepadElement,
  'weekly-planner': WeeklyPlannerElement,
  'vertical-weekly-planner': VerticalWeeklyPlannerElement,
  'photo-grid': PhotoGridElement,
  'photo-grid-horizontal': PhotoGridHorizontalElement,
  'photo-grid-adaptive': PhotoGridAdaptiveElement,
  'photo-grid-free': PhotoGridFreeElement,
  'photo-collage': PhotoCollageElement,
  'photo-collage-free': PhotoCollageFreeElement,
  libreta: LibretaElement,
};


const BoardContent: React.FC<BoardContentProps> = ({
  boardId,
  elements,
  onElementUpdate,
  onElementDelete,
  onElementAdd,
  onSelectElement,
  selectedElementIds,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isFormattingToolbarOpen, setIsFormattingToolbarOpen] = useState(false);
  const [activeTextEditorId, setActiveTextEditorId] = useState<string | null>(null);


  const { scale, offset, panCanvas, zoomIn, zoomOut, resetZoomPan, panMode, setPanMode, clientToCanvas } = useZoomPan(canvasRef as React.RefObject<HTMLDivElement>);

  const { clearSelection, addSelection, removeSelection, isSelected, updateSelectionBounds, selectionBounds } = useSelection(
    selectedElementIds,
    (id) => onSelectElement(id, false),
    elements,
    canvasRef as React.RefObject<HTMLDivElement>,
    scale,
    offset
  );

  const {
    startDrag,
    handleDrag,
    handleDragStop,
    handleResize,
    handleResizeStop,
  } = useCanvasDragAndDrop({
    elements,
    onElementUpdate,
    onSelectElement: (id) => onSelectElement(id, false),
    canvasRef: canvasRef as React.RefObject<HTMLDivElement>,
    scale,
    offset,
    selectedElementIds,
    clearSelection,
    addSelection,
    updateSelectionBounds,
  });




  useKeyboardNavigation({
    elements,
    selectedElementIds,
    onElementUpdate,
    onElementDelete,
    onSelectElement: (id) => onSelectElement(id, false),
    canvasRef: canvasRef as React.RefObject<HTMLDivElement>,
    scale,
    offset,
    panCanvas,
  });

  useHotkeys('mod+=', () => zoomIn(), { enableOnFormTags: true }, [zoomIn]);
  useHotkeys('mod+-', () => zoomOut(), { enableOnFormTags: true }, [zoomOut]);
  useHotkeys('mod+0', () => resetZoomPan(), { enableOnFormTags: true }, [resetZoomPan]);
  useHotkeys('space', () => setPanMode(true), { keydown: true, preventDefault: true }, [setPanMode]);
  useHotkeys('space', () => setPanMode(false), { keyup: true, preventDefault: true }, [setPanMode]);
  useHotkeys('escape', () => { clearSelection(); setActiveTextEditorId(null); }, { enableOnFormTags: true }, [clearSelection]);

  const maxZIndex = useMemo(() => {
    if (!elements || elements.length === 0) return 1;
    const zIndexes = elements
      .filter(e => typeof e.zIndex === 'number')
      .map(e => e.zIndex!);
    return zIndexes.length > 0 ? Math.max(...zIndexes) + 1 : 2;
  }, [elements]);

  const onDuplicateElement = useCallback((elementId: string) => {
    const elementToDuplicate = elements.find(el => el.id === elementId);
    if (elementToDuplicate) {
      const newElement: WithId<CanvasElement> = {
        ...elementToDuplicate,
        id: Date.now().toString(),
        x: elementToDuplicate.x + 20,
        y: elementToDuplicate.y + 20,
        zIndex: maxZIndex,
      };
      onElementAdd(newElement);
      onSelectElement(newElement.id, false);
    }
  }, [elements, onElementAdd, onSelectElement, maxZIndex]);

  // CRÍTICO: Memoizar renderElement para evitar re-creaciones en cada render
  const renderElement = useCallback((element: WithId<CanvasElement>) => {
    const Component = ELEMENT_COMPONENTS[element.type];
    if (!Component) {
      console.warn(`Tipo de elemento no reconocido: ${element.type}`);
      return null;
    }

    // CRÍTICO: Pasar props directamente en lugar de crear objeto común
    // Esto evita crear nuevos objetos en cada render
    return (
      <Component
        key={element.id}
        {...element}
        scale={scale}
        offset={offset}
        isSelected={isSelected(element.id)}
        onSelectElement={onSelectElement}
        onUpdate={onElementUpdate}
        deleteElement={onElementDelete}
        onEditElement={(id: string) => setActiveTextEditorId(id)}
        onDuplicateElement={onDuplicateElement}
        allElements={elements}
        addElement={onElementAdd as any}
        setActiveTextEditorId={setActiveTextEditorId}
        isEditing={activeTextEditorId === element.id}
        onDoubleClick={(rect) => { }}
        onLocateElement={(elementId: string) => { /* lógica para localizar elemento */ }}
        onEditComment={(element: WithId<CanvasElement>) => { /* lógica para editar comentario */ }}
      />
    );
  }, [scale, offset, isSelected, onSelectElement, onElementUpdate, onElementDelete, onDuplicateElement, elements, onElementAdd, setActiveTextEditorId, activeTextEditorId]);

  return (
    <div
      ref={canvasRef}
      className={`relative w-full h-full overflow-hidden bg-dot-grid transition-cursor ${panMode ? 'cursor-grab-active' : 'cursor-grab'}`}
      style={{
        transform: `scale(${scale}) translate(${offset.x}px, ${offset.y}px)`,
        transformOrigin: '0 0',
      }}
      onMouseDown={startDrag}
      onMouseMove={handleDrag}
      onMouseUp={handleDragStop}
      onMouseLeave={handleDragStop}
      onWheel={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const point = clientToCanvas(e.clientX, e.clientY);
          if (e.deltaY < 0) zoomIn(point);
          else zoomOut(point);
        } else {
          panCanvas(0, -e.deltaY);
        }
      }}
      onClick={(e) => {
        if (e.target === canvasRef.current) clearSelection();
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${1 / scale}) translate(${-offset.x}px, ${-offset.y}px)`,
          transformOrigin: '0 0',
        }}
      >
        {elements.map(renderElement)}

      </div>

      {/* Creative Moodboard Panel */}
    </div>
  );
};

export default BoardContent;