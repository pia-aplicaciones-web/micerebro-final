'use client';

import React, { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { WithId, CanvasElement } from '@/lib/types';
import Fuse from 'fuse.js';

interface GlobalSearchProps {
  elements: WithId<CanvasElement>[];
  isOpen: boolean;
  onClose: () => void;
  onLocateElement: (id: string) => void;
}

export default function GlobalSearch({ elements, isOpen, onClose, onLocateElement }: GlobalSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const fuse = useMemo(() => {
    return new Fuse(elements, {
      keys: [
        { name: 'content', weight: 0.7 },
        { name: 'type', weight: 0.3 },
      ],
      threshold: 0.3,
      includeScore: true,
    });
  }, [elements]);

  const results = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return fuse.search(searchTerm).map(result => result.item);
  }, [searchTerm, fuse]);

  const handleSelect = (elementId: string) => {
    onLocateElement(elementId);
    onClose();
    setSearchTerm('');
  };

  const getElementText = (element: WithId<CanvasElement>) => {
    if (typeof element.content === 'string') return element.content;
    if (typeof element.content === 'object' && element.content !== null) {
      if ('text' in element.content) return String(element.content.text);
      if ('title' in element.content) return String(element.content.title);
      if ('label' in element.content) return String(element.content.label);
    }
    return `Elemento ${element.type}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar en tablero</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar elementos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-4 max-h-96 overflow-y-auto">
            {results.length > 0 ? (
              <div className="space-y-1">
                {results.map((element) => (
                  <button
                    key={element.id}
                    onClick={() => handleSelect(element.id)}
                    className="w-full text-left p-3 hover:bg-gray-100 rounded-lg border border-gray-200"
                  >
                    <div className="font-semibold text-sm capitalize">{element.type}</div>
                    <div className="text-xs text-gray-600 truncate mt-1">
                      {getElementText(element)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No se encontraron resultados</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
