"use client";

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
// Error boundary para aislar elementos corruptos
class ElementErrorBoundary extends React.Component<{ elementId?: string; elementType?: string; children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.error('[AUDITORÍA] Elemento con error de render:', this.props.elementId, this.props.elementType, error);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

// LÍNEA CORREGIDA: Cambiado 'CanvasBoard' por 'Board'
import type { CanvasElement, WithId, Point, Board, ElementType, CommonElementProps } from "@/lib/types";
import { cn } from "@/lib/utils";
import ZoomControls from "./zoom-controls";

// CRÍTICO: IMPORTACIONES DIRECTAS - Cambiar de lazy a imports directos para evitar problemas con chunks de webpack
// Esto previene errores como "Cannot find module './586.js'" durante desarrollo
import TransformableElement from './transformable-element';
import ConnectorElement from './elements/connector-element';

type CanvasProps = {
  elements: WithId<CanvasElement>[];
  board: WithId<Board>;
  selectedElementIds: string[];
  onSelectElement: (id: string | null, isMultiSelect: boolean) => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  unanchorElement: (id: string) => void;
  deleteElement: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onMoveBackward: (id: string) => void;
  onFormatToggle: () => void;
  onChangeNotepadFormat: (id: string) => void;
  onLocateElement: (id: string) => void;
  onGoToHome: () => void;
  onCenterView: () => void;
  onEditElement: (id: string) => void;
  onGroupElements: (frameId: string) => void;
  addElement: (type: ElementType, props: any) => Promise<string>;
  saveLastView: () => void;
  selectedElement: WithId<CanvasElement> | null;
  activatedElementId: string | null;
  onActivateDrag: (id: string) => void;
  onEditComment: (element: WithId<CanvasElement>) => void;
  onDuplicateElement: (elementId: string) => void;
  onUngroup: (id: string) => void;
  setIsDirty: (isDirty: boolean) => void;
  isMobile: boolean;
  isListening: boolean;
  liveTranscript: string;
  finalTranscript?: string;
  interimTranscript?: string;
};

type CanvasHandle = {
  getCanvasContainer: () => HTMLDivElement | null;
  getCanvasContent: () => HTMLDivElement | null;
  getTransform: () => { scale: number; x: number; y: number; };
  getViewportCenter: () => Point;
  centerOnElement: (element: WithId<CanvasElement>, zoomLevel?: number) => void;
  centerOnPoint: (point: Point, zoomLevel?: number) => void;
  centerOnElements: (isMobile?: boolean) => void;
  resetZoom: () => void;
  goToHome: () => void;
  activatePanMode: () => void;
};

type DragState = {
  isPanning: boolean;
  startPoint: Point;
  initialScroll: Point;
};

const CANVAS_PADDING = 2000;


const Canvas = forwardRef<CanvasHandle, CanvasProps>(({
  elements,
  board,
  selectedElementIds,
  onSelectElement,
  updateElement,
  unanchorElement,
  deleteElement,
  onBringToFront,
  onSendToBack,
  onMoveBackward,
  onFormatToggle,
  onChangeNotepadFormat,
  onLocateElement,
  onGoToHome,
  onCenterView,
  onEditElement,
  onGroupElements,
  addElement,
  saveLastView,
  selectedElement,
  activatedElementId,
  onActivateDrag,
  onEditComment,
  onDuplicateElement,
  onUngroup,
  setIsDirty,
  isMobile,
  isListening,
  liveTranscript,
  finalTranscript,
  interimTranscript,
}, ref) => {
  const [scale, setScale] = useState(1);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [isPanningActive, setIsPanningActive] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);

  const canvasDimensions = useMemo(() => {
    if (elements.length === 0) {
      return { width: window.innerWidth + CANVAS_PADDING, height: window.innerHeight + CANVAS_PADDING };
    }
    let maxX = 0;
    let maxY = 0;
    elements.forEach(el => {
      const elWidth = typeof el.width === 'number' ? el.width : parseFloat(el.width || '0');
      const elHeight = typeof el.height === 'number' ? el.height : parseFloat(el.height || '0');
      if (isFinite(elWidth) && isFinite(elHeight)) {
        maxX = Math.max(maxX, el.x + elWidth);
        maxY = Math.max(maxY, el.y + elHeight);
      }
    });
    return {
      width: Math.max(maxX + CANVAS_PADDING, window.innerWidth),
      height: Math.max(maxY + CANVAS_PADDING, window.innerHeight)
    };
  }, [elements]);
  

  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button (wheel pressed) or Alt key + left click for panning
    const isPanningTrigger = e.button === 1 || (e.button === 0 && e.altKey);
    
    if (isPanningTrigger && canvasContainerRef.current) {
      e.preventDefault();
      setDragState({
        isPanning: true,
        startPoint: { x: e.clientX, y: e.clientY },
        initialScroll: {
          x: canvasContainerRef.current.scrollLeft,
          y: canvasContainerRef.current.scrollTop,
        },
      });
      return;
    }
    
    // Left click on canvas background deselects elements
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isCanvasClick = target === canvasContentRef.current || target === canvasContainerRef.current;
      
      if (isCanvasClick) {
        onSelectElement(null, false);
      }
    }
    
    // Space key panning (already handled by isPanningActive state)
    if (isPanningActive && canvasContainerRef.current && e.button === 0) {
      e.preventDefault();
      setDragState({
        isPanning: true,
        startPoint: { x: e.clientX, y: e.clientY },
        initialScroll: {
          x: canvasContainerRef.current.scrollLeft,
          y: canvasContainerRef.current.scrollTop,
        },
      });
    }
  };
  
  // CRÍTICO: Usar refs para handlers para evitar re-suscripciones constantes
  const dragStateRef = useRef(dragState);
  const saveLastViewRef = useRef(saveLastView);
  const canvasContainerRefForDrag = useRef(canvasContainerRef.current);

  // Actualizar refs cuando cambian
  useEffect(() => {
    dragStateRef.current = dragState;
    saveLastViewRef.current = saveLastView;
    canvasContainerRefForDrag.current = canvasContainerRef.current;
  }, [dragState, saveLastView]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const currentDragState = dragStateRef.current;
    const container = canvasContainerRefForDrag.current;
    
    if (!currentDragState || !container) return;
    
    e.preventDefault();
    if (currentDragState.isPanning) {
      const dx = e.clientX - currentDragState.startPoint.x;
      const dy = e.clientY - currentDragState.startPoint.y;
      
      // FIX: Reducir sensibilidad del movimiento - aplicar factor de reducción
      // Esto previene que la página se mueva mucho con pequeños movimientos del mouse
      const sensitivityFactor = 0.7; // Reducir movimiento al 70%
      const adjustedDx = dx * sensitivityFactor;
      const adjustedDy = dy * sensitivityFactor;
      
      container.scrollLeft = currentDragState.initialScroll.x - adjustedDx;
      container.scrollTop = currentDragState.initialScroll.y - adjustedDy;
    }
  }, []); // ✅ Sin dependencias - usa refs

  const handleMouseUp = useCallback(() => {
    const currentDragState = dragStateRef.current;
    if (currentDragState) {
        saveLastViewRef.current();
    }
    setDragState(null);
  }, []); // ✅ Sin dependencias - usa refs

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]); // ✅ handleMouseMove y handleMouseUp son estables ahora
  
  // Función helper para forzar scroll a (0, 0)
  const forceScrollToOrigin = useCallback((container: HTMLDivElement) => {
    container.scrollLeft = 0;
    container.scrollTop = 0;
    // Verificación adicional usando scrollTo si la asignación directa no funcionó
    if (container.scrollLeft !== 0 || container.scrollTop !== 0) {
      container.scrollTo(0, 0);
    }
  }, []);

  const goToHome = useCallback(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const newScale = isMobile ? 0.3 : 1.0;
    setScale(newScale);

    // Asegurar que el scroll siempre vaya a (0, 0) - esquina superior izquierda
    requestAnimationFrame(() => {
      if (container) {
        forceScrollToOrigin(container);
      }
    });
  }, [isMobile, forceScrollToOrigin]);

  // Efecto para inicializar el scroll en (0, 0) cuando se carga un tablero
  // CRÍTICO: El tablero SIEMPRE se inicia en scroll 0,0 - nunca pueden haber elementos fuera de este punto
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    // Inicializar escala según dispositivo
    const initialScale = isMobile ? 0.3 : 1.0;
    setScale(initialScale);

    // CRÍTICO: Forzar scroll a (0, 0) - esquina superior izquierda
    // Ejecutar inmediatamente
    forceScrollToOrigin(container);
    
    // También usar requestAnimationFrame para asegurar que se ejecute después del render
    requestAnimationFrame(() => {
      if (container) {
        forceScrollToOrigin(container);
      }
    });

    // Verificación adicional después de un pequeño delay para asegurar que se mantiene
    const timeoutId = setTimeout(() => {
      if (container && (container.scrollLeft !== 0 || container.scrollTop !== 0)) {
        console.warn('⚠️ Scroll no está en (0,0), forzando corrección...');
        forceScrollToOrigin(container);
      }
    }, 100);

    // Verificación final después de 500ms para asegurar que se mantiene
    const finalTimeoutId = setTimeout(() => {
      if (container && (container.scrollLeft !== 0 || container.scrollTop !== 0)) {
        console.warn('⚠️ Scroll aún no está en (0,0) después de 500ms, forzando corrección final...');
        forceScrollToOrigin(container);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(finalTimeoutId);
    };
  }, [board.id, isMobile, forceScrollToOrigin]);


  const getViewportCenter = useCallback((): Point => {
    if (!canvasContainerRef.current) {
      // Si no hay container, retornar posición inicial (0,0) + offset del viewport
      // Esto asegura que los elementos se creen cerca del origen cuando el scroll está en 0,0
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    const { scrollLeft, scrollTop, clientWidth, clientHeight } = canvasContainerRef.current;
    // CRÍTICO: El tablero inicia en scroll 0,0, así que el viewport center debe calcularse desde ahí
    // REGLA: Los elementos deben aparecer en el ESPACIO VISIBLE del usuario
    // El centro del viewport visible en coordenadas del canvas es:
    // - Si scroll = 0,0: centro = (clientWidth/2, clientHeight/2) en coordenadas del canvas
    // - Si scroll != 0: centro = (scrollLeft + clientWidth/2, scrollTop + clientHeight/2) en coordenadas del canvas
    // IMPORTANTE: Dividir por scale para convertir de píxeles del viewport a coordenadas del canvas
    const centerX = (scrollLeft + clientWidth / 2) / scale;
    const centerY = (scrollTop + clientHeight / 2) / scale;
    
    // CRÍTICO: Asegurar que el centro nunca sea negativo (el tablero inicia en 0,0)
    // Si el scroll está en 0,0, el centro debe ser al menos (clientWidth/2, clientHeight/2)
    return { 
      x: Math.max(clientWidth / (2 * scale), centerX), 
      y: Math.max(clientHeight / (2 * scale), centerY) 
    };
  }, [scale]);

  const setZoom = useCallback((newScale: number, centerPoint?: Point) => {
    const container = canvasContainerRef.current;
    if (!container) return;

    newScale = Math.max(0.1, Math.min(newScale, 5));
    const oldScale = scale;

    const { clientWidth, clientHeight, scrollLeft, scrollTop } = container;
    const zoomOrigin = centerPoint || {
      x: clientWidth / 2,
      y: clientHeight / 2
    };

    const scrollX = scrollLeft + zoomOrigin.x;
    const scrollY = scrollTop + zoomOrigin.y;

    const newScrollX = (scrollX * newScale / oldScale) - zoomOrigin.x;
    const newScrollY = (scrollY * newScale / oldScale) - zoomOrigin.y;

    setScale(newScale);

    requestAnimationFrame(() => {
        container.scrollLeft = newScrollX;
        container.scrollTop = newScrollY;
    });

  }, [scale]);
  
  const centerOnPoint = useCallback((point: Point, newScale?: number) => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const finalScale = newScale ? Math.max(0.1, Math.min(newScale, 5)) : scale;
    
    const { clientWidth, clientHeight } = container;
    const newScrollLeft = point.x * finalScale - (clientWidth / 2);
    const newScrollTop = point.y * finalScale - (clientHeight / 2);
    
    if(newScale) setScale(finalScale);
    
    requestAnimationFrame(() => {
        container.scrollTo({
            left: newScrollLeft,
            top: newScrollTop,
            behavior: 'smooth',
        });
    });
  }, [scale]);
  
  const centerOnElement = useCallback((element?: WithId<CanvasElement>, zoomLevel: number = 1) => {
    if (!element) return;
    
    // Usar posición/tamaño más reciente desde properties para no depender de x/y legacy
    const props = (element as any).properties;
    const pos = props && typeof props === 'object' && props.position
      ? props.position
      : { x: element.x, y: element.y };
    const size = props && typeof props === 'object' && props.size
      ? props.size
      : { width: element.width, height: element.height };

    const width = typeof size?.width === 'number' ? size.width : parseFloat((size?.width as any) || '0');
    const height = typeof size?.height === 'number' ? size.height : parseFloat((size?.height as any) || '0');
    const x = typeof pos?.x === 'number' ? pos.x : parseFloat((pos?.x as any) || '0');
    const y = typeof pos?.y === 'number' ? pos.y : parseFloat((pos?.y as any) || '0');
    
    const centerPoint = {
      x: x + width / 2,
      y: y + height / 2,
    };
    centerOnPoint(centerPoint, zoomLevel);
  }, [centerOnPoint]);
  
  const centerOnElements = useCallback((isMobile?: boolean) => {
    if (!elements || elements.length === 0) {
      goToHome();
      return;
    }
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
      const width = typeof el.width === 'number' ? el.width : parseFloat(el.width || '0');
      const height = typeof el.height === 'number' ? el.height : parseFloat(el.height || '0');
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + width);
      maxY = Math.max(maxY, el.y + height);
    });
  
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    if (contentWidth === 0 || contentHeight === 0) {
        centerOnPoint({ x: minX, y: minY }, 1);
        return;
    }

    const container = canvasContainerRef.current;
    if(!container) return;

    const newScale = isMobile ? 0.3 : 0.4; 

    const centerPoint = {
      x: minX + contentWidth / 2,
      y: minY + contentHeight / 2,
    };
  
    centerOnPoint(centerPoint, newScale);
  }, [elements, goToHome, centerOnPoint]);

  const resetZoom = () => setZoom(1);
  
  useImperativeHandle(ref, () => ({
    getCanvasContainer: () => canvasContainerRef.current,
    getCanvasContent: () => canvasContentRef.current,
    getTransform: () => ({scale: scale, x: canvasContainerRef.current?.scrollLeft || 0, y: canvasContainerRef.current?.scrollTop || 0 }),
    getViewportCenter,
    centerOnElement,
    centerOnPoint,
    centerOnElements,
    resetZoom,
    goToHome,
    activatePanMode: () => {
      setIsPanningActive(prev => !prev);
      return isPanningActive;
    }
  }), [isPanningActive]);

  useEffect(() => {
    const canvasElement = canvasContainerRef.current;
    if (!canvasElement) return;

    const handleWheel = (e: WheelEvent) => {
      // Zoom with Ctrl/Cmd + wheel
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const scaleDelta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom(scale + scaleDelta, { x: e.clientX, y: e.clientY });
      }
      // Pan with Alt + wheel
      else if (e.altKey) {
        e.preventDefault();
        canvasElement.scrollLeft -= e.deltaX;
        canvasElement.scrollTop -= e.deltaY;
      }
      // Pan with middle mouse button (wheel pressed) - handled by mousedown/mousemove
    };

    // Handle middle mouse button (wheel) pressed for panning
    const handleMouseDownWheel = (e: MouseEvent) => {
      if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        setDragState({
          isPanning: true,
          startPoint: { x: e.clientX, y: e.clientY },
          initialScroll: {
            x: canvasElement.scrollLeft,
            y: canvasElement.scrollTop,
          },
        });
      }
    };

    const handleSpaceDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA' && !(document.activeElement as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        setIsPanningActive(true);
      }
    }
    const handleSpaceUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPanningActive(false);
      }
    }
    
    canvasElement.addEventListener('wheel', handleWheel, { passive: false });
    canvasElement.addEventListener('mousedown', handleMouseDownWheel);
    window.addEventListener('keydown', handleSpaceDown);
    window.addEventListener('keyup', handleSpaceUp);
    
    return () => {
      canvasElement.removeEventListener('wheel', handleWheel);
      canvasElement.removeEventListener('mousedown', handleMouseDownWheel);
      window.removeEventListener('keydown', handleSpaceDown);
      window.removeEventListener('keyup', handleSpaceUp);
    }
  }, [scale, setZoom]);

  const transformableElements = useMemo(() => {
    return elements
      .filter(el => el.type !== 'connector')
      .filter(el => {
        // AUDITORÍA: Filtrar elementos problemáticos que causan React error #185
        if (!el) {
          console.warn(`[AUDITORÍA] Elemento null/undefined filtrado`);
          return false;
        }
        if (!el.id || typeof el.id !== 'string') {
          console.warn(`[AUDITORÍA] Elemento sin ID válido:`, el);
          return false;
        }
        if (!el.type || typeof el.type !== 'string') {
          console.warn(`[AUDITORÍA] Elemento sin tipo válido:`, el);
          return false;
        }

        // ELEMENTOS DESACTIVADOS (serán filtrados)
        const deprecatedTypes = [
          'super-notebook', 'test-notepad', 'comment', 'tabbed-notepad',
          'stopwatch', 'countdown', 'highlight-text', 'pomodoro-timer',
          'brainstorm-generator', 'color-palette-generator', 'accordion'
        ];

        if (deprecatedTypes.includes(el.type)) {
          console.warn(`[AUDITORÍA] Elemento descontinuado removido: ${el.type} (${el.id})`);
          return false;
        }

        // Verificar que tenga componente correspondiente
        const validTypes = [
          'notepad', 'notepad-simple', 'sticky', 'todo', 'image', 'text',
          'container', 'comment-bubble', 'moodboard', 'yellow-notepad',
          'habit-tracker', 'eisenhower-matrix', 'brain-dump', 'gratitude-journal',
          'datetime-widget', 'sticker', 'locator'
        ];

        if (!validTypes.includes(el.type)) {
          console.error(`[AUDITORÍA] ❌ Elemento con tipo inválido removido: ${el.type} (${el.id})`);
          console.error(`[AUDITORÍA] Datos del elemento problemático:`, el);
          return false;
        }

        // Para elementos nuevos que aún no tienen propiedades completas, permitirlos
        // pero verificar que al menos tengan estructura básica
        if (!el.properties) {
          console.warn(`[AUDITORÍA] ⚠️ Elemento sin propiedades, permitiendo por ahora: ${el.type} (${el.id})`);
          return true; // Permitir elementos en proceso de creación
        }

        if (typeof el.properties !== 'object') {
          console.error(`[AUDITORÍA] ❌ Propiedades no son objeto: ${el.type} (${el.id})`);
          console.error(`[AUDITORÍA] Propiedades:`, el.properties);
          return false;
        }

        // Verificar propiedades críticas solo si existen
        const props = el.properties as any;
        if (props && props.position && typeof props.position !== 'object') {
          console.error(`[AUDITORÍA] ❌ Posición inválida: ${el.type} (${el.id})`);
          console.error(`[AUDITORÍA] Posición:`, props.position);
          return false;
        }

        if (props && props.size && typeof props.size !== 'object') {
          console.error(`[AUDITORÍA] ❌ Tamaño inválido: ${el.type} (${el.id})`);
          console.error(`[AUDITORÍA] Tamaño:`, props.size);
          return false;
        }

        // Verificar que las coordenadas sean números válidos
        if (props && props.position && (isNaN(props.position.x) || isNaN(props.position.y))) {
          console.error(`[AUDITORÍA] ❌ Coordenadas inválidas: ${el.type} (${el.id})`);
          console.error(`[AUDITORÍA] Posición:`, props.position);
          return false;
        }

        if (props && props.size && (isNaN(props.size.width) || isNaN(props.size.height))) {
          console.error(`[AUDITORÍA] ❌ Dimensiones inválidas: ${el.type} (${el.id})`);
          console.error(`[AUDITORÍA] Tamaño:`, props.size);
          return false;
        }

        // Validar también los campos legacy x/y/width/height
        const legacyX = (el as any).x;
        const legacyY = (el as any).y;
        const legacyW = (el as any).width;
        const legacyH = (el as any).height;
        const invalidLegacy =
          (legacyX !== undefined && isNaN(Number(legacyX))) ||
          (legacyY !== undefined && isNaN(Number(legacyY))) ||
          (legacyW !== undefined && isNaN(Number(legacyW))) ||
          (legacyH !== undefined && isNaN(Number(legacyH)));
        if (invalidLegacy) {
          console.error(`[AUDITORÍA] ❌ Campos legacy inválidos (x/y/width/height) en ${el.type} (${el.id})`, {
            x: legacyX,
            y: legacyY,
            width: legacyW,
            height: legacyH,
          });
          return false;
        }

        return true;
      });
  }, [elements]);
  const connectorElements = useMemo(() => elements.filter(el => el.type === 'connector'), [elements]);

  const allElementsProp = useMemo(() => elements, [elements]);
  
  // CRÍTICO: offset NO debe depender de scrollLeft/scrollTop directamente
  // porque estos valores cambian constantemente durante el scroll, causando re-renders infinitos
  // En su lugar, usar un ref y actualizarlo solo cuando sea necesario (debounced)
  const offsetRef = useRef({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Actualizar offset solo cuando el scroll cambia significativamente (debounced)
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Limpiar timeout anterior
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      // Actualizar offset después de un breve delay (debounce)
      scrollTimeoutRef.current = setTimeout(() => {
        const newOffset = {
          x: container.scrollLeft || 0,
          y: container.scrollTop || 0,
        };
        
        // Solo actualizar si el cambio es significativo (más de 10px)
        const dx = Math.abs(newOffset.x - offsetRef.current.x);
        const dy = Math.abs(newOffset.y - offsetRef.current.y);
        
        if (dx > 10 || dy > 10) {
          offsetRef.current = newOffset;
          setOffset(newOffset);
        }
      }, 50); // Debounce de 50ms
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []); // Solo ejecutar una vez al montar

  return (
    <div className="relative w-full h-screen">
      <div
        ref={canvasContainerRef}
        className={cn(
          "relative w-full h-screen overflow-auto bg-canvas-teal",
          isPanningActive && "cursor-grab",
          dragState?.isPanning && "cursor-grabbing"
        )}
        style={{
          backgroundColor: '#96e4e6',
          backgroundImage: `radial-gradient(#ffffff 1px, transparent 0)`,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          ref={canvasContentRef}
          className="relative canvas-content"
          style={{ width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ width: canvasDimensions.width, height: canvasDimensions.height }}
            >
              <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground))" />
                  </marker>
              </defs>
              {connectorElements.map(element => {
                  try {
                    return (
                      <ConnectorElement
                        key={element.id}
                        {...element}
                        scale={scale}
                        offset={offset}
                            allElements={allElementsProp}
                            onUpdate={updateElement}
                            deleteElement={deleteElement}
                            onSelectElement={onSelectElement}
                            onEditElement={onEditElement}
                            onLocateElement={onLocateElement}
                            onEditComment={onEditComment}
                          />
                        );
                  } catch (err) {
                    console.error('[AUDITORÍA] Render falló para connector', element?.id, element?.type, err);
                    return null;
                  }
                })}
            </svg>
            {transformableElements
                .filter(el => !el.hidden)
                .map((element) => {
                  const isSelected = selectedElementIds?.includes(element.id);
                  return (
                    <ElementErrorBoundary elementId={element.id} elementType={element.type} key={element.id}>
                      <TransformableElement
                        element={element}
                        allElements={allElementsProp}
                        scale={scale}
                        offset={offset}
                        isSelected={isSelected}
                        updateElement={updateElement}
                        unanchorElement={unanchorElement}
                        deleteElement={deleteElement}
                        onFormatToggle={onFormatToggle}
                        onChangeNotepadFormat={onChangeNotepadFormat}
                        onLocateElement={onLocateElement}
                        onSelectElement={onSelectElement}
                        onBringToFront={onBringToFront}
                        onSendToBack={onSendToBack}
                        onMoveBackward={onMoveBackward}
                        onEditElement={onEditElement}
                        onGroupElements={onGroupElements}
                        addElement={addElement}
                        activatedElementId={activatedElementId}
                        onActivateDrag={onActivateDrag}
                        onEditComment={onEditComment}
                        onDuplicateElement={onDuplicateElement}
                        onUngroup={onUngroup}
                        setIsDirty={setIsDirty}
                        boardId={board.id}
                        isListening={isListening}
                        liveTranscript={liveTranscript}
                        finalTranscript={finalTranscript}
                        interimTranscript={interimTranscript}
                      />
                    </ElementErrorBoundary>
                  );
                })}
        </div>
      </div>
      <ZoomControls
        zoomIn={() => setZoom(scale + 0.1)}
        zoomOut={() => setZoom(scale - 0.1)}
        resetZoom={resetZoom}
        scale={scale}
        centerOnElements={centerOnElements}
        goToHome={goToHome}
        selectedElement={selectedElement}
        onBringToFront={onBringToFront}
        onSendToBack={onSendToBack}
        onMoveBackward={onMoveBackward}
        isMobile={isMobile}
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';
export default Canvas;