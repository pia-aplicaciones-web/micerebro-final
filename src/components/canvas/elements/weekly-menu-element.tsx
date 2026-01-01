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
  FileImage,
  ChevronLeft,
  ChevronRight,
  Camera,
  MoreVertical,
} from 'lucide-react';
import { startOfWeek, addDays, addWeeks, subWeeks, format } from 'date-fns';
import { es } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { toPng } from 'html-to-image';

// Columnas para Menú Semanal de comidas
const MEAL_META = [
  { key: 'desayuno', label: 'DESAYUNO', color: '#f59e0b' },
  { key: 'almuerzo', label: 'ALMUERZO', color: '#10b981' },
  { key: 'cena', label: 'CENA', color: '#6366f1' },
  { key: 'snacks', label: 'SNACKS', color: '#ec4899' },
];

const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function WeeklyMenuElement(props: CommonElementProps) {
  const { id, content, properties, isSelected, onUpdate, deleteElement } = props;

  const safeProperties: CanvasElementProperties = typeof properties === 'object' && properties !== null ? properties : {};
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(() => {
    const saved = safeProperties.weekStart;
    return saved ? new Date(saved) : startOfWeek(new Date(), { weekStartsOn: 1 });
  });

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const menuContent = typeof content === 'object' && content !== null && 'days' in content
    ? (content as { days: { [key: string]: string } })
    : { days: {} };

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
  };

  const handleCellChange = async (key: string, value: string) => {
    const newDays = { ...menuContent.days, [key]: value };
    await onUpdate(id, { content: { days: newDays } });
  };

  // Export to PNG alta resolución
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
      link.download = `menu-semanal-${format(currentWeek, 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  // Nueva función: Exportar captura usando html-to-image
  const handleExportCapture = useCallback(async () => {
    try {
      const menuElement = document.querySelector(`[data-element-id="${id}"]`) as HTMLElement;
      if (!menuElement) {
        console.error('No se pudo encontrar el elemento del menú semanal');
        return;
      }

      console.log('Capturando menú semanal...');
      setIsCapturing(true);

      await new Promise(resolve => setTimeout(resolve, 150));

      const checkFontsLoaded = () => {
        return document.fonts.check('14px "Poppins", sans-serif') ||
          document.fonts.check('14px "Space Grotesk", sans-serif') ||
          document.fonts.check('14px "Patrick Hand", cursive');
      };

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
          }, 1500);
        });
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const dataUrl = await toPng(menuElement, {
        cacheBust: true,
        pixelRatio: 3,
        quality: 0.95,
        backgroundColor: '#ffffff',
        includeQueryParams: false,
        skipFonts: true,
        width: menuElement.offsetWidth,
        height: menuElement.offsetHeight,
        filter: (element) => {
          if (element.tagName === 'LINK' && element.getAttribute('href')?.includes('fonts.googleapis.com')) {
            return false;
          }
          return true;
        },
      });

      setIsCapturing(false);

      const link = document.createElement('a');
      link.download = `menu-semanal_${format(currentWeek, 'yyyy-MM-dd')}_captura.png`;
      link.href = dataUrl;
      link.click();

      console.log('Captura del menú semanal completada');
    } catch (error: any) {
      setIsCapturing(false);
      console.error('Error en captura del menú semanal:', error);
      console.error('Error message:', error.message);
    }
  }, [id, currentWeek]);

  return (
    <div
      data-element-id={id}
      className={cn(
        'w-full h-full flex flex-col overflow-hidden rounded-2xl border border-teal-300 shadow-md'
      )}
      style={{
        backgroundColor: '#008080', // Teal
        minWidth: 600,
        minHeight: 400,
      }}
    >
      {/* Header con selector de fechas */}
      <div className="drag-handle flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing bg-teal-700">
        <GripVertical className="w-4 h-4 text-white/70" />
        <div className="flex flex-col items-center gap-0 leading-tight">
          <span className="text-lg font-semibold text-white">MENÚ SEMANAL</span>
          <div className="flex items-center gap-2">
            <button
              className="p-0.5 hover:bg-white/20 rounded"
              title="Semana anterior"
              onClick={(e) => { e.stopPropagation(); handlePrevWeek(); }}
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <span className="text-xs text-white/80">
              Semana del {format(weekStart, 'd', { locale: es })} al {format(addDays(weekStart, 6), 'd MMMM, yyyy', { locale: es })}
            </span>
            <button
              className="p-0.5 hover:bg-white/20 rounded"
              title="Semana siguiente"
              onClick={(e) => { e.stopPropagation(); handleNextWeek(); }}
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/70 relative">
          <button
            className="p-1 hover:bg-white/20 rounded"
            title="Seleccionar fecha"
            onClick={(e) => {
              e.stopPropagation();
              dateInputRef.current?.showPicker();
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
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-white/20 rounded" title="Más opciones">
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

      {/* Grid - Días en filas, Comidas en columnas */}
      <div className="flex-1 p-3">
        <div>
          <table className="w-full border-collapse min-w-[500px]">
            <thead>
              <tr>
                <th className="p-2 text-xs font-semibold text-white/90 text-left w-24">DÍA</th>
                {MEAL_META.map((meal) => (
                  <th
                    key={meal.key}
                    className="p-2 text-xs font-semibold text-white text-center"
                    style={{ backgroundColor: meal.color }}
                  >
                    {meal.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day, dayIdx) => {
                const dateKey = format(day, 'yyyy-MM-dd');
                return (
                  <tr key={dateKey} className="border-t border-teal-500/30">
                    <td className="p-2 text-xs font-semibold text-white/90 align-top">
                      {DAY_LABELS[dayIdx]}
                      <br />
                      <span className="text-[10px] text-white/60">{format(day, 'd MMM', { locale: es })}</span>
                    </td>
                    {MEAL_META.map((meal) => {
                      const cellKey = `${dateKey}-${meal.key}`;
                      const cellContent = menuContent.days[cellKey] || '';
                      return (
                        <td key={cellKey} className="p-1 align-top">
                          <textarea
                            className="w-full h-16 p-2 text-xs rounded bg-white/95 border-none resize-none outline-none focus:ring-1 focus:ring-teal-400"
                            value={cellContent}
                            onChange={(e) => handleCellChange(cellKey, e.target.value)}
                            placeholder="..."
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Notas */}
        <div className="mt-3">
          <div className="bg-white/95 rounded-lg p-3">
            <div className="text-xs font-semibold text-teal-700 mb-1">LISTA DE COMPRAS</div>
            <textarea
              className="w-full h-20 p-2 text-xs bg-transparent border-none resize-none outline-none"
              value={menuContent.days['shopping-list'] || ''}
              onChange={(e) => handleCellChange('shopping-list', e.target.value)}
              placeholder="Escribe aquí tu lista de compras..."
            />
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
