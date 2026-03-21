
'use client';

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import type { CanvasElement, WithId, ElementType, CanvasElementProperties, ContainerContent, CommonElementProps, Point, ElementContent, BaseVisualProperties, StickyCanvasElement, NotepadCanvasElement } from '@/lib/types';
import { cn } from '@/lib/utils';
import { shouldAllowTouchEdit } from '@/lib/touch-edit-guard';
import { Rnd, type DraggableData, type ResizableDelta, type Position, type RndDragEvent } from 'react-rnd';
import { Button } from '@/components/ui/button';
import DeleteElementDialog from './elements/delete-element-dialog';

// IMPORTACIONES DIRECTAS: Cambiar de lazy a imports directos para evitar problemas con chunks de webpack
// Esto previene errores como "Cannot find module './948.js'" durante desarrollo
import NotepadElement from './elements/notepad-element';
// import CuadernoElement from './elements/cuaderno'; // DESACTIVADO - causando problemas
import StickyNoteType2 from './elements/sticky-note-type2';
import TodoListElement from './elements/todo-list-element';
import ImageElement from './elements/image-element';
import TextElement from './elements/text-element';
import CommentElement from './elements/comment-element';
import CommentBubbleElement from './elements/comment-r-element';
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
import MisImagenesElement from './elements/mis-imagenes-element';
import UrlDocElement from './elements/url-doc-element';
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
import DictadoElement from './elements/dictado-element';
import BlockDibujoElement from './elements/block-dibujo-element';
import BlockDibujo2Element from './elements/block-dibujo-2-element';
import TimeListElement from './elements/time-list-element';
import TimerListaElement from './elements/timer-lista-element';

const ElementComponentMap: { [key: string]: React.FC<CommonElementProps> } = {
  notepad: NotepadElement,
  // cuaderno: CuadernoElement, // DESACTIVADO - causando problemas
  sticky: StickyNoteType2, // Default (solo Tipo 2)
  todo: TodoListElement,
  image: ImageElement,
  text: TextElement,
  comment: CommentElement,
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
  'mis-imagenes': MisImagenesElement,
  'url-doc': UrlDocElement,
  'photo-grid': PhotoGridElement,
  'photo-grid-horizontal': PhotoGridHorizontalElement,
  'photo-grid-adaptive': PhotoGridAdaptiveElement,
  'photo-grid-free': PhotoGridFreeElement,
  'libreta': LibretaElement,
  'comment-small': CommentSmallElement,
  'notes': NotesElement,
  'mini-notes': NotesElement,
  'mini': MiniElement,
  'countdown': CountdownElement,
  'dictado': DictadoElement,
  'block-dibujo': BlockDibujoElement,
  'block-dibujo-2': BlockDibujo2Element,
  'time-list': TimeListElement,
  'timer-lista': TimerListaElement,
};

type TransformableElementProps = {
  element: WithId<CanvasElement>;
  allElements: WithId<CanvasElement>[];
  scale: number;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  isMobile?: boolean;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  unanchorElement: (id: string) => void;
  deleteElement: (id: string) => void;
  onFormatToggle: () => void;
  onChangeNotepadFormat: (id: string) => void;
  onLocateElement: (elementId: string) => void;
  onSelectElement: (id: string | null, isMultiSelect: boolean) => void;
  onCenterElementInView?: (element: WithId<CanvasElement>) => void;
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
  onRequestStartDictation?: () => void;
  onStopDictation?: () => void;
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
  canvasContainerRef,
  isSelected,
  isMobile,
  updateElement,
  unanchorElement,
  deleteElement,
  onFormatToggle,
  onChangeNotepadFormat,
  onLocateElement,
  onSelectElement,
  onCenterElementInView,
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
  onRequestStartDictation,
  onStopDictation,
  user,
  storage,
  toast,
  isPreview = false,
}: TransformableElementProps) {
  
  const element = migrateElement(initialElement);
  
  // ✅ CRÍTICO: TODOS LOS HOOKS DEBEN IR ANTES DE CUALQUIER EARLY RETURN
  // REGLA #2: Estado para diálogo de confirmación de eliminación
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDraggingOrResizing, setIsDraggingOrResizing] = useState(false);
  const [isOverGalleryDropZone, setIsOverGalleryDropZone] = useState(false);
  const draggingStateRef = useRef(false);
  const antiFreezeToastCooldownRef = useRef(0);
  // Estado para rastrear movimiento inicial y evitar arrastres accidentales
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD = 8; // Pixels mínimos para considerar arrastre real
  // Regla global: reservar la franja superior para el menú principal.
  // Ningún elemento libre del canvas debe quedar debajo del menú.
  const TOP_MENU_PROTECTED_AREA = 120;
  
  // Extraer posición y tamaño de properties para uso consistente
  const elementProps = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
  const position = (element.parentId && elementProps.relativePosition) ? elementProps.relativePosition : (elementProps.position || { x: element.x || 0, y: element.y || 0 });
  const size = elementProps.size || { width: element.width || 200, height: element.height || 150 };
  const rotation = elementProps.rotation ?? element.rotation ?? 0;
  // REGLAS GLOBALES:
  // - Cuadernos siempre van en la última capa (z=-1) cuando NO están en edición.
  // - Al seleccionar para editar, suben temporalmente a z=999.
  // - Al terminar edición (deselección), vuelven a su capa base.
  const isNotebookElement = ['notepad', 'yellow-notepad', 'notes', 'mini-notes', 'mini', 'libreta'].includes(element.type);
  const baseZIndex = isNotebookElement ? -1 : (elementProps.zIndex ?? element.zIndex ?? 1);
  const zIndex = isDraggingOrResizing ? 30001 : (isSelected ? 999 : baseZIndex);

  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const handleEditableTouchGate = useCallback((e: React.TouchEvent) => {
    if (!isTouchDevice) return;
    const target = e.target as HTMLElement;
    if (!target) return;
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    const editableParent = target.closest('[contenteditable="true"]') as HTMLElement | null;
    if (!isEditable && !editableParent) return;

    const gateTarget = editableParent || target;
    if (!shouldAllowTouchEdit(gateTarget)) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isTouchDevice]);
  
  // Asegurar que size tenga valores numéricos válidos
  // pomodoro mantiene ancho fijo de 180px
  // planners semanales: 794x794 por defecto, pero permiten redimensionar
  const isWeeklyPlanner = (element.type as any) === 'vertical-weekly-planner' || (element.type as any) === 'weekly-planner';
  const safeSize = {
    width: (element.type as any) === 'pomodoro-timer' ? 180 :
           (typeof size.width === 'number' && size.width > 0 ? size.width : (isWeeklyPlanner ? 794 : 200)),
    height: (typeof size.height === 'number' && size.height > 0 ? size.height : (isWeeklyPlanner ? 794 : 150))
  };

  const [livePosition, setLivePosition] = useState(position);
  useEffect(() => {
    if (!isDraggingOrResizing) {
      setLivePosition(position);
    }
  }, [position.x, position.y, isDraggingOrResizing]);
  
  const centerViewOnClientPoint = useCallback((clientX: number, clientY: number) => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pointX = (container.scrollLeft + (clientX - rect.left)) / scale;
    const pointY = (container.scrollTop + (clientY - rect.top)) / scale;
    const targetX = container.clientWidth * 0.9;
    const targetY = container.clientHeight * 0.9;
    const nextScrollLeft = Math.max(0, pointX * scale - targetX);
    const nextScrollTop = Math.max(0, pointY * scale - targetY);
    container.scrollTo({ left: nextScrollLeft, top: nextScrollTop, behavior: 'smooth' });
  }, [canvasContainerRef, scale]);

  const getClientPointFromEvent = useCallback((event: any): { x: number; y: number } | null => {
    if (!event) return null;
    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      return { x: event.clientX, y: event.clientY };
    }
    const touch = event.changedTouches?.[0] || event.touches?.[0];
    if (touch && typeof touch.clientX === 'number' && typeof touch.clientY === 'number') {
      return { x: touch.clientX, y: touch.clientY };
    }
    return null;
  }, []);

  // Centrar en vista usando la posición visual del cursor (no mover el elemento)
  const requestCenterInView = useCallback((clientPoint?: { x: number; y: number } | null) => {
    if (element.parentId) return;
    if (clientPoint && typeof clientPoint.x === 'number' && typeof clientPoint.y === 'number') {
      centerViewOnClientPoint(clientPoint.x, clientPoint.y);
      return;
    }
    if (!onCenterElementInView) return;
    onCenterElementInView({
      ...element,
      x: position.x,
      y: position.y,
      width: safeSize.width,
      height: safeSize.height,
    } as WithId<CanvasElement>);
  }, [element, position.x, position.y, safeSize.width, safeSize.height, onCenterElementInView, centerViewOnClientPoint]);

  // FIX: Evitar estado "congelado" cuando isDraggingOrResizing queda true (ej. onDragStop no se disparó).
  // Reset al deseleccionar y al perder foco de ventana para que el header vuelva a ser clickeable.
  useEffect(() => {
    draggingStateRef.current = isDraggingOrResizing;
  }, [isDraggingOrResizing]);

  useEffect(() => {
    const onGalleryHoverChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ over: boolean }>;
      setIsOverGalleryDropZone(Boolean(customEvent.detail?.over));
    };
    window.addEventListener('micerebro-gallery-hover-change', onGalleryHoverChange as EventListener);
    return () => {
      window.removeEventListener('micerebro-gallery-hover-change', onGalleryHoverChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isSelected) {
      setIsDraggingOrResizing(false);
    }
  }, [isSelected]);

  // Anti-freeze solo para notas: evita estado congelado cuando onDragStop no se dispara.
  // Desactivado en el resto de elementos para evitar re-renders excesivos.
  const isNotesElement = (element.type as string) === 'notes' || (element.type as string) === 'mini-notes';
  useEffect(() => {
    if (!isNotesElement) return;
    const maybeToastAntiFreeze = () => {
      const now = Date.now();
      if (now - antiFreezeToastCooldownRef.current < 3000) return;
      antiFreezeToastCooldownRef.current = now;
      if (toast) {
        toast({
          title: 'Recuperacion automatica activa',
          description: 'Se restablecio la interaccion para evitar estado congelado.',
        });
      }
    };

    const resetDragging = (showToast = false) => {
      if (!draggingStateRef.current) return;
      setIsDraggingOrResizing(false);
      if (showToast) maybeToastAntiFreeze();
    };

    const delayedResetIfStuck = () => {
      window.setTimeout(() => {
        if (draggingStateRef.current) {
          resetDragging(true);
        }
      }, 140);
    };

    const onBlur = () => resetDragging(true);
    const onMouseUp = () => delayedResetIfStuck();
    const onTouchEnd = () => delayedResetIfStuck();
    const onPointerUp = () => delayedResetIfStuck();
    const onDragEnd = () => delayedResetIfStuck();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') resetDragging(true);
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('mouseup', onMouseUp, true);
    window.addEventListener('touchend', onTouchEnd, true);
    window.addEventListener('pointerup', onPointerUp, true);
    window.addEventListener('dragend', onDragEnd as EventListener, true);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('mouseup', onMouseUp, true);
      window.removeEventListener('touchend', onTouchEnd, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('dragend', onDragEnd as EventListener, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [toast, isNotesElement]);

  const onDragStop = useCallback((e: RndDragEvent, d: DraggableData) => {
    // Validar umbral de movimiento para evitar arrastres accidentales
    if (dragStartPos) {
      const dx = Math.abs(d.x - dragStartPos.x);
      const dy = Math.abs(d.y - dragStartPos.y);
      const totalMovement = Math.sqrt(dx * dx + dy * dy);
      
      // Si el movimiento es menor al umbral, cancelar el arrastre (solo fue un clic)
      if (totalMovement < DRAG_THRESHOLD) {
        setDragStartPos(null);
        return; // No actualizar posición, solo fue una selección
      }
    }
    
    // REGLA CRÍTICA: NUNCA permitir elementos fuera del margen 0,0
    const minY = element.parentId ? 0 : TOP_MENU_PROTECTED_AREA;
    const newPosition = {
      x: Math.max(0, d.x),
      y: Math.max(minY, d.y),
    };
    const safeProperties = (typeof element.properties === 'object' && element.properties !== null ? element.properties : {}) as CanvasElementProperties;
    
    // Limpiar posición de inicio de arrastre
    setDragStartPos(null);
    setLivePosition(newPosition);
    
    // Intento de anclar a contenedor si se suelta sobre uno
    const containers = allElements?.filter(el => (el.type as any) === 'container') || [];
    // Usar esquina superior izquierda para detectar contenedor (regla especial)
    // newPosition ya está validado para no ser negativo
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

    if (targetContainer && (element.type as any) !== 'container') {
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

  }, [element, updateElement, allElements, safeSize.width, safeSize.height, dragStartPos]);

  const onResizeStop = useCallback((e: MouseEvent | TouchEvent, direction: string, ref: HTMLElement, delta: ResizableDelta, newPosition: Position) => {
    const safeProperties = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
    
    const newSize = { width: parseFloat(ref.style.width), height: parseFloat(ref.style.height) };
    // REGLA CRÍTICA: NUNCA permitir elementos fuera del margen 0,0
    const finalPosition = element.parentId
      ? newPosition
      : {
          x: Math.max(0, newPosition.x),
          y: Math.max(TOP_MENU_PROTECTED_AREA, newPosition.y),
        };
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

  const [isTouchActive, setIsTouchActive] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number, y: number } | null>(null);
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null);
  const [lastTapTime, setLastTapTime] = useState<number>(0);
  const TOUCH_SLOP = 10; // Pixels
  const DOUBLE_TAP_DELAY = 300; // Milliseconds
  const LONG_PRESS_DELAY = 500; // Milliseconds

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isDraggingOrResizing) return; // No manejar toques si ya estamos arrastrando/redimensionando

    const currentTime = Date.now();
    if (currentTime - lastTapTime < DOUBLE_TAP_DELAY) {
      onSelectElement(element.id, false);
      setLastTapTime(0); // Reset para evitar triple toque accidental
      return;
    }
    setLastTapTime(currentTime);

    setIsTouchActive(true);
    setTouchStartPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    setTouchStartTime(currentTime);
    onSelectElement(element.id, false); // Seleccionar elemento al tocar (si no es editable directamente)
  }, [isDraggingOrResizing, lastTapTime, onSelectElement, element.id]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isTouchActive || !touchStartPos || isDraggingOrResizing) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    // Si el movimiento excede un umbral, se considera arrastre
    const dx = Math.abs(currentX - touchStartPos.x);
    const dy = Math.abs(currentY - touchStartPos.y);

    if (dx > TOUCH_SLOP || dy > TOUCH_SLOP) {
      // Esto es un arrastre, no un toque simple
      setIsTouchActive(false); // Desactivar la detección de toque simple/largo
    }
  }, [isTouchActive, touchStartPos, isDraggingOrResizing]);

  const handleTouchEnd = useCallback(() => {
    setIsTouchActive(false);
    setTouchStartPos(null);
    setTouchStartTime(null);
  }, []);

  const handleTouchCancel = useCallback(() => {
    setIsTouchActive(false);
    setTouchStartPos(null);
    setTouchStartTime(null);
  }, []);

  // ✅ EARLY RETURNS DESPUÉS DE TODOS LOS HOOKS
  // Seleccionar componente según tipo y variante (para sticky notes)
  const ElementComponent = useMemo(() => {
    if (element.type === 'sticky') {
      // Regla: eliminar notas tipo 1 y dejar solo tipo 2
      // Cualquier variante antigua se renderiza siempre como StickyNoteType2
      return StickyNoteType2;
    }
    return ElementComponentMap[element.type as keyof typeof ElementComponentMap] || (() => <div>Unknown element type: {element.type}</div>);
  }, [element.type, element.properties]);
  
  if (!ElementComponent) {
    console.warn(`ElementComponent no encontrado para tipo: ${element.type}`);
    return null;
  }
  
  if (!safeSize || typeof safeSize.width !== 'number' || typeof safeSize.height !== 'number') {
    console.warn(`Tamaño inválido para elemento ${element.id}:`, safeSize);
    return null;
  }

  const isGroupedFrame = false;

  const handleMouseDown = (e: MouseEvent) => {
    // Permitir que los eventos lleguen a los elementos editables (incl. hijos de contentEditable)
    const target = e.target as HTMLElement;
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.closest('[contenteditable="true"]');
    const isButton = target.tagName === 'BUTTON' || target.closest('button');
    if (isEditable || isButton) {
      return; // Permitir foco/click nativo sin interferir (ej. botón X para borrar tarea)
    }
    // Solo seleccionar si no estamos en proceso de arrastre
    if (!isDraggingOrResizing) {
      const isMultiSelect = e.altKey || e.shiftKey || e.metaKey || e.ctrlKey;
      onSelectElement(element.id, isMultiSelect);
    }
  };

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || target.closest('[contenteditable="true"]');
    const isButton = target.tagName === 'BUTTON' || target.closest('button');
    if (isEditable || isButton) return;
    if (element.parentId) return;
    if (!canvasContainerRef.current) return;

    if (!isSelected) {
      const isMultiSelect = e.altKey || e.shiftKey || e.metaKey || e.ctrlKey;
      onSelectElement(element.id, isMultiSelect);
    }
  }, [element, isSelected, onSelectElement, canvasContainerRef]);

  const handleDragStart = useCallback((e: RndDragEvent, data?: DraggableData) => {
    // Guardar posición inicial para validar umbral de movimiento
    if (data) {
      setDragStartPos({ x: data.x, y: data.y });
    }
    // Drag state robusto para integraciones que no usan HTML5 DnD (react-rnd)
    if (typeof window !== 'undefined') {
      (window as any).__micerebroDraggingElementId = element.id;
      (window as any).__micerebroOverGalleryDropZone = false;
      window.dispatchEvent(new CustomEvent('micerebro-gallery-hover-change', { detail: { over: false } }));
    }
    // Configurar dataTransfer para drag and drop hacia otros elementos (como galería)
    if ((e as any).dataTransfer) {
      (e as any).dataTransfer.setData('application/element-id', element.id);
      (e as any).dataTransfer.effectAllowed = 'copy';
    }
  }, [element.id]);

  
  const rndProps = useMemo(() => ({
    style: {
      zIndex: zIndex,
      border: isSelected && !['pomodoro-timer', 'todo'].includes(element.type as any) ? '2px solid hsl(var(--primary))' : 'none',
      boxSizing: 'border-box' as 'border-box',
      transform: `rotate(${rotation}deg)`,
      transformOrigin: 'center center',
    },
    size: { width: safeSize.width, height: safeSize.height },
    position: {
      x: livePosition.x,
      y: livePosition.y,
    },
    onDragStart: (e, data) => {
      setIsDraggingOrResizing(true);
      handleDragStart(e, data);
    },
    onDrag: (e, data) => {
      const minY = element.parentId ? 0 : TOP_MENU_PROTECTED_AREA;
      setLivePosition({
        x: Math.max(0, data.x),
        y: Math.max(minY, data.y),
      });
    },
    onDragStop: (e, data) => {
      setIsDraggingOrResizing(false);
      onDragStop(e, data);

      // Fallback robusto: detectar suelta sobre Mi galería por coordenadas de puntero.
      if (typeof window !== 'undefined') {
        const rect = (window as any).__micerebroGalleryDropZoneRect as DOMRect | undefined;
        const point = getClientPointFromEvent(e as any);
        if (rect && point) {
          const inside =
            point.x >= rect.left &&
            point.x <= rect.right &&
            point.y >= rect.top &&
            point.y <= rect.bottom;
          if (inside) {
            window.dispatchEvent(
              new CustomEvent('micerebro-gallery-force-attach', {
                detail: { elementId: element.id },
              })
            );
          }
        }
      }

      // Limpiar después de un tick para permitir consumo en mouseup del destino
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          if ((window as any).__micerebroDraggingElementId === element.id) {
            (window as any).__micerebroDraggingElementId = null;
          }
          (window as any).__micerebroOverGalleryDropZone = false;
          window.dispatchEvent(new CustomEvent('micerebro-gallery-hover-change', { detail: { over: false } }));
        }, 50);
      }
    },
    onResizeStart: () => setIsDraggingOrResizing(true),
    onResizeStop: (e, direction, ref, delta, newPosition) => {
      setIsDraggingOrResizing(false);
      onResizeStop(e, direction, ref, delta, newPosition);
    },
    minWidth: 50,
    minHeight: 50,
      className: cn("focus:outline-none"),
    onMouseDown: handleMouseDown,
    enableResizing: true, // ACTIVADO - Mostrar handles de redimensionamiento
    scale: scale,
    bounds: element.parentId ? `[data-element-id="${element.parentId}"]` : undefined,
    resizeHandleStyles: {
      bottomRight: {
        width: '20px',
        height: '20px',
        right: '-10px',
        bottom: '-10px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'nw-resize'
      },
      bottomLeft: {
        width: '20px',
        height: '20px',
        left: '-10px',
        bottom: '-10px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'ne-resize'
      },
      topRight: {
        width: '20px',
        height: '20px',
        right: '-10px',
        top: '-10px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'ne-resize'
      },
      topLeft: {
        width: '20px',
        height: '20px',
        left: '-10px',
        top: '-10px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'nw-resize'
      },
      bottom: {
        height: '10px',
        left: '50%',
        bottom: '-5px',
        transform: 'translateX(-50%)',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'ns-resize'
      },
      top: {
        height: '10px',
        left: '50%',
        top: '-5px',
        transform: 'translateX(-50%)',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'ns-resize'
      },
      left: {
        width: '10px',
        top: '50%',
        left: '-5px',
        transform: 'translateY(-50%)',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'ew-resize'
      },
      right: {
        width: '10px',
        top: '50%',
        right: '-5px',
        transform: 'translateY(-50%)',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'ew-resize'
      },
    },
    // Regla: solo arrastrar desde elementos con clase .drag-handle (no desde inputs o áreas de texto)
    dragHandleClassName: 'drag-handle',
    // En móvil, el primer toque solo selecciona; para mover, el elemento debe estar seleccionado.
    disableDragging: Boolean(isMobile && !isSelected),
  }), [zIndex, isSelected, rotation, safeSize.width, safeSize.height, position, handleDragStart, onDragStop, onResizeStop, scale, element.parentId, element.type, canvasContainerRef.current, isMobile]);

  return (
    <>
      <Rnd {...rndProps}>
        <div
          data-element-id={element.id}
          data-element-type={element.type}
          className="w-full h-full relative group"
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className="w-full h-full"
            onTouchStartCapture={handleEditableTouchGate}
            onDoubleClick={handleDoubleClick}
            onTouchStart={(e) => {
            // Verificar si el toque es en un elemento editable antes de manejar
            const target = e.target as HTMLElement;
            const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            const isEditableParent = target.closest('[contenteditable="true"]');
            
            if (!isEditable && !isEditableParent) {
              // Solo manejar touch si NO es un elemento editable
              handleTouchStart(e);
            }
            // Si es editable, dejar que el evento se propague normalmente
          }}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
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
                    ['notepad', 'yellow-notepad', 'notes', 'libreta', 'mini', 'dictado', 'block-dibujo', 'block-dibujo-2', 'mis-imagenes'].includes(element.type)
                      ? (element as { minimized?: boolean }).minimized
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
              boardId={boardId}
              isListening={isListening}
              liveTranscript={liveTranscript}
              finalTranscript={finalTranscript}
              interimTranscript={interimTranscript}
              onRequestStartDictation={onRequestStartDictation}
              onStopDictation={onStopDictation}
              {...(element.type === 'photo-grid-free' && {
                user,
                storage,
                toast
              })}
              {...(element.type === 'image-frame' && {
                userId: user?.uid,
                storage
              })}
              {...(element.type === 'mis-imagenes' && {
                userId: user?.uid,
                storage
              })}
          />
        </div>
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
