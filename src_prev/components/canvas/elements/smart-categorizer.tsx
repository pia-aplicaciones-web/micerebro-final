// @ts-nocheck
'use client';

import React, { useMemo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Lightbulb, CheckSquare, FileText, Image, Link2, Calendar, Hash } from 'lucide-react';
import type { NotepadContent, NotepadSimpleContent } from '@/lib/types';

interface SmartCategorizerProps {
  content: NotepadContent | NotepadSimpleContent | string;
  onCategorySelect?: (category: string | null) => void;
}

type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  keywords: string[];
  color: string;
};

const CATEGORIES: Category[] = [
  { id: 'all', label: 'Todo', icon: FileText, keywords: [], color: 'gray' },
  { id: 'ideas', label: 'Ideas', icon: Lightbulb, keywords: ['idea', 'pensar', 'crear', 'innovar', 'brainstorm'], color: 'yellow' },
  { id: 'tasks', label: 'Tareas', icon: CheckSquare, keywords: ['hacer', 'tarea', 'pendiente', 'completar', 'check', '✓', '☐'], color: 'blue' },
  { id: 'notes', label: 'Notas', icon: FileText, keywords: ['nota', 'recordar', 'importante', 'nota:', 'apuntar'], color: 'green' },
  { id: 'references', label: 'Referencias', icon: Link2, keywords: ['http', 'www', 'link', 'url', 'referencia'], color: 'purple' },
  { id: 'dates', label: 'Fechas', icon: Calendar, keywords: ['fecha', 'día', 'mes', 'año', 'deadline', 'vencimiento'], color: 'orange' },
  { id: 'tags', label: 'Tags', icon: Hash, keywords: ['#', 'tag', 'etiqueta', '@'], color: 'pink' },
];

export default function SmartCategorizer({ content, onCategorySelect }: SmartCategorizerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Analizar contenido y categorizar
  const categorizedContent = useMemo(() => {
    let allText = '';
    
    // Manejar diferentes tipos de contenido
    if (typeof content === 'string') {
      allText = content.toLowerCase();
    } else if ('pages' in content) {
      // NotepadContent con páginas
      allText = (content.pages || [])
        .map(page => page.text || '')
        .join(' ')
        .toLowerCase();
    } else if ('text' in content || 'content' in content) {
      // NotepadSimpleContent
      allText = ((content as NotepadSimpleContent).text || (content as NotepadSimpleContent).content || '').toLowerCase();
    }

    const categoryCounts: { [key: string]: number } = {};
    
    CATEGORIES.forEach(category => {
      if (category.id === 'all') return;
      const matches = category.keywords.filter(keyword => 
        allText.includes(keyword.toLowerCase())
      ).length;
      categoryCounts[category.id] = matches;
    });

    return categoryCounts;
  }, [content]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    onCategorySelect?.(category === 'all' ? null : category);
  };

  // Mostrar siempre el categorizador (puede estar vacío pero debe mostrarse)
  // const hasCategorizableContent = Object.values(categorizedContent).some(count => count > 0);

  return (
    <div className="px-2 py-1 border-b bg-gray-50/50">
      <Tabs value={selectedCategory} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="h-7 w-full justify-start gap-1">
          {CATEGORIES.map(category => {
            const Icon = category.icon;
            const count = categorizedContent[category.id] || 0;
            const showBadge = category.id !== 'all' && count > 0;
            
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="h-6 px-2 text-[10px] data-[state=active]:bg-teal-500 data-[state=active]:text-white"
              >
                <Icon className="w-3 h-3 mr-1" />
                <span>{category.label}</span>
                {showBadge && (
                  <span className="ml-1 px-1 py-0.5 bg-teal-500 text-white rounded text-[9px]">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
