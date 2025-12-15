'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import type { CommonElementProps, CommentContent } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, FileImage, Copy, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDictationBinding } from '@/hooks/use-dictation-binding';
import html2canvas from 'html2canvas';

export default function CommentRElement(props: CommonElementProps) {
  const {
    id,
    content,
    isSelected,
    onSelectElement,
    onUpdate,
    deleteElement,
    isPreview,
    isListening = false,
    finalTranscript = '',
    interimTranscript = '',
  } = props;

  const data: CommentContent =
    typeof content === 'object' && content !== null ? (content as CommentContent) : { text: '' };

  const textRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Dictation binding
  const { bindDictationTarget } = useDictationBinding({
    isListening: isListening || false,
    finalTranscript: finalTranscript || '',
    interimTranscript: interimTranscript || '',
    isSelected: isSelected || false,
  });

  // Auto-resize del textarea
  const autoResize = useCallback(() => {
    const textarea = textRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';

      // Calcular nuevo tamaño del elemento
      const newHeight = Math.max(textarea.scrollHeight + 100, 140); // mínimo 140px
      const currentWidth = 240; // ancho fijo para comment-r

      // Actualizar el tamaño del elemento padre
      onUpdate(id, {
        width: currentWidth,
        height: newHeight,
        properties: {
          size: { width: currentWidth, height: newHeight }
        }
      });
    }
  }, [id, onUpdate]);

  // Auto-resize cuando cambia el texto
  useEffect(() => {
    autoResize();
  }, [data.text, autoResize]);

  // Exportar a PNG
  const handleExportPng = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const el = cardRef.current;
      const canvas = await html2canvas(el, {
        backgroundColor: 'transparent',
        scale: 3,
        useCORS: true,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `comentario-${id}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting comment to PNG:', error);
    }
  }, [id]);

  // Copiar como texto sin formato
  const handleCopyText = useCallback(async () => {
    if (data.text) {
      try {
        await navigator.clipboard.writeText(data.text);
        console.log('Texto copiado al portapapeles');
      } catch (error) {
        console.error('Error copying text:', error);
      }
    }
  }, [data.text]);

  return (
    <Card
      ref={cardRef}
      data-element-id={id}
      className={cn(
        'w-full h-full rounded-2xl border shadow-lg flex flex-col overflow-hidden',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) return;
        e.stopPropagation();
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Estado de dictado */}
      {(isListening && isSelected) && (
        <div className="absolute top-3 right-3 z-10 bg-blue-500 text-white px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
          <Mic className="w-3 h-3" />
          <span className="text-xs font-medium">Escuchando...</span>
        </div>
      )}

      {/* Header */}
      <div className="drag-handle flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-white/60 to-white/40 rounded-t-2xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="font-semibold text-gray-700 text-sm">Comentario R</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleCopyText();
            }}
            title="Copiar texto"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-green-600 hover:bg-green-50"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleExportPng();
            }}
            title="Exportar PNG"
          >
            <FileImage className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-red-500 hover:bg-red-50"
            onMouseDown={(e) => {
              e.stopPropagation();
              deleteElement(id);
            }}
            title="Eliminar"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1">
        <textarea
          ref={textRef}
          className="w-full bg-transparent outline-none resize-none text-gray-800 overflow-hidden text-base leading-relaxed placeholder-gray-400"
          placeholder="Escribe tu comentario aquí..."
          value={data.text || ''}
          onChange={(e) => {
            onUpdate(id, { content: { ...data, text: e.target.value } });
            // Auto-resize después de cambiar el texto
            setTimeout(autoResize, 0);
          }}
          onFocus={(e) => {
            bindDictationTarget(e.currentTarget);
            onSelectElement(id, false);
          }}
          onClick={(e) => e.stopPropagation()}
          disabled={isPreview}
          style={{
            minHeight: '60px',
            height: 'auto',
            lineHeight: '1.6',
          }}
        />
      </div>

      {/* Footer con indicador de estado */}
      <div className="px-4 py-2 border-t bg-gradient-to-r from-white/40 to-white/20 rounded-b-2xl">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Comentario con dictado</span>
          {data.text && (
            <span>{data.text.length} caracteres</span>
          )}
        </div>
      </div>
    </Card>
  );
}