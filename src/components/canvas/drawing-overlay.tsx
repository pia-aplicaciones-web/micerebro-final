'use client';

import React, { useRef, useCallback, useEffect } from 'react';

interface DrawingOverlayProps {
  color: string;
  strokeWidth: number;
}

export function DrawingOverlay({ color, strokeWidth }: DrawingOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  // Límites del elemento sobre el que se está dibujando, en coordenadas relativas al overlay
  const activeBounds = useRef<{ left: number; top: number; right: number; bottom: number } | null>(null);

  const getCoords = useCallback((e: React.PointerEvent | PointerEvent) => {
    const el = containerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  }, []);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  useEffect(() => {
    resizeCanvas();
    const ro = new ResizeObserver(resizeCanvas);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', resizeCanvas);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  const drawLine = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    const bounds = activeBounds.current;
    // Si no hay elemento activo, no dibujamos nada
    if (!bounds) return;

    const isInside = (p: { x: number; y: number }) =>
      p.x >= bounds.left &&
      p.x <= bounds.right &&
      p.y >= bounds.top &&
      p.y <= bounds.bottom;

    // Si ambos puntos están fuera de los límites del elemento, ignoramos este segmento
    if (!isInside(from) && !isInside(to)) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [color, strokeWidth]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();

    const overlay = containerRef.current;
    if (!overlay) return;

    // Deshabilitar momentáneamente el overlay para detectar qué elemento hay debajo
    const previousPointerEvents = overlay.style.pointerEvents;
    overlay.style.pointerEvents = 'none';
    const targetUnderPointer = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    overlay.style.pointerEvents = previousPointerEvents || 'auto';

    const elementContainer = targetUnderPointer?.closest('[data-element-id]') as HTMLElement | null;
    if (!elementContainer) {
      activeBounds.current = null;
      isDrawing.current = false;
      lastPoint.current = null;
      return;
    }

    // Calcular límites del elemento en coordenadas del overlay
    const overlayRect = overlay.getBoundingClientRect();
    const elementRect = elementContainer.getBoundingClientRect();
    activeBounds.current = {
      left: elementRect.left - overlayRect.left,
      top: elementRect.top - overlayRect.top,
      right: elementRect.right - overlayRect.left,
      bottom: elementRect.bottom - overlayRect.top,
    };

    const coords = getCoords(e);
    if (!coords || !activeBounds.current) return;

    const { left, top, right, bottom } = activeBounds.current;
    // Solo iniciamos el trazo si el punto inicial está dentro del elemento
    if (coords.x < left || coords.x > right || coords.y < top || coords.y > bottom) {
      activeBounds.current = null;
      isDrawing.current = false;
      lastPoint.current = null;
      return;
    }

    isDrawing.current = true;
    lastPoint.current = coords;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(coords.x, coords.y, strokeWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [getCoords, color, strokeWidth]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing.current || !lastPoint.current) return;
    e.preventDefault();
    const coords = getCoords(e);
    const bounds = activeBounds.current;
    if (!coords || !bounds) return;

    // Si nos salimos del elemento, dejamos de dibujar
    if (
      coords.x < bounds.left ||
      coords.x > bounds.right ||
      coords.y < bounds.top ||
      coords.y > bounds.bottom
    ) {
      isDrawing.current = false;
      lastPoint.current = null;
      activeBounds.current = null;
      return;
    }

    drawLine(lastPoint.current, coords);
    lastPoint.current = coords;
  }, [getCoords, drawLine]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (isDrawing.current) e.preventDefault();
    isDrawing.current = false;
    lastPoint.current = null;
    activeBounds.current = null;
  }, []);

  const onPointerLeave = useCallback((e: React.PointerEvent) => {
    if (isDrawing.current) e.preventDefault();
    isDrawing.current = false;
    lastPoint.current = null;
    activeBounds.current = null;
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[20] touch-none"
      style={{ pointerEvents: 'auto' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerLeave}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block"
        style={{ touchAction: 'none' }}
      />
    </div>
  );
}
