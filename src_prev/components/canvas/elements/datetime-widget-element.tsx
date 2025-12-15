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
      : { theme: 'modern', showCalendar: true };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [dailyQuote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const theme = THEMES[safeContent.theme || 'modern'];
  const showCalendar = safeContent.showCalendar !== false;

  const monthStart = startOfMonth(currentTime);
  const monthEnd = endOfMonth(currentTime);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const updateTheme = (newTheme: keyof typeof THEMES) => {
    onUpdate(id, { content: { ...safeContent, theme: newTheme } });
  };

  const toggleCalendar = () => {
    onUpdate(id, { content: { ...safeContent, showCalendar: !showCalendar } });
  };

  return (
    <Card
      className={cn(
        'w-full h-full flex flex-col overflow-hidden',
        'min-w-[140px] min-h-[140px]',
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
