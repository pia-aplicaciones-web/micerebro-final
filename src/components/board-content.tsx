// src/components/board-content.tsx

'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { AnimatePresence, motion } from 'framer-motion';
import { Rnd } from 'react-rnd';
import { ChevronDown } from 'lucide-react';

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
import LibretaElement from '@/components/canvas/elements/libreta-element';

import { useCanvasDragAndDrop } from '@/lib/hooks/useCanvasDragAndDrop';
import { useSelection } from '@/lib/hooks/useSelection';
import { useZoomPan } from '@/lib/hooks/useZoomPan';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';

import FormattingToolbar from '@/components/canvas/formatting-toolbar';
// import ResizeHandle from '@/components/canvas/resize-handle'; // REMOVIDO - ya no se usa 

interface BoardContentProps {
  boardId: string;
  elements: WithId<CanvasElement>[];
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void;
  onElementDelete: (elementId: string) => void;
  onElementAdd: (element: CanvasElement) => void;
  onSelectElement: (elementId: string | null, isMultiSelect: boolean) => void;
  selectedElementIds: string[];
}

const ELEMENT_COMPONENTS: Partial<{ [key in CanvasElement['type']]: React.FC<CommonElementProps> }> = {
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
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartPos, setResizeStartPos] = useState<Point | null>(null);
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(null);

  // Función para manejar el redimensionamiento
  const handleResize = useCallback((elementId: string, newSize: { width: number; height: number }) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    // Asegurar dimensiones mínimas
    const finalWidth = Math.max(50, newSize.width);
    const finalHeight = Math.max(50, newSize.height);

    onElementUpdate(elementId, {
      width: finalWidth,
      height: finalHeight,
      properties: {
        ...element.properties,
        size: { width: finalWidth, height: finalHeight }
      }
    });
  }, [elements, onElementUpdate]);

  // Handlers para mouse events durante redimensionamiento
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartPos || !originalSize || selectedElementIds.length !== 1) return;

      // Calcular nuevas dimensiones basadas en el movimiento del mouse
      const deltaX = (e.clientX - resizeStartPos.x) / scale;
      const deltaY = (e.clientY - resizeStartPos.y) / scale;

      const newWidth = originalSize.width + deltaX;
      const newHeight = originalSize.height + deltaY;

      handleResize(selectedElementIds[0], { width: newWidth, height: newHeight });
      console.log('📏 Redimensionando:', { newWidth, newHeight, deltaX, deltaY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeStartPos(null);
      setOriginalSize(null);
      console.log('✅ Redimensionamiento completado');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartPos, selectedElementIds, scale, handleResize]);

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

  // Funciones intermediarias para el cambio de tamaño
  const onResize = (e: React.MouseEvent, type: string) => {
    // Aquí necesitarías una lógica para identificar qué elemento se está redimensionando,
    // probablemente basado en `selectionBounds` o `selectedElementIds`.
    // Por simplicidad, asumiremos un solo elemento seleccionado.
    const elementId = selectedElementIds[0];
    if (!elementId) return;

    // La lógica para calcular el 'delta' dependerá de cómo se implemente el arrastre.
    // Esto es una simplificación y podría necesitar ajustes.
    const delta = { x: e.movementX / scale, y: e.movementY / scale, width: e.movementX / scale, height: e.movementY / scale };
    handleResize(elementId, delta);
  };

  const onResizeStop = (e: React.MouseEvent, type: string) => {
    const elementId = selectedElementIds[0];
    if (!elementId) return;

    // Similar a onResize, la lógica para `finalRect` necesita ser implementada.
    // Esto es una simplificación.
    const finalRect = { x: 0, y: 0, width: 0, height: 0 }; // Necesitarías calcular esto
    handleResizeStop(elementId, finalRect);
  };



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
        isListening={false}
        finalTranscript={''}
        interimTranscript={''}
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

        {selectedElementIds.length > 0 && selectionBounds && (
          <AnimatePresence>
            <motion.div
              key="selection-handles"
              className="absolute pointer-events-none"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                left: selectionBounds.x,
                top: selectionBounds.y,
                width: selectionBounds.width,
                height: selectionBounds.height,
                border: '1px dashed #6366F1',
              }}
            >
              {/* Botón de redimensionamiento en esquina inferior derecha */}
              {selectedElementIds.length === 1 && selectionBounds && (() => {
                console.log('🔵 BOTÓN DE REDIMENSIONAMIENTO ACTIVO para elemento:', selectedElementIds[0]);
                return true;
              })() && (
                  <div className="absolute bottom-1 right-1 pointer-events-auto">
                    {/* Indicador visual del botón de redimensionamiento */}
                    <div className="relative group">
                      {/* Indicador adicional para hacer el botón más visible */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                        Click y arrastra para redimensionar
                      </div>
                      <button
                        className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center cursor-se-resize border border-gray-300 shadow-sm hover:bg-gray-200 transition-colors z-50"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();

                          // Iniciar modo de redimensionamiento
                          setIsResizing(true);

                          const elementId = selectedElementIds[0];
                          const element = elements.find(el => el.id === elementId);
                          if (element) {
                            setResizeStartPos({ x: e.clientX, y: e.clientY });
                            setOriginalSize({
                              width: element.width || 200,
                              height: element.height || 150
                            });
                          }

                          console.log('🔄 Iniciando redimensionamiento del elemento:', elementId, {
                            originalSize,
                            element: { width: element.width, height: element.height }
                          });
                        }}
                        title="Redimensionar elemento (arrastrar para cambiar tamaño)"
                        onMouseEnter={() => console.log('🎯 Cursor sobre botón de redimensionamiento')}
                        onMouseLeave={() => console.log('👋 Cursor salió del botón de redimensionamiento')}
                      >
                        <ChevronDown className="w-3 h-3 text-gray-600" />
                      </button>
                    </div>
              )}
                  </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Creative Moodboard Panel */}
    </div>
  );
};

export default BoardContent;