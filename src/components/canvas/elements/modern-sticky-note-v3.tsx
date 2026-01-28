'use client';

/**
 * PROPUESTA 3: Flat Design Moderno
 * Diseño plano con micro-interacciones y animaciones sutiles, enfoque en usabilidad
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { usePastePlainText } from '@/hooks/use-paste-plain-text';
import { 
  X, GripVertical, Minus, Save, Volume2, Paintbrush, 
  Maximize, Copy, Camera, RotateCw 
} from 'lucide-react';
import { toPng } from 'html-to-image';

// 14 Colores pastel para flat design
const PASTEL_COLORS = {
  rose: { bg: '#FFE5E5', name: 'Rosa' },
  lavender: { bg: '#E5E1FF', name: 'Lavanda' },
  mint: { bg: '#E5FFE5', name: 'Menta' },
  peach: { bg: '#FFE5D9', name: 'Durazno' },
  sky: { bg: '#E5F5FF', name: 'Cielo' },
  butter: { bg: '#FFF9E5', name: 'Mantequilla' },
  lilac: { bg: '#F0E5FF', name: 'Lila' },
  sage: { bg: '#E5F0E5', name: 'Salvia' },
  coral: { bg: '#FFE5D0', name: 'Coral' },
  aqua: { bg: '#E5FFF5', name: 'Aqua' },
  cream: { bg: '#FFF5E5', name: 'Crema' },
  periwinkle: { bg: '#E5EBFF', name: 'Periwinkle' },
  blush: { bg: '#FFE5F0', name: 'Rubor' },
  honey: { bg: '#FFF0E5', name: 'Miel' },
} as const;

const TEXT_COLOR = '#4A5568';

export default function ModernStickyNoteV3(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    isSelected,
    onUpdate,
    onEditElement,
    onSelectElement,
    deleteElement,
    isPreview,
    minimized,
  } = props;

  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const { handlePaste } = usePastePlainText();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const colorKey = (safeProperties.color as keyof typeof PASTEL_COLORS) || 'rose';
  const currentColor = PASTEL_COLORS[colorKey] || PASTEL_COLORS.rose;

  const typedContent = (content || {}) as { text: string };
  const textContent = typedContent.text || '';

  // Auto-save
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = editorRef.current?.innerHTML || '';
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    },
    onSave: async (newContent) => {
      const normalizedTextContent = (textContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      if (newContent !== normalizedTextContent) {
        await onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 2000,
  });

  useEffect(() => {
    if (editorRef.current && !minimized) {
      const isFocused = document.activeElement === editorRef.current;
      if (!isFocused && editorRef.current.innerHTML !== textContent) {
        editorRef.current.innerHTML = textContent || '';
      }
    }
  }, [textContent, minimized]);

  const handleContentChange = () => handleChange();
  const handleBlurWithSave = async () => await handleAutoSaveBlur();

  const handleColorChange = (newColorKey: keyof typeof PASTEL_COLORS) => {
    onUpdate(id, { properties: { ...safeProperties, color: newColorKey } });
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteElement) deleteElement(id);
  };

  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;
    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as CanvasElementProperties)?.size || { width: 280, height: 280 };
    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 280,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 280,
    };
    if (isCurrentlyMinimized) {
      const { originalSize, ...restProps } = (properties || {}) as Partial<CanvasElementProperties>;
      const restoredSize = originalSize || { width: 280, height: 280 };
      onUpdate(id, { minimized: false, properties: { ...restProps, size: restoredSize } });
    } else {
      onUpdate(id, {
        minimized: true,
        properties: { ...properties, size: { width: currentSizeNumeric.width, height: 48 }, originalSize: currentSizeNumeric },
      });
    }
  }, [isPreview, minimized, properties, onUpdate, id]);

  const handleForceSave = useCallback(async () => {
    await handleAutoSaveBlur();
    toast({ title: 'Guardado', description: 'Nota guardada' });
  }, [handleAutoSaveBlur, toast]);

  const handleReadAloud = useCallback(() => {
    if (!editorRef.current) return;
    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      return;
    }
    const text = editorRef.current.innerText || '';
    if (!text.trim()) {
      toast({ variant: 'destructive', title: 'Sin contenido', description: 'No hay texto para leer' });
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.85;
    utterance.onend = () => setIsReading(false);
    utterance.onerror = () => setIsReading(false);
    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  }, [isReading, toast]);

  const handleCopyText = async () => {
    try {
      const text = editorRef.current?.innerText || '';
      if (!text.trim()) {
        toast({ variant: 'destructive', title: 'Sin contenido' });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado', description: 'Texto copiado al portapapeles' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error al copiar' });
    }
  };

  const handleExportCapture = useCallback(async () => {
    try {
      const stickyElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!stickyElement) return;
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 150));
      const dataUrl = await toPng(stickyElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: currentColor.bg,
      });
      const link = document.createElement('a');
      link.download = `nota-adhesiva_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setIsCapturing(false);
      toast({ title: 'Exportado', description: 'Nota exportada como PNG' });
    } catch (error) {
      setIsCapturing(false);
      toast({ variant: 'destructive', title: 'Error al exportar' });
    }
  }, [id, currentColor.bg, toast]);

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rotation = (safeProperties.rotation || 0) + 15;
    onUpdate(id, { properties: { ...safeProperties, rotation: rotation % 360 } });
  };

  return (
    <div
      data-element-id={id}
      className="relative w-full h-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) return;
        e.stopPropagation();
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onDoubleClick={() => onEditElement(id)}
      style={{
        transform: `rotate(${safeProperties.rotation || 0}deg)`,
        transformOrigin: 'center',
      }}
    >
      {/* Flat Design Container */}
      <div
        className={cn(
          "relative w-full h-full rounded-xl transition-all duration-200",
          "border-2 border-transparent",
          isSelected && "border-gray-300",
          isHovered && !isSelected && "border-gray-200",
          minimized && "h-12"
        )}
        style={{
          backgroundColor: currentColor.bg,
          boxShadow: isSelected 
            ? '0 4px 12px rgba(0,0,0,0.15)' 
            : isHovered 
            ? '0 2px 8px rgba(0,0,0,0.1)' 
            : '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {/* Compact Header */}
        <div className={cn(
          "absolute top-2 left-2 right-2 flex items-center gap-1 z-20 transition-all duration-200",
          "bg-white/95 rounded-lg px-2 py-1.5 border border-gray-200/50",
          isSelected || isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[-4px] pointer-events-none"
        )}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-gray-100 rounded-md transition-colors" 
            onClick={handleClose} 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="h-3.5 w-3.5 text-gray-600" />
          </Button>
          <div className="drag-handle cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-gray-100 transition-colors">
            <GripVertical className="h-3.5 w-3.5 text-gray-600" />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-gray-100 rounded-md transition-colors" 
            onClick={toggleMinimize} 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Minus className="h-3.5 w-3.5 text-gray-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 hover:bg-gray-100 rounded-md transition-colors" 
            onClick={handleForceSave} 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Save className="h-3.5 w-3.5 text-gray-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-6 w-6 hover:bg-gray-100 rounded-md transition-all",
              isReading && "bg-blue-50 text-blue-600"
            )} 
            onClick={handleReadAloud} 
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Volume2 className="h-3.5 w-3.5" />
          </Button>
          {isSelected && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 hover:bg-gray-100 rounded-md transition-colors" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paintbrush className="h-3.5 w-3.5 text-gray-600" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-white border border-gray-200 shadow-lg rounded-lg">
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(PASTEL_COLORS).map(([key, color]) => (
                      <button
                        key={key}
                        onClick={() => handleColorChange(key as keyof typeof PASTEL_COLORS)}
                        className={cn(
                          "w-8 h-8 rounded-lg transition-all hover:scale-110 hover:ring-2 hover:ring-gray-300",
                          colorKey === key && "ring-2 ring-gray-400 scale-110"
                        )}
                        style={{ backgroundColor: color.bg }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Maximize className="h-3.5 w-3.5 text-gray-600" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white border border-gray-200 shadow-lg rounded-lg">
                  <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing} className="cursor-pointer">
                    <Camera className="mr-2 h-4 w-4" />
                    <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyText(); }} className="cursor-pointer">
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copiar texto</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleRotate} onMouseDown={(e) => e.stopPropagation()} className="cursor-pointer">
                    <RotateCw className="mr-2 h-4 w-4" />
                    <span>Rotar 15°</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Content Area */}
        {!minimized && (
          <div className="relative w-full h-full pt-12 pb-4 px-4">
            <div
              ref={editorRef}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onInput={handleContentChange}
              onBlur={handleBlurWithSave}
              onFocus={() => onEditElement(id)}
              onPaste={handlePaste}
              className="w-full h-full outline-none cursor-text overflow-auto transition-all"
              style={{
                fontFamily: '"Raleway", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: '16px',
                color: TEXT_COLOR,
                lineHeight: '1.6',
                touchAction: 'manipulation',
                WebkitUserSelect: 'text',
                userSelect: 'text',
              }}
            />
            <div className="absolute top-14 right-4">
              <SaveStatusIndicator status={saveStatus} size="sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
