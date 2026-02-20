'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ContainerElement from '@/components/canvas/elements/container-element';
import type { CanvasElement, CanvasElementProperties, ElementContent, WithId } from '@/lib/types';

interface GaleriaContenedorProps {
  id: string;
  content?: ElementContent;
  properties?: CanvasElementProperties;
  allElements: WithId<CanvasElement>[];
  onUpdate: (id: string, updates: Partial<WithId<CanvasElement>>) => void;
  onLocateElement: (id: string) => void;
}

export default function GaleriaContenedor({
  id,
  content,
  properties,
  allElements,
  onUpdate,
  onLocateElement,
}: GaleriaContenedorProps) {
  const [isHoveringDropZone, setIsHoveringDropZone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const setGalleryHover = useCallback((over: boolean) => {
    if (typeof window === 'undefined') return;
    (window as any).__micerebroOverGalleryDropZone = over;
    window.dispatchEvent(new CustomEvent('micerebro-gallery-hover-change', { detail: { over } }));
    setIsHoveringDropZone(over);
  }, []);

  const collectDescendants = useCallback((rootId: string) => {
    const seen = new Set<string>([rootId]);
    let expanded = true;
    while (expanded) {
      expanded = false;
      for (const el of allElements) {
        if (el.parentId && seen.has(el.parentId) && !seen.has(el.id)) {
          seen.add(el.id);
          expanded = true;
        }
      }
    }
    return Array.from(seen);
  }, [allElements]);

  const normalizedContent = useMemo(() => {
    const c = content && typeof content === 'object' ? (content as any) : {};
    return {
      ...c,
      elementIds: Array.isArray(c.elementIds) ? c.elementIds : [],
      layout: c.layout === 'two-columns' ? 'two-columns' : 'single',
    };
  }, [content]);

  const attachDraggedElementToGallery = useCallback((draggedId: string) => {
    if (!draggedId || draggedId === id) return;
    const exists = allElements.some((el) => el.id === draggedId);
    if (!exists) return;

    // Leer SIEMPRE la versión más reciente del contenido de galería para evitar
    // sobrescribir elementIds cuando se arrastran varios elementos seguidos.
    const currentGallery = allElements.find((el) => el.id === id) as any;
    const currentContent =
      currentGallery && typeof currentGallery.content === 'object' && currentGallery.content !== null
        ? currentGallery.content
        : normalizedContent;
    const currentIds = Array.isArray((currentContent as any).elementIds)
      ? ((currentContent as any).elementIds as string[])
      : [];

    const nextIds = currentIds.includes(draggedId)
      ? currentIds
      : [...currentIds, draggedId];

    onUpdate(id, { content: { ...(currentContent as any), elementIds: nextIds } as any });

    const draggedElement = allElements.find((el) => el.id === draggedId);
    const draggedProps =
      draggedElement && typeof draggedElement.properties === 'object' && draggedElement.properties !== null
        ? draggedElement.properties
        : {};
    const draggedPos =
      (draggedProps as any).position && typeof (draggedProps as any).position === 'object'
        ? (draggedProps as any).position
        : { x: draggedElement?.x || 0, y: draggedElement?.y || 0 };

    // Ocultar raíz + descendientes para que no queden visibles detrás del panel.
    const treeIds = collectDescendants(draggedId);
    for (const treeId of treeIds) {
      if (treeId === draggedId) {
        onUpdate(treeId, {
          parentId: id,
          hidden: true,
          properties: {
            ...draggedProps,
            galleryOriginalPosition:
              (draggedProps as any).galleryOriginalPosition || {
                x: typeof draggedPos.x === 'number' ? draggedPos.x : parseFloat(String(draggedPos.x)) || 0,
                y: typeof draggedPos.y === 'number' ? draggedPos.y : parseFloat(String(draggedPos.y)) || 0,
              },
          } as any,
        });
      } else {
        onUpdate(treeId, { hidden: true });
      }
    }
  }, [allElements, collectDescendants, id, normalizedContent, onUpdate]);

  // Fallback robusto para react-rnd: cuando no hay HTML5 drop, capturamos el mouseup.
  const handleMouseUpCapture = useCallback(() => {
    if (typeof window === 'undefined') return;
    const draggedId = (window as any).__micerebroDraggingElementId as string | null;
    if (!draggedId) return;
    attachDraggedElementToGallery(draggedId);
    setGalleryHover(false);
  }, [attachDraggedElementToGallery, setGalleryHover]);

  // Rescate automático: si existen elementos ocultos con parentId de la galería
  // pero faltan en elementIds, reinyectarlos para evitar "desaparecidos".
  useEffect(() => {
    const currentGallery = allElements.find((el) => el.id === id) as any;
    const currentContent =
      currentGallery && typeof currentGallery.content === 'object' && currentGallery.content !== null
        ? currentGallery.content
        : normalizedContent;
    const currentIds = Array.isArray((currentContent as any).elementIds)
      ? ((currentContent as any).elementIds as string[])
      : [];

    const hiddenChildren = allElements
      .filter((el) => el.parentId === id && el.hidden === true)
      .map((el) => el.id);

    const missing = hiddenChildren.filter((childId) => !currentIds.includes(childId));
    if (missing.length === 0) return;

    onUpdate(id, {
      content: {
        ...(currentContent as any),
        elementIds: [...currentIds, ...missing],
      } as any,
    });
  }, [allElements, id, normalizedContent, onUpdate]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateRect = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      (window as any).__micerebroGalleryDropZoneRect = rect || null;
    };

    const onForceAttach = (event: Event) => {
      const custom = event as CustomEvent<{ elementId?: string }>;
      const forcedId = custom.detail?.elementId;
      if (!forcedId) return;
      attachDraggedElementToGallery(forcedId);
      setGalleryHover(false);
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('micerebro-gallery-force-attach', onForceAttach as EventListener);

    const intervalId = window.setInterval(updateRect, 300);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('micerebro-gallery-force-attach', onForceAttach as EventListener);
      window.clearInterval(intervalId);
      (window as any).__micerebroGalleryDropZoneRect = null;
    };
  }, [attachDraggedElementToGallery, setGalleryHover]);

  return (
    <div
      ref={rootRef}
      className={`w-full h-full ${isHoveringDropZone ? 'ring-2 ring-emerald-400 ring-offset-1 rounded-lg' : ''}`}
      onMouseUpCapture={handleMouseUpCapture}
      onDragEnterCapture={(e) => {
        e.preventDefault();
        setGalleryHover(true);
      }}
      onDragOverCapture={(e) => {
        e.preventDefault();
        setGalleryHover(true);
      }}
      onDragLeaveCapture={() => setGalleryHover(false)}
      onMouseEnter={() => {
        if (typeof window !== 'undefined' && (window as any).__micerebroDraggingElementId) {
          setGalleryHover(true);
        }
      }}
      onMouseLeave={() => setGalleryHover(false)}
    >
      <ContainerElement
        id={id}
        type="container"
        x={0}
        y={0}
        width={378}
        height={800}
        rotation={0}
        content={normalizedContent as any}
        properties={properties}
        scale={1}
        isSelected={false}
        onUpdate={onUpdate}
        deleteElement={() => {}}
        onSelectElement={() => {}}
        onEditElement={() => {}}
        onLocateElement={onLocateElement}
        onEditComment={() => {}}
        allElements={allElements}
        isPreview={false}
      />
    </div>
  );
}
