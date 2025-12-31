"use client";

import React, { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, useMemo } from "react";
// LÍNEA CORREGIDA: Cambiado 'CanvasBoard' por 'Board'
import type { CanvasElement, WithId, Point, Board, ElementType, CommonElementProps } from "@/lib/types";
import { cn } from "@/lib/utils";
import ZoomControls from "./zoom-controls";

// CRÍTICO: IMPORTACIONES DIRECTAS - Cambiar de lazy a imports directos para evitar problemas con chunks de webpack
// Esto previene errores como "Cannot find module './586.js'" durante desarrollo
import TransformableElement from './transformable-element';

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
  user?: any;
  storage?: any;
  toast?: any;
  isPreview?: boolean;
};

type CanvasHandle = {
  getCanvasContainer: () => HTMLDivElement | null;
  getCanvasContent: () => HTMLDivElement | null;
  getTransform: () => { scale: number; x: number; y: number; };
  getViewportCenter: () => Point;
  centerOnElement: (element: WithId<CanvasElement>, zoomLevel?: number, offset?: { x?: number; y?: number }) => void;
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
  user,
  storage,
  toast,
  isPreview = false,
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

  // Handle drop de imágenes desde galería
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    const galleryImageData = e.dataTransfer.getData('application/gallery-image');
    if (!galleryImageData) return;

    try {
      const image = JSON.parse(galleryImageData) as { id: string; url: string; filename: string };

      // Calcular posición relativa al canvas
      const container = canvasContainerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();

      // Posición donde se soltó la imagen
      const dropX = e.clientX - rect.left + container.scrollLeft;
      const dropY = e.clientY - rect.top + container.scrollTop;

      // Crear elemento de imagen
      addElement('image', {
        content: { url: image.url },
        properties: {
          position: { x: dropX, y: dropY },
          size: { width: 300, height: 200 },
          label: image.filename || 'Imagen'
        }
      });
    } catch (error) {
      console.error('Error procesando drop de imagen:', error);
    }
  }, [addElement]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);
  
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
  
  const centerOnElement = useCallback((element?: WithId<CanvasElement>, zoomLevel: number = 1, offset?: { x?: number; y?: number }) => {
    if (!element) return;
    
    const width = typeof element.width === 'number' ? element.width : parseFloat(element.width || '0');
    const height = typeof element.height === 'number' ? element.height : parseFloat(element.height || '0');
    
    const centerPoint = {
      x: element.x + width / 2 + (offset?.x ?? 0),
      y: element.y + height / 2 + (offset?.y ?? 0),
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

  const transformableElements = useMemo(() => elements, [elements]);
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
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div
          ref={canvasContentRef}
          className="relative canvas-content"
          style={{ width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
            {transformableElements
                .filter(el => !el.hidden) 
                .map((element) => {
                  const isSelected = selectedElementIds?.includes(element.id);

                  return (
                    <TransformableElement
                      key={element.id}
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
                      user={user}
                      storage={storage}
                      toast={toast}
                      isPreview={isPreview}
                    />
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