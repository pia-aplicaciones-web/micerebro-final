// src/components/canvas/elements/edit-comment-dialog.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as AlertDialogFooterShad, // Renombrar para evitar conflicto
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { WithId, CanvasElement, CommentContent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { useAutoSave } from '@/hooks/use-auto-save';
import { SaveStatusIndicator } from '@/components/canvas/save-status-indicator';


interface EditCommentDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  comment: WithId<CanvasElement>; // El elemento completo del comentario
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
}

export default function EditCommentDialog({
  isOpen,
  onOpenChange,
  comment,
  onUpdate,
  onDelete,
}: EditCommentDialogProps) {
  const [title, setTitle] = useState('');
  const [label, setLabel] = useState('');
  const [commentText, setCommentText] = useState(''); // Estado para el texto del comentario
  const { toast } = useToast();
  
  const titleInputRef = useRef<HTMLInputElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && comment && comment.content) {
      const content = comment.content as CommentContent;
      setTitle(content.title || '');
      setLabel(content.label || '');
      // CORRECCIÓN AQUÍ: Acceder a 'content.text' en lugar de 'content.comment'
      setCommentText(content.text || '');
    } else {
      setTitle('');
      setLabel('');
      setCommentText('');
    }
  }, [isOpen, comment]);

  // AUTOGUARDADO: Título del comentario
  const { saveStatus: titleSaveStatus, handleBlur: handleTitleBlur, handleChange: handleTitleChange } = useAutoSave({
    getContent: () => titleInputRef.current?.value || title,
    onSave: async (newTitle) => {
      if (newTitle !== title && comment) {
        const currentContent = comment.content as CommentContent;
        onUpdate(comment.id, {
          content: {
            ...currentContent,
            title: newTitle,
          },
        });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => oldContent === newContent,
    disabled: !isOpen,
  });

  // AUTOGUARDADO: Label del comentario
  const { saveStatus: labelSaveStatus, handleBlur: handleLabelBlur, handleChange: handleLabelChange } = useAutoSave({
    getContent: () => labelInputRef.current?.value || label,
    onSave: async (newLabel) => {
      if (newLabel !== label && comment) {
        const currentContent = comment.content as CommentContent;
        onUpdate(comment.id, {
          content: {
            ...currentContent,
            label: newLabel,
          },
        });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => oldContent === newContent,
    disabled: !isOpen,
  });

  // AUTOGUARDADO: Texto del comentario
  const { saveStatus: textSaveStatus, handleBlur: handleTextBlur, handleChange: handleTextChange } = useAutoSave({
    getContent: () => commentTextareaRef.current?.value || commentText,
    onSave: async (newText) => {
      if (newText !== commentText && comment) {
        const currentContent = comment.content as CommentContent;
        onUpdate(comment.id, {
          content: {
            ...currentContent,
            text: newText,
          },
        });
      }
    },
    debounceMs: 2000,
    compareContent: (oldContent, newContent) => oldContent === newContent,
    disabled: !isOpen,
  });

  const handleSave = () => {
    if (!comment) return;
    
    // Forzar guardado de todos los campos antes de cerrar
    handleTitleBlur();
    handleLabelBlur();
    handleTextBlur();

    onUpdate(comment.id, {
      content: {
        ...(comment.content as CommentContent), // Mantener otras propiedades del contenido
        title: title,
        label: label,
        text: commentText, // Actualizar la propiedad 'text'
      },
    });
    toast({
      title: 'Comentario Actualizado',
      description: 'El comentario ha sido guardado.',
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!comment) return;
    onDelete(comment.id);
    toast({
      variant: 'destructive',
      title: 'Comentario Eliminado',
      description: 'El comentario ha sido borrado permanentemente.',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Comentario</DialogTitle>
          <DialogDescription>
            Realiza cambios en tu comentario aquí. Haz clic en guardar cuando hayas terminado.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Título
            </Label>
            <div className="col-span-3 relative">
              <Input
                ref={titleInputRef}
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  handleTitleChange();
                }}
                onBlur={handleTitleBlur}
                className="pr-8"
                placeholder="Título del comentario (opcional)"
              />
              <div className="absolute top-2 right-2">
                <SaveStatusIndicator status={titleSaveStatus} size="sm" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="label" className="text-right">
              Etiqueta
            </Label>
            <div className="col-span-3 relative">
              <Input
                ref={labelInputRef}
                id="label"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  handleLabelChange();
                }}
                onBlur={handleLabelBlur}
                className="pr-8"
                placeholder="Etiqueta corta (opcional)"
              />
              <div className="absolute top-2 right-2">
                <SaveStatusIndicator status={labelSaveStatus} size="sm" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 items-start gap-4"> {/* items-start para Textarea */}
            <Label htmlFor="commentText" className="text-right mt-2">
              Texto
            </Label>
            <div className="col-span-3 relative">
              <Textarea
                ref={commentTextareaRef}
                id="commentText"
                value={commentText}
                onChange={(e) => {
                  setCommentText(e.target.value);
                  handleTextChange();
                }}
                onBlur={handleTextBlur}
                className="h-24 pr-8" // Ajusta la altura según necesites
                placeholder="Escribe tu comentario aquí..."
              />
              <div className="absolute top-2 right-2">
                <SaveStatusIndicator status={textSaveStatus} size="sm" />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="mr-auto"><Trash2 className="mr-2 h-4 w-4" /> Eliminar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de eliminar este comentario?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Esto eliminará permanentemente tu comentario.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooterShad>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
              </AlertDialogFooterShad>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}