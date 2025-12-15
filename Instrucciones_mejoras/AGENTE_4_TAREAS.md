# AGENTE 4: Templates + Widget Fecha/Hora

## INSTRUCCIONES
Ejecuta estas tareas en orden.

---

## TAREA 1: Crear Widget de Fecha y Hora

**Archivo:** `src/components/canvas/elements/datetime-widget-element.tsx`

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, X, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const THEMES = {
  modern: { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: 'white', accent: '#FFD700' },
  minimal: { bg: '#FFFFFF', text: '#1a1a1a', accent: '#3B82F6' },
  dark: { bg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', text: '#e0e0e0', accent: '#00D9FF' },
  nature: { bg: 'linear-gradient(135deg, #134E5E 0%, #71B280 100%)', text: 'white', accent: '#F0E68C' },
  sunset: { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', text: 'white', accent: '#FFE4B5' },
  ocean: { bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', text: 'white', accent: '#FFFACD' },
};

interface DateTimeContent {
  theme?: keyof typeof THEMES;
  showCalendar?: boolean;
  showAnalog?: boolean;
}

const QUOTES = [
  "Hoy es un buen día para ser increíble ✨",
  "Cada momento es un nuevo comienzo 🌅",
  "Tu único límite eres tú mismo 💪",
  "Haz que hoy cuente 🎯",
  "La magia sucede fuera de tu zona de confort 🚀",
  "Sé la energía que quieres atraer 🌟",
  "Pequeños pasos, grandes cambios 🌱",
  "Confía en el proceso ⭐",
];

export default function DateTimeWidgetElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, deleteElement, onEditElement } = props;

  const safeContent: DateTimeContent = 
    typeof content === 'object' && content !== null
      ? (content as DateTimeContent)
      : { theme: 'modern', showCalendar: true, showAnalog: true };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyQuote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const theme = THEMES[safeContent.theme || 'modern'];
  const showCalendar = safeContent.showCalendar !== false;
  const showAnalog = safeContent.showAnalog !== false;

  const monthStart = startOfMonth(currentTime);
  const monthEnd = endOfMonth(currentTime);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const hours = currentTime.getHours() % 12;
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const hourAngle = (hours * 30) + (minutes * 0.5);
  const minuteAngle = minutes * 6;
  const secondAngle = seconds * 6;

  const updateTheme = (newTheme: keyof typeof THEMES) => {
    onUpdate(id, { content: { ...safeContent, theme: newTheme } });
  };

  const toggleCalendar = () => {
    onUpdate(id, { content: { ...safeContent, showCalendar: !showCalendar } });
  };

  const toggleAnalog = () => {
    onUpdate(id, { content: { ...safeContent, showAnalog: !showAnalog } });
  };

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[280px] min-h-[320px]',
        'rounded-2xl shadow-xl border-none',
        isSelected && 'ring-2 ring-white ring-offset-2'
      )}
      style={{ background: theme.bg }}
      onClick={() => onEditElement(id)}
    >
      <div className="p-3 flex items-center justify-between">
        <div className="drag-handle cursor-grab">
          <GripVertical className="h-4 w-4" style={{ color: `${theme.text}80` }} />
        </div>
        <div className="flex items-center gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" 
                style={{ color: theme.text }} onClick={(e) => e.stopPropagation()}>
                <Settings className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-medium mb-2">Tema</div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(THEMES).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => updateTheme(key as keyof typeof THEMES)}
                        className={cn(
                          'h-8 rounded-lg text-[10px] font-medium',
                          safeContent.theme === key && 'ring-2 ring-offset-1 ring-gray-800'
                        )}
                        style={{ background: t.bg, color: t.text }}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Calendario</span>
                    <button 
                      onClick={toggleCalendar}
                      className={cn('w-10 h-5 rounded-full transition-colors relative', showCalendar ? 'bg-green-500' : 'bg-gray-300')}
                    >
                      <div className={cn('w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform', showCalendar ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Reloj analógico</span>
                    <button 
                      onClick={toggleAnalog}
                      className={cn('w-10 h-5 rounded-full transition-colors relative', showAnalog ? 'bg-green-500' : 'bg-gray-300')}
                    >
                      <div className={cn('w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform', showAnalog ? 'translate-x-5' : 'translate-x-0.5')} />
                    </button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" className="h-6 w-6" 
            style={{ color: theme.text }} onClick={(e) => { e.stopPropagation(); deleteElement(id); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        
        {showAnalog && (
          <div className="relative w-28 h-28">
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
              <circle cx="50" cy="50" r="48" fill={`${theme.text}10`} stroke={`${theme.text}30`} strokeWidth="2" />
              {[...Array(12)].map((_, i) => (
                <line
                  key={i}
                  x1="50" y1="6" x2="50" y2={i % 3 === 0 ? "14" : "10"}
                  stroke={theme.text}
                  strokeWidth={i % 3 === 0 ? "2" : "1"}
                  transform={`rotate(${i * 30} 50 50)`}
                  opacity={i % 3 === 0 ? 1 : 0.5}
                />
              ))}
              <line x1="50" y1="50" x2="50" y2="22" stroke={theme.text} strokeWidth="3" strokeLinecap="round"
                transform={`rotate(${hourAngle} 50 50)`} />
              <line x1="50" y1="50" x2="50" y2="14" stroke={theme.text} strokeWidth="2" strokeLinecap="round"
                transform={`rotate(${minuteAngle} 50 50)`} />
              <line x1="50" y1="55" x2="50" y2="12" stroke={theme.accent} strokeWidth="1.5" strokeLinecap="round"
                transform={`rotate(${secondAngle} 50 50)`} />
              <circle cx="50" cy="50" r="4" fill={theme.accent} />
            </svg>
          </div>
        )}

        <div className="text-center">
          <div className="text-5xl font-bold tracking-tight" style={{ color: theme.text, fontFamily: 'system-ui' }}>
            {format(currentTime, 'HH:mm')}
            <span className="text-xl opacity-60">:{format(currentTime, 'ss')}</span>
          </div>
          <div className="text-sm opacity-80 capitalize mt-1" style={{ color: theme.text }}>
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}
          </div>
        </div>

        {showCalendar && (
          <div className="w-full max-w-[220px] p-3 rounded-xl" style={{ backgroundColor: `${theme.text}15` }}>
            <div className="text-xs font-semibold text-center mb-2 capitalize" style={{ color: theme.text }}>
              {format(currentTime, 'MMMM yyyy', { locale: es })}
            </div>
            <div className="grid grid-cols-7 gap-1 text-[10px]">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(day => (
                <div key={day} className="text-center opacity-60 font-medium" style={{ color: theme.text }}>{day}</div>
              ))}
              {[...Array((startDayOfWeek + 6) % 7)].map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {calendarDays.map(day => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'text-center py-1 rounded-md transition-all',
                    isToday(day) && 'font-bold scale-110'
                  )}
                  style={{ 
                    color: isToday(day) ? (theme.bg.includes('gradient') ? '#000' : theme.text) : theme.text,
                    backgroundColor: isToday(day) ? theme.accent : 'transparent',
                    opacity: isToday(day) ? 1 : 0.8
                  }}
                >
                  {format(day, 'd')}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-center italic opacity-70 px-4 max-w-full" style={{ color: theme.text }}>
          "{dailyQuote}"
        </div>
      </div>
    </Card>
  );
}
```

---

## TAREA 2: Mejorar Templates en Sidebar

**Archivo a modificar:** `src/components/canvas/tools-sidebar-v2.tsx`

### Paso 1: Buscar la función `applyTemplate` y reemplázala completamente con:

```tsx
const applyTemplate = async (templateType: string) => {
  const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
  const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

  try {
    switch (templateType) {
      case 'weekly-complete':
        // Planner semanal completo
        await addElement('weekly-planner', {
          properties: { 
            position: { x: centerX - 400, y: centerY - 300 },
            size: { width: 794, height: 567 }
          }
        });
        await addElement('todo', {
          content: { title: '📋 Tareas de la Semana', items: [] },
          properties: { 
            position: { x: centerX + 420, y: centerY - 300 },
            size: { width: 280, height: 250 }
          }
        });
        await addElement('sticky', {
          content: '💡 Ideas de la semana',
          color: 'yellow',
          properties: { position: { x: centerX + 420, y: centerY } }
        });
        break;

      case 'home-dashboard':
        // Dashboard del hogar
        await addElement('text', {
          content: '<div style="font-size: 28px; font-weight: bold; text-align: center;">🏠 Dashboard del Hogar</div>',
          properties: { 
            position: { x: centerX - 200, y: centerY - 350 },
            size: { width: 400, height: 50 },
            backgroundColor: 'transparent'
          }
        });
        await addElement('todo', {
          content: { 
            title: '🛒 Lista de Compras', 
            items: [
              { id: '1', text: 'Leche', completed: false },
              { id: '2', text: 'Pan', completed: false },
              { id: '3', text: 'Frutas y verduras', completed: false },
            ] 
          },
          properties: { 
            position: { x: centerX - 450, y: centerY - 280 },
            size: { width: 280, height: 300 },
            backgroundColor: '#E8F5E9'
          }
        });
        await addElement('todo', {
          content: { 
            title: '🧹 Limpieza Semanal', 
            items: [
              { id: '1', text: 'Aspirar', completed: false },
              { id: '2', text: 'Limpiar baños', completed: false },
              { id: '3', text: 'Cambiar sábanas', completed: false },
            ] 
          },
          properties: { 
            position: { x: centerX - 140, y: centerY - 280 },
            size: { width: 280, height: 300 },
            backgroundColor: '#E3F2FD'
          }
        });
        await addElement('notepad-simple', {
          content: { 
            title: '🍽️ Menú Semanal', 
            text: '<b>Lunes:</b> Pollo<br><b>Martes:</b> Pasta<br><b>Miércoles:</b> Ensalada<br><b>Jueves:</b> Tacos<br><b>Viernes:</b> Pizza<br><b>Sábado:</b> Parrilla<br><b>Domingo:</b> Sopa' 
          },
          properties: { 
            position: { x: centerX + 170, y: centerY - 280 },
            size: { width: 280, height: 300 }
          }
        });
        break;

      case 'vision-board':
        // Vision board personal
        await addElement('text', {
          content: '<div style="font-size: 32px; font-weight: bold; text-align: center; color: #6B21A8;">✨ Mi Visión 2025 ✨</div>',
          properties: { 
            position: { x: centerX - 200, y: centerY - 350 },
            size: { width: 400, height: 60 },
            backgroundColor: 'transparent'
          }
        });
        const visionCategories = [
          { title: '💼 Carrera', color: 'blue', x: -300, y: -250 },
          { title: '❤️ Relaciones', color: 'pink', x: 0, y: -250 },
          { title: '🏋️ Salud', color: 'green', x: 300, y: -250 },
          { title: '💰 Finanzas', color: 'yellow', x: -300, y: 50 },
          { title: '📚 Aprendizaje', color: 'purple', x: 0, y: 50 },
          { title: '🌱 Crecimiento', color: 'orange', x: 300, y: 50 },
        ];
        for (const cat of visionCategories) {
          await addElement('sticky', {
            content: `${cat.title}\n\n• Meta 1\n• Meta 2\n• Meta 3`,
            color: cat.color,
            properties: { 
              position: { x: centerX + cat.x, y: centerY + cat.y },
              size: { width: 200, height: 200 }
            }
          });
        }
        break;

      case 'sprint':
        // Sprint planning
        await addElement('text', {
          content: '<div style="font-size: 24px; font-weight: bold; color: white; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #3F51B5, #7C4DFF);">🚀 Sprint Planning</div>',
          properties: { 
            position: { x: centerX - 120, y: centerY - 350 },
            size: { width: 240, height: 50 }
          }
        });
        const columns = [
          { title: '📥 Backlog', color: '#F5F5F5', x: -400 },
          { title: '🔄 En Progreso', color: '#BBDEFB', x: -130 },
          { title: '👀 Revisión', color: '#FFF9C4', x: 140 },
          { title: '✅ Hecho', color: '#C8E6C9', x: 410 },
        ];
        for (const col of columns) {
          await addElement('todo', {
            content: { title: col.title, items: [] },
            properties: { 
              position: { x: centerX + col.x, y: centerY - 280 },
              size: { width: 240, height: 450 },
              backgroundColor: col.color
            }
          });
        }
        break;

      case 'brainstorm':
        // Brainstorming
        const colors = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
        for (let i = 0; i < 6; i++) {
          await addElement('sticky', {
            content: `💡 Idea ${i + 1}`,
            color: colors[i % colors.length],
            properties: { 
              position: { 
                x: centerX + (i % 3 - 1) * 180, 
                y: centerY + (Math.floor(i / 3) - 0.5) * 180 
              }
            }
          });
        }
        break;

      default:
        break;
    }

    setShowTemplatesDialog(false);
    toast({ title: "✅ Plantilla creada", description: "Los elementos se han añadido al tablero." });
  } catch (error) {
    console.error('Error creando plantilla:', error);
    toast({ 
      variant: 'destructive',
      title: "Error", 
      description: "No se pudo crear la plantilla." 
    });
  }
};
```

### Paso 2: Buscar el Dialog de plantillas y reemplazar su contenido

Busca `<Dialog open={showTemplatesDialog}` y reemplaza todo el contenido del grid dentro con:

```tsx
<Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <LayoutGrid className="w-5 h-5" />
        Plantillas Rápidas
      </DialogTitle>
      <DialogDescription>
        Crea estructuras predefinidas para comenzar rápidamente (tamaño 21x15cm)
      </DialogDescription>
    </DialogHeader>
    <div className="grid grid-cols-2 gap-3">
      <Button variant="outline" onClick={() => applyTemplate('weekly-complete')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
        <span className="text-2xl">📅</span>
        <span className="text-sm font-medium">Planificación Semanal</span>
        <span className="text-[10px] text-gray-500">Planner + Tareas + Notas</span>
      </Button>
      <Button variant="outline" onClick={() => applyTemplate('home-dashboard')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
        <span className="text-2xl">🏠</span>
        <span className="text-sm font-medium">Dashboard Hogar</span>
        <span className="text-[10px] text-gray-500">Compras + Limpieza + Menú</span>
      </Button>
      <Button variant="outline" onClick={() => applyTemplate('vision-board')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
        <span className="text-2xl">✨</span>
        <span className="text-sm font-medium">Vision Board</span>
        <span className="text-[10px] text-gray-500">Metas por categoría</span>
      </Button>
      <Button variant="outline" onClick={() => applyTemplate('sprint')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
        <span className="text-2xl">🚀</span>
        <span className="text-sm font-medium">Sprint Planning</span>
        <span className="text-[10px] text-gray-500">Kanban 4 columnas</span>
      </Button>
      <Button variant="outline" onClick={() => applyTemplate('brainstorm')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5 col-span-2">
        <span className="text-2xl">💡</span>
        <span className="text-sm font-medium">Lluvia de Ideas</span>
        <span className="text-[10px] text-gray-500">6 notas adhesivas de colores</span>
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

---

## TAREA 3: Registrar el tipo datetime-widget

**Archivo a modificar:** `src/lib/types.ts`

Busca la línea con `export type ElementType =` y agrega al final antes del punto y coma:
```
| 'datetime-widget'
```

---

## CUANDO TERMINES
Responde: "AGENTE 4 COMPLETADO - Widget DateTime y Templates mejorados"
