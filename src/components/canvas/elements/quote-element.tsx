// @ts-nocheck
'use client';

import React, { useRef } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { GripVertical, Quote, Paintbrush } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useDictationInput } from '@/hooks/use-dictation-input';

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
  // Nuevos
  limeOlive: { bg: '#C2D96A', text: '#2F3A11', name: 'Lima Oliva' },
  brick: { bg: '#DB6441', text: '#4A1C0F', name: 'Ladrillo' },
  sky: { bg: '#42B0DB', text: '#0A3A52', name: 'Cielo' },
  aquaSoft: { bg: '#9ED5DE', text: '#0E3C46', name: 'Aqua' },
  lavenderSoft: { bg: '#CEC5DB', text: '#3A3046', name: 'Lavanda Suave' },
  sand: { bg: '#DBD393', text: '#4A4320', name: 'Arena' },
  amber: { bg: '#E09D22', text: '#4A2F00', name: 'Ámbar' },
  chartreuse: { bg: '#B8E100', text: '#2E3B00', name: 'Chartreuse' },
  ocean: { bg: '#1D93CE', text: '#062C3E', name: 'Océano' },

  // Colores adicionales de otras paletas
  calypso: { bg: '#CAE3E1', text: '#2C3E3D', name: 'Calipso' },
  lightYellow: { bg: '#FEF08A', text: '#7C4A03', name: 'Amarillo Claro' },
  lightBlue: { bg: '#DBEAFE', text: '#1E3A8A', name: 'Azul Claro' },
  lightGreen: { bg: '#DCFCE7', text: '#14532D', name: 'Verde Claro' },
  lightPink: { bg: '#FCE7F3', text: '#831843', name: 'Rosa Claro' },
  lightGray: { bg: '#F3F4F6', text: '#374151', name: 'Gris Claro' },
  lightRose: { bg: '#FCE4EC', text: '#9D174D', name: 'Rosa Suave' },
  skyLight: { bg: '#E0F2FE', text: '#0C4A6E', name: 'Cielo Claro' },
  skyVeryLight: { bg: '#F0F9FF', text: '#0F172A', name: 'Cielo Muy Claro' },
  emeraldVeryLight: { bg: '#ECFDF5', text: '#064E3B', name: 'Esmeralda Muy Claro' },
};

export default function QuoteElement(props: CommonElementProps) {
  const { id, content, properties, isSelected, onUpdate, deleteElement, isPreview, onSelectElement } = props;
  
  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const bgColor = safeProperties.backgroundColor || COLOR_PALETTE[0].value;
  const textContent = typeof content === 'string' ? content : '';
  
  const editorRef = useRef<HTMLDivElement>(null);
  
  const { handleBlur, handleChange } = useAutoSave({
    getContent: () => editorRef.current?.innerHTML || '',
    onSave: async (newContent) => {
      if (newContent !== textContent) {
        await onUpdate(id, { content: newContent });
      }
    },
    debounceMs: 2000,
  });


  return (
    <div className="w-full h-full flex flex-col rounded-lg shadow-md overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="drag-handle flex items-center justify-between p-2 cursor-grab active:cursor-grabbing bg-black/5">
        <Quote className="w-4 h-4 text-gray-600" />
        {isSelected && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1 hover:bg-black/10 rounded">
                <Paintbrush className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              onClick={(e) => e.stopPropagation()}
              className="w-auto p-3 border-none bg-white shadow-xl rounded-xl"
            >
              <div className="grid grid-cols-6 gap-2">
                {Object.entries(EXTENDED_PALETTES).map(([key, palette]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const selectedPalette = EXTENDED_PALETTES[key as keyof typeof EXTENDED_PALETTES];
                      if (selectedPalette) {
                        onUpdate(id, { properties: { ...safeProperties, backgroundColor: selectedPalette.bg } });
                      }
                    }}
                    className={cn(
                      'w-8 h-8 rounded-lg shadow-sm hover:scale-110 transition-transform flex items-center justify-center text-xs font-bold',
                      bgColor === palette.bg && 'ring-2 ring-offset-1 ring-gray-800 scale-110'
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
        )}
      </div>
      <div className="flex-1 p-4 flex items-center">
        <Quote className="w-8 h-8 text-gray-400 mr-3 flex-shrink-0" />
        <div
          ref={editorRef}
          contentEditable={!isPreview}
          className="flex-1 text-lg font-medium outline-none min-h-[60px]"
          onBlur={handleBlur}
          onInput={handleChange}
          onFocus={() => onSelectElement(id, false)}
          dangerouslySetInnerHTML={{ __html: textContent || 'Cita destacada...' }}
        />
      </div>
    </div>
  );
}
