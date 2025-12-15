
// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TwitterPicker } from 'react-color';
import { Paintbrush, GripVertical, Plus, X, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';
import { useDictationInput } from '@/hooks/use-dictation-input';

const COLORS = [
  '#FF6900', '#FCB900', '#7BDCB5', '#00D084', '#8ED1FC', '#0693E3',
  '#ABB8C3', '#EB144C', '#F78DA7', '#9900EF'
];

// Paletas expandidas con texto oscuro del mismo tono (NO usar negro)
const EXTENDED_PALETTES = {
  // Pasteles clásicos
  yellow: { bg: '#FFF9C4', text: '#7D6608', name: 'Amarillo' },
  pink: { bg: '#F8BBD9', text: '#880E4F', name: 'Rosa' },
  blue: { bg: '#B3E5FC', text: '#01579B', name: 'Azul' },
  green: { bg: '#C8E6C9', text: '#1B5E20', name: 'Verde' },
  orange: { bg: '#FFE0B2', text: '#E65100', name: 'Naranja' },
  purple: { bg: '#E1BEE7', text: '#4A148C', name: 'Morado' },
  
  // Tierra
  sage: { bg: '#D7E4C0', text: '#3D5C2E', name: 'Salvia' },
  terracotta: { bg: '#FFCCBC', text: '#BF360C', name: 'Terracota' },
  sand: { bg: '#FFF3E0', text: '#8D6E63', name: 'Arena' },
  coffee: { bg: '#D7CCC8', text: '#4E342E', name: 'Café' },
  
  // Océano
  seafoam: { bg: '#B2DFDB', text: '#004D40', name: 'Espuma' },
  coral: { bg: '#FFAB91', text: '#D84315', name: 'Coral' },
  navy: { bg: '#90CAF9', text: '#0D47A1', name: 'Marino' },
  aqua: { bg: '#80DEEA', text: '#006064', name: 'Aqua' },
  
  // Sofisticados
  lavender: { bg: '#D1C4E9', text: '#311B92', name: 'Lavanda' },
  mint: { bg: '#A5D6A7', text: '#2E7D32', name: 'Menta' },
  peach: { bg: '#FFCCBC', text: '#E64A19', name: 'Durazno' },
  rose: { bg: '#F48FB1', text: '#AD1457', name: 'Rosa Fuerte' },
};

// Función helper para obtener colores
const getColorPalette = (colorValue: string) => {
  // Si es un color del mapa
  if (colorValue in EXTENDED_PALETTES) {
    return EXTENDED_PALETTES[colorValue as keyof typeof EXTENDED_PALETTES];
  }
  // Si es un hex directo, generar texto oscuro automáticamente
  if (colorValue.startsWith('#')) {
    return { bg: colorValue, text: '#333333', name: 'Personalizado' };
  }
  // Default amarillo
  return EXTENDED_PALETTES.yellow;
};

export default function StickyNoteElement(props: CommonElementProps) {
  const {
    id,
    content,
    properties,
    isSelected,
    onUpdate,
    onEditElement,
    deleteElement,
    isListening,
    liveTranscript,
    finalTranscript,
    interimTranscript,
  } = props;

  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const colorValue = (typeof safeProperties.color === 'string' ? safeProperties.color : 'yellow') || 'yellow';
  const currentPalette = getColorPalette(colorValue);
  
  // REGLA #4: Rotación para notas adhesivas
  const rotation = safeProperties.rotation || 0;

  const editorRef = useRef<HTMLDivElement>(null);
  
  // Type guard para content: sticky notes usan string
  const textContent = typeof content === 'string' ? content : '';

  // Hook de autoguardado robusto
  const { saveStatus, handleBlur: handleAutoSaveBlur, handleChange } = useAutoSave({
    getContent: () => {
      const html = editorRef.current?.innerHTML || '';
      // Normalizar HTML para comparación consistente
      return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
    },
    onSave: async (newContent) => {
      // Normalizar también el contenido guardado para comparar
      const normalizedTextContent = (textContent || '').replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();
      if (newContent !== normalizedTextContent) {
        await onUpdate(id, { content: newContent });
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
    if (editorRef.current) {
      const isFocused = document.activeElement === editorRef.current;
      
      // Solo actualizar si realmente cambió
      if (prevContentRef.current === textContent) {
        return;
      }
      prevContentRef.current = textContent;
      
      if (!isFocused) {
        // Usar helper para preservar cursor y formato
        const { updateInnerHTMLPreservingCursor } = require('@/lib/cursor-helper');
        const hasHTML = /<[^>]+>/.test(textContent);
        if (hasHTML) {
          updateInnerHTMLPreservingCursor(editorRef.current, textContent);
        } else {
          updateInnerHTMLPreservingCursor(editorRef.current, textContent || '');
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

  const handleContentChange = () => {
    // Programar auto-save con debounce
    handleChange();
  };

  const handleBlurWithSave = async () => {
    // Guardado inmediato y obligatorio en onBlur
    await handleAutoSaveBlur();
  };

  const handleColorChange = (newColor: { hex: string }) => {
    onUpdate(id, { properties: { ...safeProperties, color: newColor.hex } });
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (deleteElement) {
      deleteElement(id);
    }
  };

  const handleAddContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.collapse(false);
        const br = document.createElement('br');
        range.insertNode(br);
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // REGLA #4: Manejar rotación
  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRotation = ((rotation || 0) + 15) % 360;
    onUpdate(id, { properties: { ...safeProperties, rotation: newRotation } });
  };

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col relative group overflow-hidden',
        'min-w-[200px] min-h-[150px] max-w-[400px] max-h-[500px]',
        'rounded-lg shadow-md border-none'
      )}
      style={{ 
        backgroundColor: currentPalette.bg,
      }}
      onClick={() => onEditElement(id)}
    >
      {/* Header con iconos en la esquina superior derecha */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="drag-handle cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded">
          <GripVertical className="h-4 w-4 text-gray-700" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 hover:bg-black/10 rounded"
          onClick={handleAddContent}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Plus className="h-4 w-4 text-gray-700" />
        </Button>
        {isSelected && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-1 hover:bg-black/10 rounded"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Paintbrush className="h-4 w-4 text-gray-700" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                onClick={(e) => e.stopPropagation()}
                className="w-auto p-3 border-none bg-white shadow-xl rounded-xl"
              >
                <div className="grid grid-cols-6 gap-2">
                  {Object.entries(EXTENDED_PALETTES).map(([key, palette]) => (
                    <button
                      key={key}
                      onClick={() => handleColorChange({ hex: key })}
                      className={cn(
                        'w-8 h-8 rounded-lg shadow-sm hover:scale-110 transition-transform flex items-center justify-center text-xs font-bold',
                        colorValue === key && 'ring-2 ring-offset-1 ring-gray-800 scale-110'
                      )}
                      style={{ 
                        backgroundColor: palette.bg,
                        color: palette.text,
                        border: `1px solid ${palette.text}30`
                      }}
                      title={palette.name}
                    >
                      Aa
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            {/* REGLA #4: Botón de rotación */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-1 hover:bg-black/10 rounded"
              onClick={handleRotate}
              onMouseDown={(e) => e.stopPropagation()}
              title="Rotar 15°"
            >
              <RotateCw className="h-4 w-4 text-gray-700" />
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-1 hover:bg-black/10 rounded"
          onClick={handleClose}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <X className="h-4 w-4 text-gray-700" />
        </Button>
      </div>

      {/* Contenido editable */}
      <div className="relative flex-grow">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          onBlur={handleBlurWithSave}
          className="text-base font-medium break-words outline-none cursor-text p-4 pt-6"
          style={{ 
            color: currentPalette.text,
            fontFamily: '"Patrick Hand", "Caveat", "Comic Sans MS", cursive',
            fontSize: '16px',
            lineHeight: '1.6',
            minHeight: 'calc(100% - 1rem)'
          }}
        />
        {/* Indicador de estado de guardado */}
        <div className="absolute top-2 right-2 z-10">
          <SaveStatusIndicator status={saveStatus} size="sm" />
        </div>
      </div>
    </Card>
  );
}
