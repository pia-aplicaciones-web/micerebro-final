// @ts-nocheck
'use client';

import React, { useState, useRef } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  GripVertical,
  CalendarRange,
  Copy,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  FileImage,
} from 'lucide-react';
import { startOfWeek, addDays, format, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';

const DAY_META = [
  { key: 'mon', label: 'LUNES', color: '#16b5a3' },
  { key: 'tue', label: 'MARTES', color: '#c8491d' },
  { key: 'wed', label: 'MIÉRCOLES', color: '#7cab0b' },
  { key: 'thu', label: 'JUEVES', color: '#f3a009' },
  { key: 'fri', label: 'VIERNES', color: '#dd8c0d' },
  { key: 'sat', label: 'SÁBADO', color: '#1496d4' },
  { key: 'sun', label: 'DOMINGO', color: '#7be4ee' },
  { key: 'todo', label: 'PENDIENTES', color: '#e87979' },
];

export default function WeeklyPlannerElement(props: CommonElementProps) {
  const { id, content, properties, isSelected, onUpdate, deleteElement, isPreview, onSelectElement } = props;
  
  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const saved = safeProperties.weekStart;
    return saved ? new Date(saved) : startOfWeek(new Date(), { weekStartsOn: 1 });
  });
  // const { bindDictationTarget } = useDictationBinding({

  // Navegar semanas
  const handlePrevWeek = () => {
    const newWeek = subWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onUpdate(id, { properties: { ...safeProperties, weekStart: newWeek.toISOString() } });
  };

  const handleNextWeek = () => {
    const newWeek = addWeeks(currentWeek, 1);
    setCurrentWeek(newWeek);
    onUpdate(id, { properties: { ...safeProperties, weekStart: newWeek.toISOString() } });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = new Date(e.target.value);
    const newWeek = startOfWeek(selectedDate, { weekStartsOn: 1 });
    setCurrentWeek(newWeek);
    onUpdate(id, { properties: { ...safeProperties, weekStart: newWeek.toISOString() } });
    setShowDatePicker(false);
  };

  // Exportar a PNG
  const handleExportPng = async () => {
    const element = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { 
        backgroundColor: '#ffffff', 
        scale: 3,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `plan-semanal-${format(currentWeek, 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const plannerContent = typeof content === 'object' && content !== null && 'days' in content 
    ? (content as { days: { [key: string]: string } })
    : { days: {} };

  const handleDayChange = async (dateKey: string, value: string) => {
    const newDays = { ...plannerContent.days, [dateKey]: value };
    await onUpdate(id, { content: { days: newDays } });
  };

  const notesKey = `${format(weekStart, 'yyyy-MM-dd')}-notes`;
  const noteContent = plannerContent.days[notesKey] || '';

  return (
    <div
      data-element-id={id}
      className={cn(
        'w-full h-full flex flex-col overflow-hidden rounded-2xl border border-[#e0dcc5] shadow-md',
        isSelected && 'ring-2 ring-primary/40'
      )}
      style={{
        backgroundColor: '#f5f1d6',
        minWidth: 756, // ~20cm
        minHeight: 567, // ~15cm
      }}
    >
      <div className="drag-handle flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-[#6b7280]" />
        <div className="flex flex-col items-center gap-0 leading-tight">
          <span className="text-lg font-semibold text-[#0f172a]">PLANNER SEMANAL</span>
          <div className="flex items-center gap-2">
            <button 
              className="p-0.5 hover:bg-white/60 rounded" 
              title="Semana anterior"
              onClick={(e) => { e.stopPropagation(); handlePrevWeek(); }}
            >
              <ChevronLeft className="w-4 h-4 text-[#6b7280]" />
            </button>
            <span className="text-xs uppercase text-[#6b7280]">
              {format(weekStart, "LLLL", { locale: es })} - Semana del {format(weekStart, 'd', { locale: es })} al {format(addDays(weekStart, 6), 'd, yyyy', { locale: es })}
            </span>
            <button 
              className="p-0.5 hover:bg-white/60 rounded" 
              title="Semana siguiente"
              onClick={(e) => { e.stopPropagation(); handleNextWeek(); }}
            >
              <ChevronRight className="w-4 h-4 text-[#6b7280]" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#6b7280] relative">
          <button 
            className="p-1 hover:bg-white/60 rounded" 
            title="Seleccionar fecha"
            onClick={(e) => { 
              e.stopPropagation(); 
              setShowDatePicker(!showDatePicker);
              setTimeout(() => dateInputRef.current?.showPicker(), 100);
            }}
          >
            <CalendarRange className="w-4 h-4" />
          </button>
          <input
            ref={dateInputRef}
            type="date"
            className="absolute opacity-0 w-0 h-0"
            onChange={handleDateChange}
            value={format(currentWeek, 'yyyy-MM-dd')}
          />
          <button 
            className="p-1 hover:bg-white/60 rounded" 
            title="Exportar PNG"
            onClick={(e) => { e.stopPropagation(); handleExportPng(); }}
          >
            <FileImage className="w-4 h-4" />
          </button>
          <button className="p-1 hover:bg-white/60 rounded" title="Duplicar">
            <Copy className="w-4 h-4" />
          </button>
          <button
            className="p-1 hover:bg-white/60 rounded text-red-500"
            title="Eliminar"
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(id);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-4 gap-3 px-3 pb-3">
        {/* Fila 1 */}
        {weekDays.slice(0, 4).map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayContent = plannerContent.days[dateKey] || '';
          const meta = DAY_META[idx];
          return (
            <DayCard
              key={dateKey}
              label={meta.label}
              color={meta.color}
              dayNumber={format(day, 'd', { locale: es })}
              value={dayContent}
              onChange={(v) => handleDayChange(dateKey, v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />
          );
        })}

        {/* Fila 2 */}
        {weekDays.slice(4).map((day, idx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayContent = plannerContent.days[dateKey] || '';
          const meta = DAY_META[4 + idx];
          return (
            <DayCard
              key={dateKey}
              label={meta.label}
              color={meta.color}
              dayNumber={format(day, 'd', { locale: es })}
              value={dayContent}
              onChange={(v) => handleDayChange(dateKey, v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />
          );
        })}

        {/* Pendientes */}
        <DayCard
          label="PENDIENTES"
          color={DAY_META[7].color}
          dayNumber=""
          value={plannerContent.days['pending'] || ''}
          onChange={(v) => handleDayChange('pending', v)}
          onFocus={() => onSelectElement(id, false)}
          disabled={isPreview}
        />

        {/* Notas - ocupa 4 columnas */}
        <div className="col-span-4">
          <div
            className="flex flex-col bg-white rounded-xl shadow-sm overflow-hidden h-full"
            style={{ minHeight: 120 }}
          >
            <div
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: '#f2c108' }}
            >
              NOTAS
            </div>
            <textarea
              className="flex-1 w-full p-3 text-sm resize-none outline-none border-none"
              value={noteContent}
              onChange={(e) => handleDayChange(notesKey, e.target.value)}
              placeholder="Notas..."
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DayCard({
  label,
  color,
  dayNumber,
  value,
  onChange,
  onFocus,
  disabled,
}: {
  label: string;
  color: string;
  dayNumber: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: (el: HTMLTextAreaElement) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: color }}
      >
        <span>{label}</span>
        {dayNumber && <span className="text-[11px] font-bold">{dayNumber}</span>}
      </div>
      <textarea
        className="flex-1 w-full p-3 text-sm resize-none outline-none border-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe aquí..."
        onFocus={() => onFocus(el)}
        disabled={disabled}
      />
    </div>
  );
}
