'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { CommonElementProps, DictadoContent, CanvasElementProperties } from '@/lib/types';
import {
  X, Minus, Maximize, GripVertical, Volume2, Mic, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useDictation } from '@/hooks/use-dictation';
import { usePastePlainText } from '@/hooks/use-paste-plain-text';

export default function DictadoElement(props: CommonElementProps) {
  const { 
    id,
    content,
    properties,
    onUpdate,
    deleteElement,
    isPreview = false, 
    isSelected,
    minimized,
    onEditElement,
    isListening = false,
    liveTranscript = '',
    finalTranscript = '',
    interimTranscript = '',
  } = props;

  const typedContent = (content || {}) as DictadoContent;
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isLocalListening, setIsLocalListening] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Usar hook de dictado para insertar texto
  // El hook espera: isListening, transcript (texto final), interimTranscript
  useDictation(isLocalListening || isListening, finalTranscript || liveTranscript || '', interimTranscript);

  // Auto-guardado con timestamp en título
  useEffect(() => {
    if (!typedContent.createdAt && contentRef.current) {
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      const title = `Dictado ${timestamp}`;
      onUpdate(id, { 
        content: { 
          ...typedContent, 
          title,
          createdAt: timestamp 
        } 
      });
    }
  }, []);

  // Hook de autoguardado
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange, forceSave } = useAutoSave({
    getContent: () => {
      if (isPreview || !contentRef.current) return '';
      const html = contentRef.current.innerHTML;
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    },
    onSave: async (newHtml) => {
      if (isPreview || !contentRef.current) return;
      const currentContent = typedContent.content || '';
      const normalizedNew = newHtml.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedCurrent = (currentContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      if (normalizedNew !== normalizedCurrent) {
        await onUpdate(id, { content: { ...typedContent, content: newHtml } });
      }
    },
    debounceMs: 2000,
    disabled: isPreview,
  });

  // Hook para pegar texto plano
  const { handlePaste } = usePastePlainText();

  const handleContentChange = () => {
    handleChange();
  };

  const handleBlurWithSave = async () => {
    await handleAutoSaveBlur();
  };

  const handleForceSave = useCallback(async () => {
    await forceSave();
    toast({ title: 'Guardado', description: 'Contenido guardado correctamente' });
  }, [forceSave, toast]);

  const toggleMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as CanvasElementProperties)?.size || { width: 642, height: 362 };

    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 642,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 362,
    };

    if (isCurrentlyMinimized) {
      const { originalSize, ...restProps } = (properties || {}) as Partial<CanvasElementProperties>;
      const restoredSize = originalSize || { width: 642, height: 362 };
      const newProperties: Partial<CanvasElementProperties> = {
        ...restProps,
        size: restoredSize
      };

      onUpdate(id, {
        minimized: false,
        properties: newProperties,
      });
    } else {
      const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 642;
      onUpdate(id, {
        minimized: true,
        properties: {
          ...properties,
          size: { width: currentWidth, height: 48 },
          originalSize: currentSizeNumeric
        },
      });
    }
  }, [isPreview, minimized, properties, onUpdate, id]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteElement) {
      deleteElement(id);
    }
  };

  const handleReadAloud = useCallback(() => {
    if (!contentRef.current) return;

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      setIsPaused(false);
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      return;
    }

    const text = contentRef.current.innerText || '';
    if (!text.trim()) {
      toast({ variant: 'destructive', title: 'Sin contenido', description: 'No hay texto para leer' });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.85;

    utterance.onend = () => {
      setIsReading(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsReading(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsReading(true);
  }, [isReading, isPaused, toast]);

  // Sincronizar contenido desde props
  useEffect(() => {
    if (contentRef.current && !isPreview) {
      const isFocused = document.activeElement === contentRef.current;
      const currentContent = typedContent.content || '';
      if (!isFocused && contentRef.current.innerHTML !== currentContent) {
        contentRef.current.innerHTML = currentContent || '';
      }
    }
  }, [typedContent.content, isPreview]);

  // Renderizado móvil: pantalla completa
  if (isMobile && !minimized) {
    return (
      <div
        className="fixed inset-0 z-[9999] bg-white/80 flex flex-col"
        style={{ fontFamily: 'Poppins, sans-serif' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header móvil */}
        <div className="flex items-center justify-between p-4 border-b bg-white/90">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClose}
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleForceSave}
              title="Guardar"
            >
              <Save className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleMinimize}
              title="Minimizar"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="drag-handle cursor-grab active:cursor-grabbing p-1">
              <GripVertical className="h-4 w-4" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleReadAloud}
              title="Leer en voz alta"
            >
              <Volume2 className={cn("h-4 w-4", isReading && "text-blue-500")} />
            </Button>
          </div>
          <div className="text-sm font-medium">
            {typedContent.title || 'Dictado'}
          </div>
        </div>

        {/* Contenido móvil con scroll infinito */}
        <div className="flex-1 overflow-y-auto p-4">
          <div
            ref={contentRef}
            contentEditable={!isPreview}
            suppressContentEditableWarning
            onInput={handleContentChange}
            onBlur={handleBlurWithSave}
            onFocus={() => onEditElement(id)}
            onPaste={handlePaste}
            className="outline-none w-full h-full min-h-full"
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: '20px',
              lineHeight: '1.6',
            }}
          />
          <div className="absolute top-20 right-4 z-10">
            <SaveStatusIndicator status={saveStatus} size="sm" />
          </div>
        </div>

        {/* Botón flotante Dictar */}
        <Button
          variant="ghost"
          className={cn(
            "fixed top-4 right-4 z-[10000] bg-white rounded-md border border-gray-700 w-14 h-14 p-3",
            (isLocalListening || isListening) && "bg-red-500 border-red-600 animate-pulse"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setIsLocalListening(!isLocalListening);
          }}
          title="Dictar"
        >
          <Mic className={cn(
            "h-8 w-8",
            (isLocalListening || isListening) ? "text-white" : "text-black"
          )} />
        </Button>
      </div>
    );
  }

  // Renderizado web: tamaño fijo estilo celular
  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const rotation = safeProperties.rotation || 0;

  return (
    <Card
      className={cn(
        'flex flex-col relative group overflow-hidden',
        'rounded-3xl shadow-2xl border-none',
        minimized && 'h-12'
      )}
      style={{
        width: minimized ? '100%' : '642px',
        height: minimized ? '48px' : '362px',
        backgroundColor: '#2C3E50', // Navy blue grisáceo
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) return;
        e.stopPropagation();
      }}
    >
      {/* Contenedor interno estilo celular */}
      <div
        className="flex-1 bg-white/80 rounded-3xl m-2 flex flex-col overflow-hidden"
        style={{ margin: '8px' }}
      >
        {/* Header web */}
        <div className="flex items-center justify-between p-2 border-b bg-white/50">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-black/10"
              onClick={handleClose}
              title="Cerrar"
            >
              <X className="h-4 w-4 text-gray-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-black/10"
              onClick={handleForceSave}
              title="Guardar"
            >
              <Save className="h-4 w-4 text-gray-700" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-black/10"
              onClick={toggleMinimize}
              title="Minimizar"
            >
              <Minus className="h-4 w-4 text-gray-700" />
            </Button>
            <div className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded">
              <GripVertical className="h-4 w-4 text-gray-700" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-black/10"
              onClick={handleReadAloud}
              title="Leer en voz alta"
            >
              <Volume2 className={cn("h-4 w-4 text-gray-700", isReading && "text-blue-500")} />
            </Button>
          </div>
          <div className="text-xs font-medium text-gray-700 truncate max-w-[200px]">
            {typedContent.title || 'Dictado'}
          </div>
        </div>

        {/* Contenido web con scroll */}
        {!minimized && (
          <div className="flex-1 overflow-y-auto p-3">
            <div
              ref={contentRef}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onInput={handleContentChange}
              onBlur={handleBlurWithSave}
              onFocus={() => onEditElement(id)}
              onPaste={handlePaste}
              className="outline-none w-full h-full min-h-full"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: '16px',
                lineHeight: '1.6',
              }}
            />
            <div className="absolute top-12 right-4 z-10">
              <SaveStatusIndicator status={saveStatus} size="sm" />
            </div>
          </div>
        )}

        {/* Botón flotante Dictar (web) */}
        {!minimized && (
          <Button
            variant="ghost"
            className={cn(
              "absolute top-16 right-4 z-10 bg-white rounded-md border border-gray-700 w-12 h-12 p-2",
              (isLocalListening || isListening) && "bg-red-500 border-red-600 animate-pulse"
            )}
            onClick={(e) => {
              e.stopPropagation();
              setIsLocalListening(!isLocalListening);
            }}
            title="Dictar"
          >
            <Mic className={cn(
              "h-6 w-6",
              (isLocalListening || isListening) ? "text-white" : "text-black"
            )} />
          </Button>
        )}
      </div>
    </Card>
  );
}
