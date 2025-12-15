# AGENTE 1: Habit Tracker + Matriz Eisenhower

## INSTRUCCIONES
Ejecuta estas tareas en orden. Crea los archivos exactamente como se indica.

---

## TAREA 1: Crear Habit Tracker Visual

**Archivo:** `src/components/canvas/elements/habit-tracker-element.tsx`

```tsx
'use client';

import React, { useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, X, Flame, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const HABIT_COLORS = {
  health: { bg: '#E8F5E9', accent: '#4CAF50', name: 'Salud' },
  productivity: { bg: '#E3F2FD', accent: '#2196F3', name: 'Productividad' },
  home: { bg: '#FFF3E0', accent: '#FF9800', name: 'Hogar' },
  mindfulness: { bg: '#F3E5F5', accent: '#9C27B0', name: 'Bienestar' },
  fitness: { bg: '#FFEBEE', accent: '#F44336', name: 'Ejercicio' },
  learning: { bg: '#E0F7FA', accent: '#00BCD4', name: 'Aprendizaje' },
};

interface Habit {
  id: string;
  name: string;
  category: keyof typeof HABIT_COLORS;
  completedDays: string[];
}

interface HabitTrackerContent {
  title?: string;
  habits: Habit[];
}

export default function HabitTrackerElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, deleteElement, onEditElement } = props;

  const safeContent: HabitTrackerContent = 
    typeof content === 'object' && content !== null && 'habits' in content
      ? (content as HabitTrackerContent)
      : { title: 'Mis Hábitos', habits: [] };

  const [newHabitName, setNewHabitName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof HABIT_COLORS>('health');

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const toggleHabitDay = useCallback((habitId: string, date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const updatedHabits = safeContent.habits.map(habit => {
      if (habit.id !== habitId) return habit;
      const isCompleted = habit.completedDays.includes(dateKey);
      return {
        ...habit,
        completedDays: isCompleted
          ? habit.completedDays.filter(d => d !== dateKey)
          : [...habit.completedDays, dateKey],
      };
    });
    onUpdate(id, { content: { ...safeContent, habits: updatedHabits } });
  }, [id, safeContent, onUpdate]);

  const addHabit = useCallback(() => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name: newHabitName.trim(),
      category: selectedCategory,
      completedDays: [],
    };
    onUpdate(id, { content: { ...safeContent, habits: [...safeContent.habits, newHabit] } });
    setNewHabitName('');
  }, [id, safeContent, newHabitName, selectedCategory, onUpdate]);

  const deleteHabit = useCallback((habitId: string) => {
    const updatedHabits = safeContent.habits.filter(h => h.id !== habitId);
    onUpdate(id, { content: { ...safeContent, habits: updatedHabits } });
  }, [id, safeContent, onUpdate]);

  const getStreak = (habit: Habit): number => {
    let streak = 0;
    let checkDate = new Date();
    while (habit.completedDays.includes(format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = addDays(checkDate, -1);
    }
    return streak;
  };

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[500px] min-h-[300px]',
        'rounded-xl shadow-lg border-none',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{ backgroundColor: '#FAFAFA' }}
      onClick={() => onEditElement(id)}
    >
      <CardHeader className="p-3 border-b bg-gradient-to-r from-purple-500 to-pink-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="drag-handle cursor-grab">
              <GripVertical className="h-4 w-4 text-white/70" />
            </div>
            <h3 className="text-white font-bold text-lg">🎯 {safeContent.title || 'Mis Hábitos'}</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white"
            onClick={(e) => { e.stopPropagation(); deleteElement(id); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-auto">
        <div className="grid grid-cols-[1fr,repeat(7,40px),60px] gap-2 mb-3 text-xs font-medium text-gray-500">
          <div>Hábito</div>
          {weekDays.map((day, i) => (
            <div key={i} className="text-center">
              {format(day, 'EEE', { locale: es }).toUpperCase()}
              <div className="text-[10px] text-gray-400">{format(day, 'd')}</div>
            </div>
          ))}
          <div className="text-center">Racha</div>
        </div>

        {safeContent.habits.map(habit => {
          const color = HABIT_COLORS[habit.category];
          const streak = getStreak(habit);
          return (
            <div key={habit.id} 
              className="grid grid-cols-[1fr,repeat(7,40px),60px] gap-2 mb-2 items-center p-2 rounded-lg"
              style={{ backgroundColor: color.bg }}>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                  className="opacity-0 hover:opacity-100 transition-opacity">
                  <X className="h-3 w-3 text-gray-400" />
                </button>
                <span className="text-sm font-medium" style={{ color: color.accent }}>{habit.name}</span>
              </div>
              {weekDays.map((day, i) => {
                const isCompleted = habit.completedDays.includes(format(day, 'yyyy-MM-dd'));
                return (
                  <button key={i}
                    onClick={(e) => { e.stopPropagation(); toggleHabitDay(habit.id, day); }}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                      isCompleted ? 'scale-110' : 'hover:scale-105'
                    )}
                    style={{ 
                      backgroundColor: isCompleted ? color.accent : 'white',
                      border: `2px solid ${color.accent}`
                    }}>
                    {isCompleted && <Check className="h-4 w-4 text-white" />}
                  </button>
                );
              })}
              <div className="flex items-center justify-center gap-1">
                {streak > 0 && <Flame className="h-4 w-4 text-orange-500" />}
                <span className="text-sm font-bold" style={{ color: color.accent }}>{streak}</span>
              </div>
            </div>
          );
        })}

        <div className="mt-4 flex gap-2">
          <Input
            placeholder="Nuevo hábito..."
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHabit()}
            className="flex-1"
            onClick={(e) => e.stopPropagation()}
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as keyof typeof HABIT_COLORS)}
            className="px-2 py-1 rounded border text-sm"
            onClick={(e) => e.stopPropagation()}>
            {Object.entries(HABIT_COLORS).map(([key, val]) => (
              <option key={key} value={key}>{val.name}</option>
            ))}
          </select>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); addHabit(); }}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## TAREA 2: Crear Matriz de Eisenhower

**Archivo:** `src/components/canvas/elements/eisenhower-matrix-element.tsx`

```tsx
'use client';

import React, { useState, useCallback } from 'react';
import type { CommonElementProps } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, X, Zap, Calendar, Users, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const QUADRANTS = {
  do: { 
    label: 'HACER YA', 
    subtitle: 'Urgente e Importante',
    bg: '#FFCDD2', 
    border: '#E53935',
    icon: Zap,
  },
  schedule: { 
    label: 'PROGRAMAR', 
    subtitle: 'Importante, No Urgente',
    bg: '#C8E6C9', 
    border: '#43A047',
    icon: Calendar,
  },
  delegate: { 
    label: 'DELEGAR', 
    subtitle: 'Urgente, No Importante',
    bg: '#BBDEFB', 
    border: '#1E88E5',
    icon: Users,
  },
  eliminate: { 
    label: 'ELIMINAR', 
    subtitle: 'Ni Urgente Ni Importante',
    bg: '#F5F5F5', 
    border: '#9E9E9E',
    icon: Trash2,
  },
};

type QuadrantKey = keyof typeof QUADRANTS;

interface Task {
  id: string;
  text: string;
}

interface EisenhowerContent {
  quadrants: Record<QuadrantKey, Task[]>;
}

export default function EisenhowerMatrixElement(props: CommonElementProps) {
  const { id, content, isSelected, onUpdate, deleteElement, onEditElement } = props;

  const defaultQuadrants: Record<QuadrantKey, Task[]> = {
    do: [], schedule: [], delegate: [], eliminate: []
  };

  const safeContent: EisenhowerContent = 
    typeof content === 'object' && content !== null && 'quadrants' in content
      ? (content as EisenhowerContent)
      : { quadrants: defaultQuadrants };

  const [newTaskText, setNewTaskText] = useState<Record<QuadrantKey, string>>({
    do: '', schedule: '', delegate: '', eliminate: ''
  });

  const addTask = useCallback((quadrant: QuadrantKey) => {
    const text = newTaskText[quadrant].trim();
    if (!text) return;
    
    const newTask: Task = { id: `task-${Date.now()}`, text };
    const updatedQuadrants = {
      ...safeContent.quadrants,
      [quadrant]: [...(safeContent.quadrants[quadrant] || []), newTask]
    };
    onUpdate(id, { content: { quadrants: updatedQuadrants } });
    setNewTaskText(prev => ({ ...prev, [quadrant]: '' }));
  }, [id, safeContent, newTaskText, onUpdate]);

  const deleteTask = useCallback((quadrant: QuadrantKey, taskId: string) => {
    const updatedQuadrants = {
      ...safeContent.quadrants,
      [quadrant]: safeContent.quadrants[quadrant].filter(t => t.id !== taskId)
    };
    onUpdate(id, { content: { quadrants: updatedQuadrants } });
  }, [id, safeContent, onUpdate]);

  const onDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const sourceQuadrant = result.source.droppableId as QuadrantKey;
    const destQuadrant = result.destination.droppableId as QuadrantKey;
    
    const newQuadrants = { ...safeContent.quadrants };
    const sourceItems = [...(newQuadrants[sourceQuadrant] || [])];
    const [movedTask] = sourceItems.splice(result.source.index, 1);
    newQuadrants[sourceQuadrant] = sourceItems;
    
    const destItems = [...(newQuadrants[destQuadrant] || [])];
    destItems.splice(result.destination.index, 0, movedTask);
    newQuadrants[destQuadrant] = destItems;
    
    onUpdate(id, { content: { quadrants: newQuadrants } });
  }, [id, safeContent, onUpdate]);

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[600px] min-h-[500px]',
        'rounded-xl shadow-lg border-2 border-gray-200',
        isSelected && 'ring-2 ring-primary ring-offset-2'
      )}
      style={{ backgroundColor: '#FFFFFF' }}
      onClick={() => onEditElement(id)}
    >
      <div className="p-3 border-b bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="drag-handle cursor-grab">
            <GripVertical className="h-4 w-4 text-white/70" />
          </div>
          <h3 className="text-white font-bold text-lg">📊 Matriz de Eisenhower</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/70 hover:text-white"
          onClick={(e) => { e.stopPropagation(); deleteElement(id); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-2">
          {(Object.entries(QUADRANTS) as [QuadrantKey, typeof QUADRANTS.do][]).map(([key, quadrant]) => {
            const Icon = quadrant.icon;
            return (
              <Droppable key={key} droppableId={key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      'rounded-lg p-3 flex flex-col transition-all',
                      snapshot.isDraggingOver && 'ring-2 ring-offset-1'
                    )}
                    style={{ 
                      backgroundColor: quadrant.bg,
                      borderLeft: `4px solid ${quadrant.border}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4" style={{ color: quadrant.border }} />
                      <div>
                        <div className="font-bold text-sm" style={{ color: quadrant.border }}>
                          {quadrant.label}
                        </div>
                        <div className="text-[10px] text-gray-500">{quadrant.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto space-y-1 mb-2">
                      {(safeContent.quadrants[key] || []).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'bg-white rounded px-2 py-1 text-xs flex items-center justify-between group shadow-sm',
                                snapshot.isDragging && 'shadow-lg'
                              )}
                            >
                              <span>{task.text}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTask(key, task.id); }}
                                className="opacity-0 group-hover:opacity-100 ml-1"
                              >
                                <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>

                    <div className="flex gap-1">
                      <Input
                        placeholder="Nueva tarea..."
                        value={newTaskText[key]}
                        onChange={(e) => setNewTaskText(prev => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && addTask(key)}
                        className="h-7 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button size="sm" className="h-7 px-2" 
                        style={{ backgroundColor: quadrant.border }}
                        onClick={(e) => { e.stopPropagation(); addTask(key); }}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </Card>
  );
}
```

---

## TAREA 3: Registrar los tipos

**Archivo a modificar:** `src/lib/types.ts`

Busca la línea con `export type ElementType =` y agrega al final antes del punto y coma:
```
| 'habit-tracker' | 'eisenhower-matrix'
```

---

## CUANDO TERMINES
Responde: "AGENTE 1 COMPLETADO - Habit Tracker y Matriz Eisenhower creados"
