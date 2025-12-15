'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'Generar 3 ideas rápidas',
  'Combinar dos conceptos opuestos',
  'Pensar en el usuario extremo',
  'Agregar un giro inesperado',
  'Simplificar el flujo en 3 pasos',
  'Sustituir el canal principal por otro',
];

export default function BrainstormGeneratorElement({
  id,
  content,
  isSelected,
  onSelectElement,
  onUpdate,
}: CommonElementProps) {
  const initialIdeas = useMemo(() => {
    const ideas = (content as any)?.ideas;
    return Array.isArray(ideas) ? ideas : [];
  }, [content]);

  const [ideas, setIdeas] = useState<string[]>(initialIdeas);
  const [customIdea, setCustomIdea] = useState('');

  const addIdea = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const nextIdeas = [...ideas, trimmed].slice(-20);
      setIdeas(nextIdeas);
      onUpdate(id, { content: { ideas: nextIdeas } as any });
    },
    [id, ideas, onUpdate]
  );

  const addSuggestion = useCallback(() => {
    const random = SUGGESTIONS[Math.floor(Math.random() * SUGGESTIONS.length)];
    addIdea(random);
  }, [addIdea]);

  return (
    <Card
      className={cn(
        'w-full h-full p-3 flex flex-col gap-2 shadow-lg border',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectElement(id, false);
      }}
    >
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span className="font-semibold">Ideas</span>
        <Button size="sm" variant="secondary" onClick={addSuggestion} onMouseDown={(e) => e.stopPropagation()}>
          Sugerir
        </Button>
      </div>

      <Textarea
        className="min-h-[90px]"
        placeholder="Escribe una idea..."
        value={customIdea}
        onChange={(e) => setCustomIdea(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            addIdea(customIdea);
            setCustomIdea('');
          }
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="flex-1"
          onClick={() => {
            addIdea(customIdea);
            setCustomIdea('');
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Añadir
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCustomIdea('')}
          onMouseDown={(e) => e.stopPropagation()}
        >
          Limpiar
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded border bg-white/60">
        {ideas.length === 0 ? (
          <p className="p-3 text-xs text-slate-500">Sin ideas aún. Agrega una o usa “Sugerir”.</p>
        ) : (
          <ul className="p-3 space-y-2 text-sm text-slate-800">
            {ideas.map((idea, idx) => (
              <li key={`${idea}-${idx}`} className="border-b last:border-b-0 pb-1">
                {idea}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}