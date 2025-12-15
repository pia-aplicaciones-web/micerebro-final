'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Minus, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdeasPanelProps {
  value: string;
  onChange: (value: string) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export default function IdeasPanel({
  value,
  onChange,
  isMinimized,
  onToggleMinimize,
}: IdeasPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Size state: 7x7 cm ≈ 198x198 px (at 72 DPI, but we'll use a good approximation)
  const [size, setSize] = useState({ width: 200, height: 200 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Handle resize (only top and left directions)
  const handleResizeStart = (e: React.MouseEvent, direction: 'top' | 'left' | 'top-left') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = resizeStartRef.current.x - moveEvent.clientX;
      const deltaY = resizeStartRef.current.y - moveEvent.clientY;

      let newWidth = size.width;
      let newHeight = size.height;

      if (direction === 'left' || direction === 'top-left') {
        newWidth = Math.max(150, resizeStartRef.current.width + deltaX);
      }
      if (direction === 'top' || direction === 'top-left') {
        newHeight = Math.max(100, resizeStartRef.current.height + deltaY);
      }

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (isMinimized) {
    return (
      <div
        className="absolute bottom-4 right-4 bg-white rounded-lg shadow-md border border-gray-200 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-2"
        onClick={onToggleMinimize}
      >
        <ChevronUp className="w-4 h-4 text-gray-500" />
        <span className="text-xs text-gray-600 font-medium">Ideas</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col"
      style={{
        width: size.width,
        height: size.height,
      }}
    >
      {/* Resize handles */}
      {/* Top resize */}
      <div
        className="absolute -top-1 left-2 right-2 h-2 cursor-n-resize hover:bg-blue-200/50 rounded"
        onMouseDown={(e) => handleResizeStart(e, 'top')}
      />
      {/* Left resize */}
      <div
        className="absolute top-2 -left-1 bottom-2 w-2 cursor-w-resize hover:bg-blue-200/50 rounded"
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />
      {/* Top-left corner resize */}
      <div
        className="absolute -top-1 -left-1 w-3 h-3 cursor-nw-resize hover:bg-blue-200/50 rounded"
        onMouseDown={(e) => handleResizeStart(e, 'top-left')}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50/50 rounded-t-lg">
        <span className="text-xs font-medium text-gray-600">Ideas que no quiero olvidar</span>
        <button
          onClick={onToggleMinimize}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          <Minus className="w-3 h-3 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Escribe tus ideas aquí..."
          className={cn(
            'w-full h-full resize-none border-0 outline-none p-3',
            'text-[11px] leading-relaxed text-gray-700',
            'placeholder:text-gray-400',
            'overflow-y-auto'
          )}
          style={{ fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif' }}
        />
      </div>
    </div>
  );
}
