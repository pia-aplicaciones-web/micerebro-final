
// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { CommonElementProps } from '@/lib/types'; // <-- IMPORTADO
import { cn } from '@/lib/utils';
import ContentEditable, { ContentEditableEvent } from 'react-contenteditable';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { useDictationInput } from '@/hooks/use-dictation-input';

// Acepta CommonElementProps
export default function TextElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    onUpdate,
    onEditElement,
    isSelected,
    isListening,
    liveTranscript,
    finalTranscript,
    interimTranscript,
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
    // CRÍTICO: Solo actualizar si NO está enfocado (preservar cursor y formato)
    // Si textContent es HTML (contiene tags), usarlo directamente
    // Si es texto plano, solo actualizar si no hay formato existente
    if (editorRef.current) {
      const isFocused = document.activeElement === editorRef.current;
      const currentHTML = editorRef.current.innerHTML || '';
      
      // Solo actualizar si realmente cambió y no está enfocado
      if (prevContentRef.current === textContent) {
        return;
      }
      prevContentRef.current = textContent;
      
      if (!isFocused) {
        // Si textContent contiene HTML (tiene tags), usarlo directamente
        // Esto preserva el formato de color aplicado
        const hasHTML = /<[^>]+>/.test(textContent);
        if (hasHTML && currentHTML !== textContent) {
          // Usar helper para preservar cursor
          const { updateInnerHTMLPreservingCursor } = require('@/lib/cursor-helper');
          updateInnerHTMLPreservingCursor(editorRef.current, textContent);
        } else if (!hasHTML && currentHTML !== textContent) {
          // Solo texto plano, actualizar solo si no hay formato
          const hasFormatting = currentHTML.includes('<span') || currentHTML.includes('<div');
          if (!hasFormatting) {
            const { updateInnerHTMLPreservingCursor } = require('@/lib/cursor-helper');
            updateInnerHTMLPreservingCursor(editorRef.current, textContent || '');
          }
        }
      }
    }
  }, [textContent]);

  // Soporte para dictado usando hook helper
  useDictationInput({
    elementRef: editorRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLTextAreaElement>,
    isListening: isListening || false,
    liveTranscript: liveTranscript || '',
    finalTranscript: finalTranscript || '',
    interimTranscript: interimTranscript || '',
    isSelected: isSelected || false,
    enabled: true,
  });

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
        className={cn(
          'w-full h-full outline-none break-words',
          (isEditing || isSelected) ? 'cursor-text' : 'cursor-grab drag-handle active:cursor-grabbing'
        )}
        style={{
          fontSize: `${fontSize || 24}px`,
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
    </div>
  );
}
