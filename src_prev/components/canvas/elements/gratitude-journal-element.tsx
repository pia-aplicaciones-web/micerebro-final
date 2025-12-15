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
