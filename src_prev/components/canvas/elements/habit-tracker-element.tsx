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
