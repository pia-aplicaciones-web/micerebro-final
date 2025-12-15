'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { CommonElementProps, NotepadSimpleContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { GripVertical, Search, Calendar, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import SmartCategorizer from './smart-categorizer';
import { useDictationInput } from '@/hooks/use-dictation-input';

// Type guard para NotepadSimpleContent
function isNotepadSimpleContent(content: unknown): content is NotepadSimpleContent {
  return typeof content === 'object' && content !== null && ('text' in content || 'content' in content);
}

// Acepta CommonElementProps
export default function NotepadSimpleElement(props: CommonElementProps) {
  const {
    id,
    content,
    onUpdate,
    onEditElement,
    deleteElement,
    isListening,
    liveTranscript,
    finalTranscript,
    interimTranscript,
    isSelected
  } = props;

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extraer el texto del contenido
  const textContent = typeof content === 'string' 
    ? content 
    : isNotepadSimpleContent(content)
    ? (content.text || content.content || '')
    : '';

  const title = isNotepadSimpleContent(content) ? (content.title || 'Nuevo Notepad') : 'Nuevo Notepad';

  // Hook de autoguardado robusto para el texto
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => textareaRef.current?.value || '',
    onSave: async (newContent) => {
      if (newContent !== textContent) {
        const updatedContent: NotepadSimpleContent = {
          ...(isNotepadSimpleContent(content) ? content : {}),
          text: newContent,
          content: newContent,
        };
        onUpdate(id, { content: updatedContent });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => oldContent === newContent,
  });

  // Hook de autoguardado para el título
  const { saveStatus: titleSaveStatus, handleBlur: handleTitleBlur, handleChange: handleTitleChange } = useAutoSave({
    getContent: () => titleRef.current?.value || title,
    onSave: async (newTitle) => {
      if (newTitle !== title) {
        const updatedContent: NotepadSimpleContent = {
          ...(isNotepadSimpleContent(content) ? content : {}),
          title: newTitle,
        };
        onUpdate(id, { content: updatedContent });
      }
    },
    debounceMs: 1000,
    compareContent: (oldContent, newContent) => oldContent === newContent,
  });

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange();
  };

  const handleBlur = async () => {
    await handleAutoSaveBlur();
  };

  // Soporte para dictado: insertar texto cuando está escuchando y el textarea está enfocado
  // Scroll infinito: agregar más espacio cuando el usuario llega al final
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = textarea;
      // Si está cerca del final (100px), agregar más espacio
      if (scrollHeight - scrollTop - clientHeight < 100) {
        textarea.style.minHeight = `${scrollHeight + 500}px`;
      }
    };

    textarea.addEventListener('scroll', handleScroll);
    return () => textarea.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInsertDate = () => {
    if (textareaRef.current) {
      const dateStr = format(new Date(), 'dd/MM/yy');
      const cursorPos = textareaRef.current.selectionStart || textareaRef.current.value.length;
      const textBefore = textareaRef.current.value.substring(0, cursorPos);
      const textAfter = textareaRef.current.value.substring(cursorPos);
      textareaRef.current.value = textBefore + dateStr + ' ' + textAfter;
      textareaRef.current.setSelectionRange(cursorPos + dateStr.length + 1, cursorPos + dateStr.length + 1);
      handleChange();
      textareaRef.current.focus();
    }
  };

  const handleDelete = () => {
    if (deleteElement) {
      deleteElement(id);
    }
  };

  // Dictado: aplica transcripción respetando cursor y vista previa gris
  useDictationInput({
    elementRef: textareaRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLTextAreaElement>,
    isListening: isListening || false,
    liveTranscript: liveTranscript || '',
    finalTranscript: finalTranscript || '',
    interimTranscript: interimTranscript || '',
    isSelected: isSelected || false,
    enabled: true,
  });

  return (
    <div 
      ref={containerRef}
      className={cn(
        'w-full h-full flex flex-col rounded-lg shadow-lg overflow-hidden drag-handle',
        'cursor-grab active:cursor-grabbing'
      )}
      style={{ backgroundColor: '#ffff00' }} // Amarillo según imagen
      onClick={() => onEditElement(id)}
    >
      {/* HEADER - Según imagen */}
      <div className="flex items-center justify-between p-3 border-b border-gray-300 bg-white flex-shrink-0">
        {/* Izquierda: Grid icon (9 puntos) */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="drag-handle cursor-grab active:cursor-grabbing flex-shrink-0">
            <div className="grid grid-cols-3 gap-0.5 w-4 h-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="w-1 h-1 bg-gray-700 rounded-full" />
              ))}
            </div>
          </div>
          
          {/* Título editable */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => {
              const updatedContent: NotepadSimpleContent = {
                ...(isNotepadSimpleContent(content) ? content : {}),
                title: e.target.value,
              };
              onUpdate(id, { content: updatedContent });
              handleTitleChange();
            }}
            onBlur={handleTitleBlur}
            className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none flex-1 min-w-0 px-2"
            placeholder="Nuevo Notepad"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ fontFamily: 'inherit' }}
          />
          
          {/* Indicador de guardado del título */}
          <div className="flex-shrink-0">
            <SaveStatusIndicator status={titleSaveStatus} size="sm" />
          </div>
        </div>

        {/* Centro: Buscar */}
        <div className="flex items-center gap-2 mx-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 pr-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 placeholder-gray-400 outline-none focus:ring-1 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ width: '120px' }}
            />
          </div>
        </div>

        {/* Derecha: Calendar, Trash, X */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              handleInsertDate();
            }}
            title="Insertar Fecha"
          >
            <Calendar className="h-4 w-4 text-gray-700" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-red-50 text-red-600 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implementar cerrar/minimizar
            }}
            title="Cerrar"
          >
            <X className="h-4 w-4 text-gray-700" />
          </Button>
        </div>
      </div>

      {/* Categorizador Inteligente */}
      <SmartCategorizer 
        content={isNotepadSimpleContent(content) ? content : textContent} 
        onCategorySelect={(category) => {
          // Opcional: filtrar contenido por categoría
          console.log('Categoría seleccionada:', category);
        }}
      />

      {/* CONTENIDO - Scroll infinito con líneas azules */}
      <div className="flex-1 relative overflow-hidden" style={{ backgroundColor: '#ffff00' }}>
        {/* Fondo con líneas azules horizontales */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px)',
            backgroundSize: '100% 24px', // Líneas cada 24px (1.5rem)
            backgroundPosition: '0 60px', // Iniciar después del header
          }}
        />
        
        {/* Margen izquierdo (línea roja) */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-0"
          style={{
            left: '50px',
            width: '1px',
            backgroundColor: '#fca5a5',
            top: '60px', // Iniciar después del header
          }}
        />

        {/* Textarea con scroll infinito */}
        <textarea
          ref={textareaRef}
          value={textContent}
          onChange={handleContentChange}
          onBlur={handleBlur}
          className="absolute inset-0 w-full h-full bg-transparent text-sm resize-none outline-none z-10 font-mono"
          style={{
            paddingLeft: '70px', // Después del margen rojo (50px + 20px)
            paddingTop: '60px', // Después del header
            paddingRight: '16px',
            paddingBottom: '16px',
            lineHeight: '24px', // Alineado perfectamente con las líneas azules
            fontSize: '14px',
            color: '#1e293b',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            minHeight: '100%',
          }}
          placeholder="Escribe aquí..."
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />

        {/* Indicador de estado de guardado */}
        <div className="absolute top-2 right-2 z-20">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      </div>
    </div>
  );
}
