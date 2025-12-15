'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { ElementType } from '@/lib/types';

interface DebugElementsMenuProps {
  addElement: (type: ElementType, props?: any) => Promise<string>;
}

// Todos los tipos de elementos con descripciones
const ALL_ELEMENTS: { type: ElementType; label: string; visible: boolean }[] = [
  // Visibles en menú principal
  { type: 'notepad', label: 'Cuaderno', visible: true },
  { type: 'yellow-notepad', label: 'Cuaderno Amarillo', visible: true },
  { type: 'sticky', label: 'Nota Adhesiva', visible: true },
  { type: 'todo', label: 'To-Do List', visible: true },
  { type: 'text', label: 'Texto', visible: true },
  { type: 'image', label: 'Imagen', visible: true },
  { type: 'moodboard', label: 'Moodboard', visible: true },
  { type: 'weekly-planner', label: 'Plan Semanal', visible: true },
  { type: 'comment', label: 'Comentario/Localizador', visible: true },
  
  // Ocultos / Sin botón visible
  { type: 'stopwatch', label: 'Cronómetro', visible: false },
  { type: 'countdown', label: 'Cuenta Regresiva', visible: false },
  { type: 'highlight-text', label: 'Texto Destacado', visible: false },
];

export default function DebugElementsMenu({ addElement }: DebugElementsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHiddenOnly, setShowHiddenOnly] = useState(true);

  const elementsToShow = showHiddenOnly 
    ? ALL_ELEMENTS.filter(e => !e.visible)
    : ALL_ELEMENTS;

  const handleAddElement = async (type: ElementType) => {
    try {
      await addElement(type);
    } catch (error) {
      console.error('Error adding element:', error);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-[10000]">
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="bg-white shadow-lg border-2 border-orange-400 text-orange-600 hover:bg-orange-50"
      >
        {isOpen ? <X className="w-4 h-4 mr-2" /> : <ChevronUp className="w-4 h-4 mr-2" />}
        DEBUG: Elementos
      </Button>

      {/* Menu Panel */}
      {isOpen && (
        <div className="absolute bottom-12 left-0 bg-white rounded-lg shadow-xl border-2 border-orange-400 p-4 w-72 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3 pb-2 border-b">
            <h3 className="font-bold text-sm text-orange-600">Menú Debug</h3>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={showHiddenOnly}
                onChange={(e) => setShowHiddenOnly(e.target.checked)}
                className="rounded"
              />
              Solo ocultos
            </label>
          </div>
          
          <div className="space-y-1">
            {elementsToShow.map((el) => (
              <button
                key={el.type}
                onClick={() => handleAddElement(el.type)}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  el.visible 
                    ? 'bg-green-50 hover:bg-green-100 text-green-700' 
                    : 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                }`}
              >
                <span className="font-medium">{el.label}</span>
                <span className="text-xs ml-2 opacity-60">({el.type})</span>
              </button>
            ))}
          </div>

          <div className="mt-3 pt-2 border-t text-xs text-gray-500">
            🟢 Verde = Visible en menú | 🟠 Naranja = Sin botón
          </div>
        </div>
      )}
    </div>
  );
}
