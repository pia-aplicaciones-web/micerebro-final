// @ts-nocheck
'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { CommonElementProps, CanvasElementProperties } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GripVertical,
  CalendarRange,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileImage,
  Camera,
  MoreVertical,
  Maximize2,
} from 'lucide-react';
import { startOfWeek, addDays, format, addWeeks, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

const DAY_META = [
  { key: 'mon', label: 'LUNES', color: '#16b5a3' },
  { key: 'tue', label: 'MARTES', color: '#c8491d' },
  { key: 'wed', label: 'MIÉRCOLES', color: '#7cab0b' },
  { key: 'thu', label: 'JUEVES', color: '#808000' },
  { key: 'fri', label: 'VIERNES', color: '#f3a009' },
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
  const [isCapturing, setIsCapturing] = useState(false);

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

  // Función para cambiar fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    const newWeek = startOfWeek(newDate, { weekStartsOn: 1 });
    setCurrentWeek(newWeek);
    onUpdate(id, { properties: { ...safeProperties, weekStart: newWeek.toISOString() } });
    setShowDatePicker(false);
  };

  // Función para exportar PNG
  const handleExportPng = async () => {
    if (!onSelectElement) return;

    try {
      const element = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: '#f5f1d6',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `menu-semanal-${format(currentWeek, 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
  };

  // Nueva función: Exportar captura usando html-to-image (similar al cuaderno)
  const handleExportCapture = useCallback(async () => {
    try {
      // Buscar el elemento del menú semanal
      const plannerElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!plannerElement) {
        console.error('No se pudo encontrar el elemento del menú semanal');
        return;
      }

      // Mostrar indicador de carga
      console.log('Capturando menú semanal...');

      setIsCapturing(true);

      // Esperar a que React renderice completamente
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verificar que las fuentes externas estén completamente cargadas
      const checkFontsLoaded = () => {
        return document.fonts.check('14px "Poppins", sans-serif') ||
               document.fonts.check('14px "Space Grotesk", sans-serif') ||
               document.fonts.check('14px "Patrick Hand", cursive');
      };

      // Esperar fuentes con mejor timeout
      let fontsReady = checkFontsLoaded();
      if (!fontsReady) {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (checkFontsLoaded() || document.fonts.status === 'loaded') {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);

          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 1500); // Timeout más corto
        });
      }

      // Esperar estabilidad completa del DOM
      await new Promise(resolve => setTimeout(resolve, 100));

      // Configuración optimizada para captura perfecta (sin errores CORS)
      const dataUrl = await toPng(plannerElement, {
        cacheBust: true,
        pixelRatio: 3, // 3x para buena calidad sin ser excesivo
        quality: 0.95, // Alta calidad pero optimizada
        backgroundColor: '#FFFFF0', // Fondo marfil del menú semanal
        includeQueryParams: false,
        skipFonts: true, // Evitar errores CORS con fuentes externas
        width: plannerElement.offsetWidth, // Ancho exacto del elemento
        height: plannerElement.offsetHeight, // Alto exacto del elemento
        // Filtrar hojas de estilo externas para evitar errores CORS
        filter: (element) => {
          if (element.tagName === 'LINK' && element.getAttribute('href')?.includes('fonts.googleapis.com')) {
            return false; // Excluir Google Fonts CSS
          }
          return true;
        },
      });

      // DESACTIVAR MODO CAPTURA
      setIsCapturing(false);

      // Crear link de descarga con nombre específico
      const link = document.createElement('a');
      link.download = `menu-semanal_${format(currentWeek, 'yyyy-MM-dd')}_captura.png`;
      link.href = dataUrl;
      link.click();

      console.log('Captura del menú semanal completada');
    } catch (error: any) {
      // Asegurar desactivar modo captura en error
      setIsCapturing(false);

      console.error('Error en captura del menú semanal:', error);
      console.error('Error message:', error.message);
    }
  }, [id, currentWeek]);

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

  const handleRestoreOriginalSize = useCallback(() => {
    if (isPreview) return;

    // Tamaño original del menú semanal: carta A4
    const originalSize = { width: 794, height: 1123 };

    // Restaurar tamaño original
    onUpdate(id, {
      properties: {
        ...properties,
        size: originalSize,
      },
    });
  }, [isPreview, properties, onUpdate, id]);

  const plannerContent = typeof content === 'object' && content !== null ? content : { days: {} };
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(currentWeek, i));
  const weekStart = currentWeek;

  // Título editable
  const menuTitle = plannerContent.title || 'MENÚ SEMANAL';

  const handleTitleChange = (newTitle: string) => {
    const newContent = {
      ...plannerContent,
      title: newTitle
    };
    onUpdate(id, { content: newContent });
  };


  return (
    <div
      data-element-id={id}
        className={cn(
          'flex flex-col overflow-hidden rounded-2xl border border-black shadow-md'
        )}
      style={{
        backgroundColor: '#FFFFF0', // Blanco marfil
        width: 794, // Tamaño carta A4 fijo
        height: 1123, // Tamaño carta A4 fijo
      }}
    >
      {/* Header */}
      <div className="drag-handle flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4 text-[#6b7280]" />
        <div className="flex flex-col items-center gap-0 leading-tight">
          <div className="flex items-center gap-3">
            <button
              className="p-1 hover:bg-white/60 rounded"
              title="Semana anterior"
              onClick={(e) => { e.stopPropagation(); handlePrevWeek(); }}
            >
              <ChevronLeft className="w-5 h-5 text-[#6b7280]" />
            </button>
            <span className="text-sm font-semibold uppercase text-[#0f172a] tracking-wide">
              {format(weekStart, "LLLL", { locale: es })} - Semana del {format(weekStart, 'd', { locale: es })} al {format(addDays(weekStart, 6), 'd, yyyy', { locale: es })}
            </span>
            <button
              className="p-1 hover:bg-white/60 rounded"
              title="Semana siguiente"
              onClick={(e) => { e.stopPropagation(); handleNextWeek(); }}
            >
              <ChevronRight className="w-5 h-5 text-[#6b7280]" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#6b7280] relative">
          <button
            className="p-1 hover:bg-white/60 rounded"
            title="Restaurar tamaño original"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleRestoreOriginalSize(); }}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-white/60 rounded" title="Más opciones">
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={handleExportCapture} disabled={isCapturing}>
                <Camera className="mr-2 h-4 w-4" />
                <span>{isCapturing ? 'Capturando...' : 'Exportar captura'}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleExportPng(); }}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>Exportar PNG (alta resolución)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicar</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteElement(id); }}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contenido principal - FILAS QUE LLENAN TODO EL ESPACIO CON CASILLAS IGUALES */}
      <div className="flex-1 p-3">
        <div className="flex flex-col h-full">
          {/* FILA 1: Título arriba + Lunes/Martes/Miércoles abajo - MISMA ALTURA QUE FILA 2 */}
          <div className="flex flex-col gap-2 h-1/2">
            {/* Título arriba - EDITABLE - ALTURA FIJA PARA QUE QUEDE ESPACIO */}
            <div className="bg-white rounded-xl shadow-sm p-2 border border-dashed border-[#e0dcc5] flex-shrink-0">
              <input
                type="text"
                value={menuTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-center text-base font-bold text-[#6b7280] uppercase tracking-wide bg-transparent border-none outline-none placeholder:text-[#6b7280] placeholder:opacity-60"
                placeholder="MENÚ SEMANAL"
                spellCheck={false}
              />
            </div>
            {/* Lunes, Martes, Miércoles abajo - OCUPA EL RESTO DEL ESPACIO */}
            <div className="grid grid-cols-3 gap-3 flex-1">
              <DayCard
                label={DAY_META[0].label}
                color={DAY_META[0].color}
                dayNumber={format(weekDays[0], 'd', { locale: es })}
                value={plannerContent.days[format(weekDays[0], 'yyyy-MM-dd')] || ''}
                onChange={(v) => handleDayChange(format(weekDays[0], 'yyyy-MM-dd'), v)}
                onFocus={() => !isSelected && onSelectElement(id, false)}
                disabled={isPreview}
                className="h-full"
              />
              <DayCard
                label={DAY_META[1].label}
                color={DAY_META[1].color}
                dayNumber={format(weekDays[1], 'd', { locale: es })}
                value={plannerContent.days[format(weekDays[1], 'yyyy-MM-dd')] || ''}
                onChange={(v) => handleDayChange(format(weekDays[1], 'yyyy-MM-dd'), v)}
                onFocus={() => !isSelected && onSelectElement(id, false)}
                disabled={isPreview}
                className="h-full"
              />
              <DayCard
                label={DAY_META[2].label}
                color={DAY_META[2].color}
                dayNumber={format(weekDays[2], 'd', { locale: es })}
                value={plannerContent.days[format(weekDays[2], 'yyyy-MM-dd')] || ''}
                onChange={(v) => handleDayChange(format(weekDays[2], 'yyyy-MM-dd'), v)}
                onFocus={() => !isSelected && onSelectElement(id, false)}
                disabled={isPreview}
                className="h-full"
              />
            </div>
          </div>

          {/* FILA 2: Jueves, Viernes, (Sábado arriba/Domingo abajo) - TODAS MISMA ALTURA */}
          <div className="grid grid-cols-3 gap-3 h-1/2">
            <DayCard
              label={DAY_META[3].label}
              color={DAY_META[3].color}
              dayNumber={format(weekDays[3], 'd', { locale: es })}
              value={plannerContent.days[format(weekDays[3], 'yyyy-MM-dd')] || ''}
              onChange={(v) => handleDayChange(format(weekDays[3], 'yyyy-MM-dd'), v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
              className="h-full"
            />

            <DayCard
              label={DAY_META[4].label}
              color={DAY_META[4].color}
              dayNumber={format(weekDays[4], 'd', { locale: es })}
              value={plannerContent.days[format(weekDays[4], 'yyyy-MM-dd')] || ''}
              onChange={(v) => handleDayChange(format(weekDays[4], 'yyyy-MM-dd'), v)}
              onFocus={() => onSelectElement(id, false)}
              disabled={isPreview}
              className="h-full"
            />

            {/* Sábado arriba, Domingo abajo - MISMA ALTURA TOTAL */}
            <div className="grid grid-rows-2 gap-3 h-full">
              <DayCard
                label={DAY_META[5].label}
                color={DAY_META[5].color}
                dayNumber={format(weekDays[5], 'd', { locale: es })}
                value={plannerContent.days[format(weekDays[5], 'yyyy-MM-dd')] || ''}
                onChange={(v) => handleDayChange(format(weekDays[5], 'yyyy-MM-dd'), v)}
                onFocus={() => !isSelected && onSelectElement(id, false)}
                disabled={isPreview}
                className="h-full"
              />
              <DayCard
                label={DAY_META[6].label}
                color={DAY_META[6].color}
                dayNumber={format(weekDays[6], 'd', { locale: es })}
                value={plannerContent.days[format(weekDays[6], 'yyyy-MM-dd')] || ''}
                onChange={(v) => handleDayChange(format(weekDays[6], 'yyyy-MM-dd'), v)}
                onFocus={() => !isSelected && onSelectElement(id, false)}
                disabled={isPreview}
                className="h-full"
              />
            </div>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus(textareaRef.current);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className={cn(
      'flex flex-col bg-white rounded-xl shadow-sm overflow-hidden h-full border border-dashed border-gray-300 transition-all duration-200',
      isFocused && 'ring-2 ring-blue-400 shadow-lg',
      className
    )}>
      <div
        className="flex items-center justify-between px-3 py-2 text-base font-semibold uppercase text-white flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <span>{label}</span>
        {dayNumber && <span className="text-[11px] font-bold">{dayNumber}</span>}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={cn(
          "flex-1 w-full p-3 text-sm resize-none border-none overflow-auto transition-colors duration-200",
          "focus:outline-none focus:ring-0",
          "placeholder:text-slate-400 placeholder:italic",
          isFocused ? "bg-blue-50" : "bg-white"
        )}
        placeholder={isFocused ? "Escribe aquí..." : "Haz clic para editar..."}
        spellCheck={false}
      />
    </div>
  );
}