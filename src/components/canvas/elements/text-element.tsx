
// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { CommonElementProps } from '@/lib/types'; // <-- IMPORTADO
import { cn } from '@/lib/utils';
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { updateInnerHTMLPreservingCursor } from '@/lib/cursor-helper';

// Acepta CommonElementProps
export default function TextElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    onEditElement,
    isSelected,
    deleteElement,
  } = props;

  const editorRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);

  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const { fontSize, fontWeight, textAlign, fontStyle } = safeProperties;
  
  // Type guard para content: text elements usan string
  const textContent = typeof content === 'string' ? content : '';

  // Hook de autoguardado robusto
  // CRÍTICO: Guardar HTML completo (con formato de color) en lugar de solo texto
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = editorRef.current?.innerHTML || '';
      // Normalizar HTML para comparación consistente, pero preservar formato
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    },
    onSave: async (newContent) => {
      // Comparar con el HTML actual (que puede incluir formato)
      // Si el contenido cambió (incluyendo formato), guardarlo
      const currentHTML = editorRef.current?.innerHTML || '';
      const normalizedCurrent = currentHTML.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedNew = (newContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      
      // Guardar el HTML completo (con formato) en lugar de solo texto plano
      if (normalizedNew !== normalizedCurrent) {
        await onUpdate(id, { content: normalizedNew });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => {
      // Normalizar ambos para comparación
      const normalizedOld = (oldContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      const normalizedNew = (newContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      return normalizedOld === normalizedNew;
    },
  });

  // Ref para almacenar el contenido anterior y evitar loops
  const prevContentRef = useRef<string>('');
  
  useEffect(() => {
    // Solo actualizar si NO está enfocado para preservar cursor
    if (editorRef.current && document.activeElement !== editorRef.current) {
      const currentHTML = editorRef.current.innerHTML || '';

      // Solo actualizar si realmente cambió
      if (prevContentRef.current !== textContent) {
        prevContentRef.current = textContent;

        // Usar helper para actualizar contenido preservando cursor
        updateInnerHTMLPreservingCursor(editorRef.current, textContent || '');
      }
    }
  }, [textContent]);


  const handleContentChange = (e: ContentEditableEvent) => {
    // Programar auto-save con debounce
    handleChange();
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    onEditElement(id);
  };

  const handleBlur = async () => {
    setIsEditing(false);
    // Guardado inmediato y obligatorio en onBlur
    await handleAutoSaveBlur();
  };

  return (
    <div className="relative w-full h-full">
      <ContentEditable
        innerRef={editorRef as React.RefObject<HTMLElement>}
        html={textContent || ''}
        disabled={!isEditing}
        onChange={handleContentChange}
        onBlur={handleBlur}
        onDoubleClick={handleDoubleClick}
        onClick={(e) => {
          // Asegurar que el cursor se posicione correctamente en elementos de texto
          if (isEditing) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount === 0) {
              const range = document.createRange();
              range.selectNodeContents(e.currentTarget);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }}
        className={cn(
          'w-full h-full outline-none break-words',
          (isEditing || isSelected) ? 'cursor-text' : 'cursor-grab drag-handle active:cursor-grabbing'
        )}
        style={{
          fontSize: `${fontSize || 15}px`,
          fontWeight: fontWeight || 'normal',
          textAlign: textAlign || 'left',
          fontStyle: fontStyle || 'normal',
          color: safeProperties.color || '#000000',
          backgroundColor: safeProperties.backgroundColor || '#ffffff',
        }}
      />
      {/* Indicador de estado de guardado */}
      {isEditing && (
        <div className="absolute top-2 right-2 z-10">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      )}

      {/* Botón eliminar fuera del header */}
      {deleteElement && (
        <div className="absolute -top-2 -right-2 z-10">
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6 rounded-full shadow-lg"
            title="Eliminar elemento"
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
