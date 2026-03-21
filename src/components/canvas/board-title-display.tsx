'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import TextToolsMenu from './text-tools-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface BoardTitleDisplayProps {
  name: string;
  backgroundColor?: string;
  onUpdateName?: (newName: string) => void;
  onUpdateBackgroundColor?: (newColor: string) => void;
  onDeleteBoard?: () => void;
}

const handleTextFormat = (command: string, value?: string) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'DIV')) {
      activeElement.focus();
      if (value) {
        document.execCommand(command, false, value);
      } else {
        document.execCommand(command, false);
      }
      // Disparar evento input para guardar
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return;
  }

  if (value) {
    document.execCommand(command, false, value);
  } else {
    document.execCommand(command, false);
  }

  // Disparar evento input para guardar cambios
  const activeElement = document.activeElement as HTMLElement;
  if (activeElement) {
    activeElement.dispatchEvent(new Event('input', { bubbles: true }));
  }
};

const BOARD_BG_COLORS = [
  '#96e4e6',
  '#a9e5d3',
  '#d9f99d',
  '#fef3c7',
  '#ffd5c2',
  '#fbcfe8',
  '#c7d2fe',
  '#e5e7eb',
];

export default function BoardTitleDisplay({ name, backgroundColor, onUpdateName, onUpdateBackgroundColor, onDeleteBoard }: BoardTitleDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name || '');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(name || '');
  }, [name]);

  const handleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const handleSave = () => {
    const newName = editValue.trim() || 'Sin título';
    setIsEditing(false);
    if (onUpdateName && newName !== name) {
      onUpdateName(newName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(name || '');
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  if (isEditing) {
    return (
      <div className="fixed top-2.5 right-3 z-[10005] flex items-center gap-2 pointer-events-auto">
        {onUpdateBackgroundColor && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Color de fondo del tablero"
                className="w-4 h-4 rounded-full border border-black/20 shadow-sm hover:scale-105 transition-transform"
                style={{ backgroundColor: backgroundColor || '#96e4e6' }}
                title="Color de fondo del tablero"
              />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-2">
              <div className="grid grid-cols-4 gap-2">
                {BOARD_BG_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => onUpdateBackgroundColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="bg-transparent border-none outline-none text-xs font-medium tracking-tight opacity-70"
          style={{
            fontFamily: "'Space Grotesk', 'Poppins', sans-serif",
            color: '#000000',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
            letterSpacing: '-0.01em',
            fontSize: '12px',
            width: 'min(400px, 72vw)',
          }}
        />
        {onDeleteBoard && (
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <button
                className="p-1 rounded hover:bg-gray-200 transition-colors"
                title="Eliminar tablero"
              >
                <Trash2 className="w-4 h-4 text-gray-500" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará permanentemente el tablero "{name}" y todo su contenido. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    onDeleteBoard();
                    setIsDeleteDialogOpen(false);
                  }}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Sí, eliminar tablero
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-2.5 right-3 z-[10005] pointer-events-auto flex items-center gap-2">
      {onUpdateBackgroundColor && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Color de fondo del tablero"
              className="w-4 h-4 rounded-full border border-black/20 shadow-sm hover:scale-105 transition-transform"
              style={{ backgroundColor: backgroundColor || '#96e4e6' }}
              title="Color de fondo del tablero"
            />
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-2">
            <div className="grid grid-cols-4 gap-2">
              {BOARD_BG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-5 h-5 rounded-full border border-gray-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => onUpdateBackgroundColor(color)}
                  title={color}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      <h1
        className="text-xs font-medium tracking-tight opacity-70 cursor-pointer hover:opacity-100 transition-opacity max-w-[72vw] truncate"
        style={{
          fontFamily: "'Space Grotesk', 'Poppins', sans-serif",
          color: '#000000',
          textShadow: '0 1px 2px rgba(255,255,255,0.8)',
          letterSpacing: '-0.01em',
          fontSize: '12px',
        }}
        onClick={handleClick}
        title="Haz clic para editar el título"
      >
        {name || 'Sin título'}
      </h1>
      {onDeleteBoard && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <button
              className="p-1 rounded hover:bg-gray-200 transition-colors"
              title="Eliminar tablero"
            >
              <Trash2 className="w-4 h-4 text-gray-500" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente el tablero "{name}" y todo su contenido. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDeleteBoard();
                  setIsDeleteDialogOpen(false);
                }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Sí, eliminar tablero
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
