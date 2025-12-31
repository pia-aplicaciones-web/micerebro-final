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

interface BoardTitleDisplayProps {
  name: string;
  onUpdateName?: (newName: string) => void;
  onDeleteBoard?: () => void;
}

export default function BoardTitleDisplay({ name, onUpdateName, onDeleteBoard }: BoardTitleDisplayProps) {
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
      <div className="fixed top-2.5 left-2.5 z-[9999] flex items-center gap-2">
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
            minWidth: '400px',
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
    <div className="fixed top-2.5 left-2.5 z-[9999] pointer-events-auto flex items-center gap-2">
      <h1
        className="text-xs font-medium tracking-tight opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
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
