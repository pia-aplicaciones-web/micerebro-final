'use client';

import React, { useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, X, Trash2, Lightbulb, CheckSquare, AlertCircle, Bell, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = {
  task: { icon: CheckSquare, color: '#4CAF50', bg: '#E8F5E9', label: 'Tarea' },
  idea: { icon: Lightbulb, color: '#FF9800', bg: '#FFF3E0', label: 'Idea' },
  worry: { icon: AlertCircle, color: '#9C27B0', bg: '#F3E5F5', label: 'Preocupación' },
  reminder: { icon: Bell, color: '#2196F3', bg: '#E3F2FD', label: 'Recordatorio' },
};

type CategoryKey = keyof typeof CATEGORIES;

interface DumpItem {
  id: string;
  text: string;
  category: CategoryKey;
  createdAt: string;
}

interface BrainDumpContent {
  items: DumpItem[];
}

const autoCategorize = (text: string): CategoryKey => {
  const lower = text.toLowerCase();
  if (lower.includes('hacer') || lower.includes('comprar') || lower.includes('llamar') || lower.includes('enviar') || lower.includes('terminar')) {
    return 'task';
  }
  if (lower.includes('idea') || lower.includes('podría') || lower.includes('qué tal si') || lower.includes('probar') || lower.includes('quizás')) {
    return 'idea';
  }
  if (lower.includes('preocupa') || lower.includes('ansiedad') || lower.includes('miedo') || lower.includes('estrés') || lower.includes('nervios')) {
    return 'worry';
  }
  if (lower.includes('recordar') || lower.includes('no olvidar') || lower.includes('acordarme') || lower.includes('cita') || lower.includes('importante')) {
    return 'reminder';
  }
  return 'idea';
};

export default function BrainDumpElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, deleteElement, onEditElement, addElement } = props;

  const safeContent: BrainDumpContent = 
    typeof content === 'object' && content !== null && 'items' in content
      ? (content as BrainDumpContent)
      : { items: [] };

  const [inputText, setInputText] = useState('');

  const addItem = useCallback(() => {
    if (!inputText.trim()) return;
    
    const lines = inputText.split('\n').filter(l => l.trim());
    const newItems: DumpItem[] = lines.map(line => ({
      id: `dump-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: line.trim(),
      category: autoCategorize(line),
      createdAt: new Date().toISOString(),
    }));

    onUpdate(id, { 
      content: { 
        items: [...safeContent.items, ...newItems]
      } 
    });
    setInputText('');
  }, [id, safeContent, inputText, onUpdate]);

  const deleteItem = useCallback((itemId: string) => {
    const updatedItems = safeContent.items.filter(i => i.id !== itemId);
    onUpdate(id, { content: { items: updatedItems } });
  }, [id, safeContent, onUpdate]);

  const changeCategory = useCallback((itemId: string, newCategory: CategoryKey) => {
    const updatedItems = safeContent.items.map(item =>
      item.id === itemId ? { ...item, category: newCategory } : item
    );
    onUpdate(id, { content: { items: updatedItems } });
  }, [id, safeContent, onUpdate]);

  const processToStickies = useCallback(async () => {
    if (!addElement || safeContent.items.length === 0) return;
    
    const colors: Record<CategoryKey, string> = {
      task: 'green', idea: 'yellow', worry: 'purple', reminder: 'blue'
    };

    for (const item of safeContent.items) {
      await addElement('sticky', { 
        content: item.text, 
        color: colors[item.category],
        properties: {
          position: { 
            x: Math.random() * 300 + 100, 
            y: Math.random() * 300 + 100 
          }
        }
      });
    }

    onUpdate(id, { content: { items: [] } });
  }, [id, safeContent, addElement, onUpdate]);

  const clearAll = useCallback(() => {
    onUpdate(id, { content: { items: [] } });
    setInputText('');
  }, [id, onUpdate]);

  const groupedItems = safeContent.items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<CategoryKey, DumpItem[]>);

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[350px] min-h-[400px]',
        'rounded-xl shadow-lg border-none',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{ 
        backgroundColor: '#FFF8E1',
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(139,119,42,0.03) 10px, rgba(139,119,42,0.03) 20px)'
      }}
      onClick={() => onEditElement(id)}
    >
      <CardHeader className="p-3 border-b border-amber-200 bg-gradient-to-r from-amber-600 to-orange-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="drag-handle cursor-grab">
              <GripVertical className="h-4 w-4 text-white/70" />
            </div>
            <span className="text-xl">📦</span>
            <h3 className="text-white font-bold">Brain Dump</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 text-white/80 hover:text-white text-xs"
              onClick={(e) => { e.stopPropagation(); clearAll(); }}>
              <Trash2 className="h-3 w-3 mr-1" /> Limpiar
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70"
              onClick={(e) => { e.stopPropagation(); deleteElement(id); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-3 flex flex-col overflow-hidden">
        <div className="mb-3">
          <Textarea
            placeholder="Vacía tu mente aquí... (un pensamiento por línea)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="min-h-[80px] bg-white/80 border-amber-300 resize-none"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-2 mt-2">
            <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700"
              onClick={(e) => { e.stopPropagation(); addItem(); }}>
              Soltar pensamientos
            </Button>
            {safeContent.items.length > 0 && (
              <Button size="sm" variant="outline" className="border-amber-400"
                onClick={(e) => { e.stopPropagation(); processToStickies(); }}>
                <Sparkles className="h-4 w-4 mr-1" /> Procesar a notas
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-3">
          {(Object.entries(CATEGORIES) as [CategoryKey, typeof CATEGORIES.task][]).map(([catKey, cat]) => {
            const items = groupedItems[catKey] || [];
            if (items.length === 0) return null;
            
            const Icon = cat.icon;
            return (
              <div key={catKey} className="rounded-lg p-2" style={{ backgroundColor: cat.bg }}>
                <div className="flex items-center gap-1 mb-2 text-xs font-semibold" style={{ color: cat.color }}>
                  <Icon className="h-3 w-3" />
                  {cat.label} ({items.length})
                </div>
                <div className="space-y-1">
                  {items.map(item => (
                    <div key={item.id} className="bg-white rounded px-2 py-1 text-sm flex items-center justify-between group">
                      <span>{item.text}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <select
                          value={item.category}
                          onChange={(e) => changeCategory(item.id, e.target.value as CategoryKey)}
                          className="text-[10px] border rounded px-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Object.entries(CATEGORIES).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                        <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}>
                          <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
