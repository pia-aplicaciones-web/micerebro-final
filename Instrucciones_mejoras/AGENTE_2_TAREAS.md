# AGENTE 2: Brain Dump + Diario de Gratitud

## INSTRUCCIONES
Ejecuta estas tareas en orden. Crea los archivos exactamente como se indica.

---

## TAREA 1: Crear Brain Dump Box

**Archivo:** `src/components/canvas/elements/brain-dump-element.tsx`

```tsx
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
```

---

## TAREA 2: Crear Diario de Gratitud

**Archivo:** `src/components/canvas/elements/gratitude-journal-element.tsx`

```tsx
'use client';

import React, { useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GripVertical, X, ChevronLeft, ChevronRight, Heart, Sun, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface DayEntry {
  grateful1: string;
  grateful2: string;
  grateful3: string;
  highlight: string;
  intention: string;
}

interface GratitudeContent {
  entries: Record<string, DayEntry>;
  currentDate?: string;
}

const emptyEntry: DayEntry = {
  grateful1: '', grateful2: '', grateful3: '', highlight: '', intention: ''
};

export default function GratitudeJournalElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, deleteElement, onEditElement } = props;

  const safeContent: GratitudeContent = 
    typeof content === 'object' && content !== null && 'entries' in content
      ? (content as GratitudeContent)
      : { entries: {} };

  const [currentDate, setCurrentDate] = useState(() => 
    safeContent.currentDate || format(new Date(), 'yyyy-MM-dd')
  );

  const currentEntry = safeContent.entries[currentDate] || emptyEntry;

  const updateEntry = useCallback((field: keyof DayEntry, value: string) => {
    const updatedEntry = { ...currentEntry, [field]: value };
    const updatedEntries = { ...safeContent.entries, [currentDate]: updatedEntry };
    onUpdate(id, { content: { entries: updatedEntries, currentDate } });
  }, [id, safeContent, currentDate, currentEntry, onUpdate]);

  const goToDate = useCallback((direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? format(subDays(new Date(currentDate), 1), 'yyyy-MM-dd')
      : format(addDays(new Date(currentDate), 1), 'yyyy-MM-dd');
    setCurrentDate(newDate);
    onUpdate(id, { content: { ...safeContent, currentDate: newDate } });
  }, [id, safeContent, currentDate, onUpdate]);

  const formattedDate = format(new Date(currentDate), "EEEE, d 'de' MMMM yyyy", { locale: es });
  const isToday = currentDate === format(new Date(), 'yyyy-MM-dd');

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[380px] min-h-[500px]',
        'rounded-xl shadow-xl border-none',
        isSelected && 'ring-2 ring-amber-400 ring-offset-2'
      )}
      style={{ 
        backgroundColor: '#FFF8E7',
        backgroundImage: `
          linear-gradient(90deg, transparent 79px, #E8DCC8 79px, #E8DCC8 81px, transparent 81px),
          linear-gradient(#E8DCC8 1px, transparent 1px)
        `,
        backgroundSize: '100% 28px',
        fontFamily: '"Patrick Hand", "Segoe Print", cursive'
      }}
      onClick={() => onEditElement(id)}
    >
      <CardHeader className="p-4 border-b-2 border-amber-300" 
        style={{ backgroundColor: '#8B4513', backgroundImage: 'linear-gradient(135deg, #8B4513 0%, #A0522D 100%)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="drag-handle cursor-grab">
              <GripVertical className="h-4 w-4 text-amber-200" />
            </div>
            <Heart className="h-5 w-5 text-pink-300" fill="#F8BBD9" />
            <h3 className="text-amber-100 font-bold text-lg tracking-wide">Diario de Gratitud</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-amber-200 hover:text-white"
            onClick={(e) => { e.stopPropagation(); deleteElement(id); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center justify-center gap-3 mt-2">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-200 hover:text-white"
            onClick={(e) => { e.stopPropagation(); goToDate('prev'); }}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className={cn(
            "text-sm capitalize",
            isToday ? "text-amber-100 font-bold" : "text-amber-200"
          )}>
            {isToday ? '✨ Hoy' : formattedDate}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-200 hover:text-white"
            onClick={(e) => { e.stopPropagation(); goToDate('next'); }}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-auto">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-amber-800">
            <Star className="h-4 w-4 text-amber-500" fill="#F59E0B" />
            <span className="font-semibold text-sm">Hoy agradezco por...</span>
          </div>
          
          {[1, 2, 3].map((num) => (
            <div key={num} className="flex items-start gap-2 mb-2">
              <span className="text-amber-600 font-bold text-sm mt-1">{num}.</span>
              <Textarea
                placeholder={`Gratitud #${num}...`}
                value={currentEntry[`grateful${num}` as keyof DayEntry]}
                onChange={(e) => updateEntry(`grateful${num}` as keyof DayEntry, e.target.value)}
                className="flex-1 min-h-[40px] bg-transparent border-none border-b border-amber-300 rounded-none resize-none text-amber-900 placeholder:text-amber-400"
                style={{ fontFamily: 'inherit' }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          ))}
        </div>

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-amber-800">
            <Sun className="h-4 w-4 text-orange-500" fill="#FB923C" />
            <span className="font-semibold text-sm">Mejor momento del día</span>
          </div>
          <Textarea
            placeholder="¿Qué fue lo mejor de hoy?"
            value={currentEntry.highlight}
            onChange={(e) => updateEntry('highlight', e.target.value)}
            className="w-full min-h-[60px] bg-white/40 border border-amber-300 rounded-lg resize-none text-amber-900 placeholder:text-amber-400"
            style={{ fontFamily: 'inherit' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2 text-amber-800">
            <span className="text-lg">🌱</span>
            <span className="font-semibold text-sm">Mi intención para mañana</span>
          </div>
          <Textarea
            placeholder="¿Qué quiero lograr o sentir mañana?"
            value={currentEntry.intention}
            onChange={(e) => updateEntry('intention', e.target.value)}
            className="w-full min-h-[60px] bg-white/40 border border-amber-300 rounded-lg resize-none text-amber-900 placeholder:text-amber-400"
            style={{ fontFamily: 'inherit' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## TAREA 3: Agregar Google Font

**Archivo a modificar:** `src/app/globals.css`

Agregar al inicio del archivo (después de los @tailwind):

```css
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
```

---

## TAREA 4: Registrar los tipos

**Archivo a modificar:** `src/lib/types.ts`

Busca la línea con `export type ElementType =` y agrega al final antes del punto y coma:
```
| 'brain-dump' | 'gratitude-journal'
```

---

## CUANDO TERMINES
Responde: "AGENTE 2 COMPLETADO - Brain Dump y Diario de Gratitud creados"
