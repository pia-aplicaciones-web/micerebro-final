'use client';
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { CommonElementProps, DictadoContent, CanvasElementProperties } from '@/lib/types';
import {
  X, Minus, Maximize, GripVertical, Volume2, Save, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { usePastePlainText } from '@/hooks/use-paste-plain-text';
import { getDefaultSpeechVoice } from '@/lib/speech-voice';

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
  } = props;

  const typedContent = (content || {}) as DictadoContent;
  const contentRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-guardado con timestamp en título
  useEffect(() => {
    if (!typedContent.createdAt && contentRef.current) {
      const timestamp = format(new Date(), 'dd/MM/yyyy HH:mm');
      const title = `iPhone ${timestamp}`;
      onUpdate(id, { 
        content: { 
          ...typedContent, 
          title,
          createdAt: timestamp 
        } as DictadoContent
      });
      // Sincronizar el título con el ref después de actualizar
      if (titleRef.current) {
        titleRef.current.innerText = title;
      }
    }
  }, []);

  // Sincronizar el título cuando cambia desde fuera
  useEffect(() => {
    if (titleRef.current && typedContent.title && titleRef.current.innerText !== typedContent.title) {
      titleRef.current.innerText = typedContent.title;
    }
  }, [typedContent.title]);

  // Hook de autoguardado para el título
  const { handleBlur: handleTitleBlurAutoSave } = useAutoSave({
    getContent: () => titleRef.current?.innerText || '',
    onSave: async (newTitle) => {
      if (isPreview || !titleRef.current) return;
      if (typedContent.title !== newTitle) {
        const newContent: DictadoContent = { ...typedContent, title: newTitle };
        onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 1000,
    disabled: isPreview,
  });

  const handleTitleBlur = useCallback(async () => {
    if (isPreview || !titleRef.current) return;
    await handleTitleBlurAutoSave();
  }, [isPreview, handleTitleBlurAutoSave]);

  const handleTitleFocus = useCallback(() => {
    if (isPreview || !titleRef.current) return;
    onEditElement(id);
  }, [isPreview, onEditElement, id]);

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

  const toggleMinimize = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isPreview) return;

    const isCurrentlyMinimized = !!minimized;
    const currentSize = (properties as CanvasElementProperties)?.size || { width: 280, height: 600 };

    const currentSizeNumeric = {
      width: typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 280,
      height: typeof currentSize.height === 'number' ? currentSize.height : parseFloat(String(currentSize.height)) || 600,
    };

    if (isCurrentlyMinimized) {
      const { originalSize, ...restProps } = (properties || {}) as Partial<CanvasElementProperties>;
      const restoredSize = originalSize || { width: 280, height: 600 };
      onUpdate(id, {
        minimized: false,
        properties: { ...restProps, size: restoredSize },
      });
    } else {
      await handleTitleBlurAutoSave();
      await handleAutoSaveBlur();
      const titleText = titleRef.current?.innerText ?? typedContent.title ?? '';
      const contentHtml = contentRef.current?.innerHTML ?? typedContent.content ?? '';
      const updatedContent: DictadoContent = { ...typedContent, title: titleText, content: contentHtml };
      const currentWidth = typeof currentSize.width === 'number' ? currentSize.width : parseFloat(String(currentSize.width)) || 280;
      onUpdate(id, {
        minimized: true,
        content: updatedContent,
        properties: {
          ...properties,
          size: { width: currentWidth, height: 48 },
          originalSize: currentSizeNumeric,
        },
      });
    }
  }, [isPreview, minimized, properties, onUpdate, id, handleTitleBlurAutoSave, handleAutoSaveBlur, typedContent]);

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
    const voice = getDefaultSpeechVoice();
    if (voice) utterance.voice = voice;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

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

  const handleCopyAll = useCallback(async () => {
    if (!contentRef.current) return;

    try {
      const text = contentRef.current.innerText || contentRef.current.textContent || '';
      if (!text.trim()) {
        toast({ variant: 'destructive', title: 'Sin contenido', description: 'No hay texto para copiar' });
        return;
      }

      // Seleccionar todo el texto
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }

      // Copiar al portapapeles
      await navigator.clipboard.writeText(text);
      toast({ title: 'Copiado', description: 'Todo el texto ha sido copiado al portapapeles' });
    } catch (error) {
      console.error('Error al copiar:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo copiar el texto' });
    }
  }, [toast]);

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

  // Renderizado único (web y móvil): tamaño fijo estilo celular
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
        width: minimized ? '100%' : '280px',
        height: minimized ? '48px' : '600px',
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
        className="flex-1 bg-white rounded-3xl m-2 flex flex-col overflow-hidden"
        style={{ margin: '8px' }}
      >
        {/* Header web */}
        <div className="flex items-center justify-between p-2 border-b bg-white">
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
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-black/10"
              onClick={handleCopyAll}
              title="Seleccionar y copiar todo el texto"
            >
              <Copy className="h-4 w-4 text-gray-700" />
            </Button>
          </div>
          <div
            ref={titleRef}
            contentEditable={!isPreview}
            spellCheck="true"
            suppressContentEditableWarning
            onFocus={handleTitleFocus}
            onBlur={handleTitleBlur}
            className="bg-transparent flex-grow outline-none cursor-text text-xs font-medium text-gray-700 p-1 min-w-0 truncate max-w-[200px]"
            data-placeholder="iPhone"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (titleRef.current && !isPreview) {
                titleRef.current.focus();
                requestAnimationFrame(() => {
                  setTimeout(() => {
                    const selection = window.getSelection();
                    if (selection) {
                      if (selection.rangeCount === 0) {
                        const range = document.createRange();
                        range.selectNodeContents(titleRef.current!);
                        range.collapse(false);
                        selection.removeAllRanges();
                        selection.addRange(range);
                      }
                    }
                  }, 100);
                });
              }
            }}
            style={{
              touchAction: 'manipulation',
              WebkitUserSelect: 'text',
              userSelect: 'text',
            }}
          >
            {typedContent.title || 'iPhone'}
          </div>
        </div>

        {/* Contenido web con scroll infinito */}
        {!minimized && (
          <div className="flex-1 overflow-y-auto p-3" style={{ minHeight: '100%' }}>
            <div
              ref={contentRef}
              contentEditable={!isPreview}
              suppressContentEditableWarning
              onInput={handleContentChange}
              onBlur={handleBlurWithSave}
              onFocus={() => {
                onEditElement(id);
                // Asegurar que el cursor esté visible
                if (contentRef.current) {
                  const selection = window.getSelection();
                  if (selection && selection.rangeCount === 0) {
                    const range = document.createRange();
                    range.selectNodeContents(contentRef.current);
                    range.collapse(false); // Al final
                    selection.removeAllRanges();
                    selection.addRange(range);
                  }
                }
              }}
              onTouchStart={(e) => {
                // En móvil, establecer foco y cursor al tocar
                e.stopPropagation(); // Evitar que el evento suba al contenedor
                if (contentRef.current && !isPreview) {
                  contentRef.current.focus();
                  requestAnimationFrame(() => {
                    setTimeout(() => {
                      const selection = window.getSelection();
                      if (selection) {
                        if (selection.rangeCount === 0) {
                          const range = document.createRange();
                          range.selectNodeContents(contentRef.current!);
                          range.collapse(false); // Al final
                          selection.removeAllRanges();
                          selection.addRange(range);
                        }
                      }
                    }, 100);
                  });
                }
              }}
              onPaste={handlePaste}
              className="outline-none w-full h-full min-h-full"
              style={{
                fontFamily: 'Poppins, sans-serif',
                fontSize: '16px',
                lineHeight: '1.6',
                touchAction: 'manipulation',
                WebkitUserSelect: 'text',
                userSelect: 'text',
                minHeight: '100%', // Scroll infinito
              }}
            />
            <div className="absolute top-12 right-4 z-10">
              <SaveStatusIndicator status={saveStatus} size="sm" />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
