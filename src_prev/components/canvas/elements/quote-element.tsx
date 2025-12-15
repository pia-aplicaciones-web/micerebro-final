// @ts-nocheck
'use client';

import React, { useRef } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { GripVertical, Quote } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Palette } from 'lucide-react';
import { TwitterPicker } from 'react-color';
import { useAutoSave } from '@/hooks/use-auto-save';
import { useDictationInput } from '@/hooks/use-dictation-input';

const COLOR_PALETTE = [
  { name: 'white', label: 'Blanco', value: '#ffffff' },
  { name: 'yellow', label: 'Amarillo', value: '#fffb8b' },
  { name: 'pink', label: 'Rosa', value: '#ffc2d4' },
  { name: 'blue', label: 'Azul', value: '#bce8f1' },
  { name: 'green', label: 'Verde', value: '#d4edda' },
  { name: 'orange', label: 'Naranja', value: '#ffeeba' },
  { name: 'purple', label: 'Morado', value: '#e9d5ff' },
];

export default function QuoteElement(props: CommonElementProps) {
  const { id, content, properties, isSelected, onUpdate, deleteElement, isListening, liveTranscript, finalTranscript, interimTranscript } = props;
  
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

  useDictationInput({
    elementRef: editorRef,
    isListening: isListening || false,
    finalTranscript: finalTranscript || '',
    interimTranscript: interimTranscript || '',
    isSelected: isSelected || false,
    enabled: true,
  });

  return (
    <div className="w-full h-full flex flex-col rounded-lg shadow-md overflow-hidden" style={{ backgroundColor: bgColor }}>
      <div className="drag-handle flex items-center justify-between p-2 cursor-grab active:cursor-grabbing bg-black/5">
        <Quote className="w-4 h-4 text-gray-600" />
        {isSelected && (
          <Popover>
            <PopoverTrigger asChild>
              <button className="p-1 hover:bg-black/10 rounded">
                <Palette className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <TwitterPicker
                colors={COLOR_PALETTE.map(c => c.value)}
                color={bgColor}
                onChangeComplete={(color) => onUpdate(id, { properties: { ...safeProperties, backgroundColor: color.hex } })}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div className="flex-1 p-4 flex items-center">
        <Quote className="w-8 h-8 text-gray-400 mr-3 flex-shrink-0" />
        <div
          ref={editorRef}
          contentEditable
          className="flex-1 text-lg font-medium outline-none min-h-[60px]"
          onBlur={handleBlur}
          onInput={handleChange}
          dangerouslySetInnerHTML={{ __html: textContent || 'Cita destacada...' }}
        />
      </div>
    </div>
  );
}
