'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Paintbrush } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  { key: '#96e4e6', name: 'Calipso', bg: '#96e4e6', text: '#0f172a' },
  { key: '#a9e5d3', name: 'Menta', bg: '#a9e5d3', text: '#0f172a' },
  { key: '#d9f99d', name: 'Lima', bg: '#d9f99d', text: '#1f2937' },
  { key: '#fef3c7', name: 'Crema', bg: '#fef3c7', text: '#374151' },
  { key: '#ffd5c2', name: 'Durazno', bg: '#ffd5c2', text: '#7c2d12' },
  { key: '#fbcfe8', name: 'Rosa', bg: '#fbcfe8', text: '#831843' },
  { key: '#c7d2fe', name: 'Lavanda', bg: '#c7d2fe', text: '#312e81' },
  { key: '#e5e7eb', name: 'Gris', bg: '#e5e7eb', text: '#111827' },
];

export default function BoardTitleDisplay({ name, backgroundColor, onUpdateName, onUpdateBackgroundColor, onDeleteBoard }: BoardTitleDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name || '');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [localBackgroundColor, setLocalBackgroundColor] = useState(backgroundColor || '#96e4e6');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(name || '');
  }, [name]);

  useEffect(() => {
    setLocalBackgroundColor(backgroundColor || '#96e4e6');
  }, [backgroundColor]);

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

  const boardColorPicker = onUpdateBackgroundColor ? (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 p-1 hover:bg-black/10 rounded"
          title="Cambiar color"
        >
          <Paintbrush className="h-4 w-4 text-gray-700" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 border-none bg-white shadow-xl rounded-xl">
        <div className="grid grid-cols-6 gap-2">
          {BOARD_BG_COLORS.map((palette) => (
            <button
              key={palette.key}
              type="button"
              onClick={() => {
                setLocalBackgroundColor(palette.key);
                onUpdateBackgroundColor(palette.key);
              }}
              className={cn(
                'w-8 h-8 rounded-lg shadow-sm hover:scale-110 transition-transform flex items-center justify-center text-xs font-bold',
                localBackgroundColor === palette.key && 'ring-2 ring-offset-1 ring-gray-800 scale-110'
              )}
              style={{
                backgroundColor: palette.bg,
                color: palette.text,
                border: `1px solid ${palette.text}30`,
              }}
              title={palette.name}
            >
              Aa
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  ) : null;

  if (isEditing) {
    return (
      <div className="fixed top-2.5 right-3 z-[10005] flex items-center gap-2 pointer-events-auto">
        {boardColorPicker}
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
      {boardColorPicker}
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
