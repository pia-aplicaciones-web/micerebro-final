'use client';

import React, { useState } from 'react';
import { PlusCircle, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TwitterPicker } from 'react-color';

const COLOR_PALETTE = [
  { name: 'yellow', value: '#fffb8b' },
  { name: 'pink', value: '#ffc2d4' },
  { name: 'blue', value: '#bce8f1' },
  { name: 'green', value: '#d4edda' },
  { name: 'orange', value: '#ffeeba' },
  { name: 'purple', value: '#e9d5ff' },
  { name: 'white', value: '#ffffff' },
];

interface QuickAddTaskProps {
  onAddTask: (color: string) => void;
}

export default function QuickAddTask({ onAddTask }: QuickAddTaskProps) {
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].value);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className="fixed bottom-6 right-6 w-14 h-14 bg-teal-500 hover:bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center z-50 transition-all hover:scale-110"
          title="Agregar tarea rápida"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="top" align="end">
        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-600">Color de nota</div>
          <TwitterPicker
            colors={COLOR_PALETTE.map(c => c.value)}
            color={selectedColor}
            onChangeComplete={(color) => setSelectedColor(color.hex)}
            width="200px"
          />
          <button
            onClick={() => {
              onAddTask(selectedColor);
              setIsOpen(false);
            }}
            className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 text-sm font-medium"
          >
            Crear Nota
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
