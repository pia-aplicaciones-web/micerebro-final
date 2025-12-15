'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import type { CommonElementProps, CommentContent } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, FileImage, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDictationBinding } from '@/hooks/use-dictation-binding';
import html2canvas from 'html2canvas';

export default function CommentSmallElement(props: CommonElementProps) {
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
      const newHeight = Math.max(textarea.scrollHeight + 80, 120); // mínimo 120px
      const currentWidth = 220; // ancho fijo para comment-small

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
        backgroundColor: '#ffffff',
        scale: 3,
        useCORS: true,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `texto-${id}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting text to PNG:', error);
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
        'w-full h-full rounded-xl border shadow-sm flex flex-col overflow-hidden bg-white',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('.drag-handle')) return;
        e.stopPropagation();
        onSelectElement(id, e.shiftKey || e.ctrlKey || e.metaKey);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Estado de dictado */}
      {(isListening && isSelected) && (
        <div className="absolute bottom-2 right-2 text-xs text-blue-600 font-medium z-10 bg-white px-2 py-1 rounded-full shadow-sm">
          🎤 Escuchando...
        </div>
      )}
      <div className="drag-handle flex items-center justify-between px-3 py-2 border-b text-xs bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-gray-400" />
          <span className="font-semibold text-gray-700">Texto</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500 hover:text-blue-600"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleCopyText();
            }}
            title="Copiar texto"
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500 hover:text-green-600"
            onMouseDown={(e) => {
              e.stopPropagation();
              handleExportPng();
            }}
            title="Exportar PNG"
          >
            <FileImage className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500 hover:text-red-500"
            onMouseDown={(e) => {
              e.stopPropagation();
              deleteElement(id);
            }}
            title="Eliminar"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="p-3 flex-1">
        <textarea
          ref={textRef}
          className="w-full bg-transparent outline-none resize-none text-gray-800 overflow-hidden text-sm leading-5 font-['Poppins']"
          placeholder="Escribe tu texto aquí..."
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
          style={{ minHeight: '40px', height: 'auto' }}
        />
      </div>
    </Card>
  );
}