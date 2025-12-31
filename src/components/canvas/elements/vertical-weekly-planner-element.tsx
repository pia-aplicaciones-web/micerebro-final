// @ts-nocheck
'use client';

import React, { useState, useRef } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  CalendarRange,
  Copy,
  Trash2,
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
];

export default function VerticalWeeklyPlannerElement(props: CommonElementProps) {
  const { id, content, properties, isSelected, onUpdate, deleteElement, isPreview, onSelectElement } = props;

  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const saved = safeProperties.weekStart;
    return saved ? new Date(saved) : startOfWeek(new Date(), { weekStartsOn: 1 });
  });

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
    const newDate = new Date(e.target.value);
    const weekStart = startOfWeek(newDate, { weekStartsOn: 1 });
    setCurrentWeek(weekStart);
    onUpdate(id, { properties: { ...safeProperties, weekStart: weekStart.toISOString() } });
    setShowDatePicker(false);
  };

  // Exportar PNG
  const handleExportPng = async () => {
    const element = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#f5f1d6',
        scale: 2,
        useCORS: true,
        allowTaint: false,
      });

      const link = document.createElement('a');
      link.download = `planner-vertical-${format(currentWeek, 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exportando PNG:', error);
    }
  };

  // Datos del planner
  const plannerContent = typeof content === 'object' && content !== null ? content : { days: {} };
  const weekStart = currentWeek;
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Función para manejar cambios en días
  const handleDayChange = (dateKey: string, value: string) => {
    const newContent = {
      ...plannerContent,
      days: {
        ...plannerContent.days,
        [dateKey]: value
      }
    };
    onUpdate(id, { content: newContent });
  };

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
      {/* Header */}
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

      {/* Contenido principal - 3 columnas, 2 filas */}
      <div className="flex-1 p-3">
        <div className="grid grid-cols-3 gap-3 h-full">
          {/* Fila 1: Título vacío, Lunes, Martes, Miércoles */}
          <div className="flex flex-col gap-3">
            {/* Celda vacía para el título */}
            <div className="bg-white rounded-xl shadow-sm p-3 text-center font-semibold text-[#6b7280] border-2 border-dashed border-[#e0dcc5]">
              SEMANA
            </div>
            {/* Lunes */}
            <DayCard
              label={DAY_META[0].label}
              color={DAY_META[0].color}
              dayNumber={format(weekDays[0], 'd', { locale: es })}
              value={plannerContent.days[format(weekDays[0], 'yyyy-MM-dd')] || ''}
              onChange={(v) => handleDayChange(format(weekDays[0], 'yyyy-MM-dd'), v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />
          </div>

          <div className="flex flex-col gap-3">
            {/* Martes */}
            <DayCard
              label={DAY_META[1].label}
              color={DAY_META[1].color}
              dayNumber={format(weekDays[1], 'd', { locale: es })}
              value={plannerContent.days[format(weekDays[1], 'yyyy-MM-dd')] || ''}
              onChange={(v) => handleDayChange(format(weekDays[1], 'yyyy-MM-dd'), v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />
            {/* Miércoles */}
            <DayCard
              label={DAY_META[2].label}
              color={DAY_META[2].color}
              dayNumber={format(weekDays[2], 'd', { locale: es })}
              value={plannerContent.days[format(weekDays[2], 'yyyy-MM-dd')] || ''}
              onChange={(v) => handleDayChange(format(weekDays[2], 'yyyy-MM-dd'), v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />
          </div>

          {/* Fila 2: Jueves, Viernes, Sábado/Domingo */}
          <div className="flex flex-col gap-3">
            {/* Jueves */}
            <DayCard
              label={DAY_META[3].label}
              color={DAY_META[3].color}
              dayNumber={format(weekDays[3], 'd', { locale: es })}
              value={plannerContent.days[format(weekDays[3], 'yyyy-MM-dd')] || ''}
              onChange={(v) => handleDayChange(format(weekDays[3], 'yyyy-MM-dd'), v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />

            {/* Viernes */}
            <DayCard
              label={DAY_META[4].label}
              color={DAY_META[4].color}
              dayNumber={format(weekDays[4], 'd', { locale: es })}
              value={plannerContent.days[format(weekDays[4], 'yyyy-MM-dd')] || ''}
              onChange={(v) => handleDayChange(format(weekDays[4], 'yyyy-MM-dd'), v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
            />

            {/* Sábado y Domingo en celdas separadas */}
            <div className="flex flex-col gap-3 flex-1">
              <DayCard
                label={DAY_META[5].label}
                color={DAY_META[5].color}
                dayNumber={format(weekDays[5], 'd', { locale: es })}
                value={plannerContent.days[format(weekDays[5], 'yyyy-MM-dd')] || ''}
                onChange={(v) => handleDayChange(format(weekDays[5], 'yyyy-MM-dd'), v)}
                onFocus={() => onSelectElement(id, false)}
                disabled={isPreview}
                className="flex-1"
              />
              <DayCard
                label={DAY_META[6].label}
                color={DAY_META[6].color}
                dayNumber={format(weekDays[6], 'd', { locale: es })}
                value={plannerContent.days[format(weekDays[6], 'yyyy-MM-dd')] || ''}
                onChange={(v) => handleDayChange(format(weekDays[6], 'yyyy-MM-dd'), v)}
                onFocus={() => onSelectElement(id, false)}
                disabled={isPreview}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botón eliminar fuera del header */}
      {deleteElement && (
        <div className="absolute -top-2 -right-2 z-10">
          <Button
            variant="destructive"
            size="icon"
            className="h-6 w-6 rounded-full shadow-lg"
            title="Eliminar elemento"
            onClick={(e) => {
              e.stopPropagation();
              deleteElement(id);
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
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
  className,
}: {
  label: string;
  color: string;
  dayNumber: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: (el: HTMLTextAreaElement) => void;
  disabled: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col bg-white rounded-xl shadow-sm overflow-hidden", className)}>
      <div
        className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: color }}
      >
        <span>{label}</span>
        {dayNumber && <span className="text-[11px] font-bold">{dayNumber}</span>}
      </div>
      <textarea
        className="flex-1 w-full p-3 text-sm resize-none outline-none border-none min-h-[80px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe aquí..."
        onFocus={() => onFocus(el)}
        disabled={disabled}
      />
    </div>
  );
}
