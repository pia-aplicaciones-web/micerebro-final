'use client';

/**
 * PROPUESTA 2: Neumorphism Soft
 * Sombras suaves que crean efecto 3D, diseño "soft UI" acogedor
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

// 14 Colores pastel para neumorphism
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

export default function ModernStickyNoteV2(props: CommonElementProps) {
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

  // Neumorphism shadow helper
  const getNeumorphismShadow = (inset = false) => {
    if (inset) {
      return `inset 4px 4px 8px rgba(255,255,255,0.6), inset -4px -4px 8px rgba(0,0,0,0.1)`;
    }
    return `6px 6px 12px rgba(0,0,0,0.15), -6px -6px 12px rgba(255,255,255,0.7)`;
  };

  return (
    <div
      data-element-id={id}
      className="relative w-full h-full group"
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
      {/* Neumorphism Container */}
      <div
        className={cn(
          "relative w-full h-full rounded-3xl transition-all duration-300",
          minimized && "h-12"
        )}
        style={{
          backgroundColor: currentColor.bg,
          boxShadow: getNeumorphismShadow(),
        }}
      >
        {/* Header con efecto neumorphism */}
        <div className={cn(
          "absolute top-2 left-2 right-2 flex items-center gap-1.5 z-20 transition-opacity duration-200 rounded-2xl px-2 py-1.5",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        style={{
          backgroundColor: currentColor.bg,
          boxShadow: getNeumorphismShadow(true),
        }}>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-xl hover:opacity-80 transition-all" 
            onClick={handleClose} 
            onMouseDown={(e) => e.stopPropagation()}
            style={{ boxShadow: getNeumorphismShadow(true) }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
          <div className="drag-handle cursor-grab active:cursor-grabbing p-1 rounded-xl">
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-xl hover:opacity-80 transition-all" 
            onClick={toggleMinimize} 
            onMouseDown={(e) => e.stopPropagation()}
            style={{ boxShadow: getNeumorphismShadow(true) }}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 rounded-xl hover:opacity-80 transition-all" 
            onClick={handleForceSave} 
            onMouseDown={(e) => e.stopPropagation()}
            style={{ boxShadow: getNeumorphismShadow(true) }}
          >
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-7 w-7 rounded-xl hover:opacity-80 transition-all", isReading && "bg-blue-200")} 
            onClick={handleReadAloud} 
            onMouseDown={(e) => e.stopPropagation()}
            style={{ boxShadow: getNeumorphismShadow(true) }}
          >
            <Volume2 className={cn("h-3.5 w-3.5", isReading && "text-blue-700")} />
          </Button>
          {isSelected && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-xl hover:opacity-80 transition-all" 
                    onClick={(e) => e.stopPropagation()}
                    style={{ boxShadow: getNeumorphismShadow(true) }}
                  >
                    <Paintbrush className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-white rounded-2xl" style={{ boxShadow: getNeumorphismShadow() }}>
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(PASTEL_COLORS).map(([key, color]) => (
                      <button
                        key={key}
                        onClick={() => handleColorChange(key as keyof typeof PASTEL_COLORS)}
                        className={cn(
                          "w-8 h-8 rounded-xl transition-all hover:scale-110",
                          colorKey === key && "ring-2 ring-offset-1 ring-gray-400 scale-110"
                        )}
                        style={{ 
                          backgroundColor: color.bg,
                          boxShadow: getNeumorphismShadow(true)
                        }}
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
                    className="h-7 w-7 rounded-xl hover:opacity-80 transition-all"
                    style={{ boxShadow: getNeumorphismShadow(true) }}
                  >
                    <Maximize className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white rounded-2xl" style={{ boxShadow: getNeumorphismShadow() }}>
                  <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing}>
                    <Camera className="mr-2 h-4 w-4" />
                    <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyText(); }}>
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copiar texto</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleRotate} onMouseDown={(e) => e.stopPropagation()}>
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
          <div className="relative w-full h-full pt-14 pb-4 px-4">
            <div
              ref={editorRef}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onInput={handleContentChange}
              onBlur={handleBlurWithSave}
              onFocus={() => onEditElement(id)}
              onPaste={handlePaste}
              className="w-full h-full outline-none cursor-text overflow-auto"
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
            <div className="absolute top-16 right-4">
              <SaveStatusIndicator status={saveStatus} size="sm" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
