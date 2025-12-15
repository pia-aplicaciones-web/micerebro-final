// @ts-nocheck
'use client';
// @ts-nocheck

import React, { useState, useRef, useCallback } from 'react';
import type { CommonElementProps, WithId, CanvasElement, CommentContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MapPin, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { useDictationInput } from '@/hooks/use-dictation-input';

// Acepta CommonElementProps
export default function CommentElement(props: CommonElementProps) {
  const { 
    content, 
    properties, 
    onEditComment, 
    onUpdate,
    onLocateElement,
    id, 
    type, 
    x, 
    y, 
    width, 
    height, 
    rotation, 
    zIndex, 
    color, 
    backgroundColor, 
    hidden, 
    parentId,
    isSelected,
    onSelectElement,
    isListening,
    liveTranscript,
    finalTranscript,
    interimTranscript,
  } = props;
  
  const safeProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const [isEditing, setIsEditing] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Obtener el texto del comentario para mostrar
  const commentContent: CommentContent = typeof content === 'object' && content !== null 
    ? (content as CommentContent)
    : typeof content === 'string'
    ? { text: content }
    : {};
  const displayText = commentContent.text || commentContent.title || commentContent.label || '';
  const displayName = commentContent.label || commentContent.title || 'Localizador';

  // Hook de autoguardado para el nombre
  const { saveStatus, handleBlur: handleNameBlur, handleChange: handleNameChange } = useAutoSave({
    getContent: () => nameInputRef.current?.value || displayName,
    onSave: async (newName) => {
      if (newName !== displayName) {
        const updatedContent: CommentContent = {
          ...commentContent,
          label: newName,
          title: newName,
        };
        onUpdate(id, { content: updatedContent });
      }
    },
    debounceMs: 1000,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    
    // Si está seleccionado, centrar vista en el localizador
    if (isSelected && onLocateElement) {
      onLocateElement(id);
    } else {
      // Si no está seleccionado, seleccionarlo
      onSelectElement(id, false);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 0);
  };

  const handleNameSubmit = () => {
    if (nameInputRef.current) {
      handleNameBlur();
    }
    setIsEditing(false);
  };

  // Soporte para dictado en el input de nombre
  useDictationInput({
    elementRef: nameInputRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLTextAreaElement>,
    isListening: isListening || false,
    liveTranscript: liveTranscript || '',
    finalTranscript: finalTranscript || '',
    interimTranscript: interimTranscript || '',
    isSelected: isSelected || false,
    enabled: isEditing, // Solo cuando está en modo edición
  });

  // Diseño mejorado: Localizador arrastrable con nombre visible
  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'w-full h-full cursor-move relative group',
        'flex flex-col items-center justify-center gap-1',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2 rounded-lg'
      )}
      style={{
        minWidth: '80px',
        minHeight: '80px',
      }}
    >
      {/* Pin visual mejorado */}
      <div
        className={cn(
          'relative flex items-center justify-center',
          'transition-transform hover:scale-110'
        )}
      >
        {/* Fondo con patrón */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundColor: '#b7ddda',
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px),
              repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 8px)
            `,
            backgroundSize: '8px 8px',
            width: '48px',
            height: '48px',
          }}
        />
        
        {/* Círculo gris oscuro central */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center relative z-10"
          style={{
            backgroundColor: '#4a5568',
          }}
        >
          <MapPin 
            className="w-6 h-6 text-white" 
            strokeWidth={2.5}
            style={{
              filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.3))',
            }}
          />
        </div>
      </div>

      {/* Nombre del localizador */}
      {isEditing ? (
        <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
          <Input
            ref={nameInputRef}
            type="text"
            value={displayName}
            onChange={(e) => {
              handleNameChange();
              const updatedContent: CommentContent = {
                ...commentContent,
                label: e.target.value,
                title: e.target.value,
              };
              onUpdate(id, { content: updatedContent });
            }}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleNameSubmit();
              } else if (e.key === 'Escape') {
                setIsEditing(false);
              }
            }}
            className="h-6 text-xs px-2 w-24"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
          />
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      ) : (
        <div className="mt-1 text-xs font-medium text-gray-700 text-center max-w-[100px] truncate px-1">
          {displayName || 'Localizador'}
        </div>
      )}

      {/* Botón editar (solo visible al hacer hover) */}
      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity z-50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsEditing(true);
            setTimeout(() => {
              nameInputRef.current?.focus();
              nameInputRef.current?.select();
            }, 0);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
