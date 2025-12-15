'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { CanvasElement, WithId, NotepadElementProperties } from '@/lib/types';

interface ChangeFormatDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  notepad: WithId<CanvasElement> | null;
  onSaveFormat: (id: string, format: 'letter' | '10x15') => void;
}

const formats = [
  { id: 'letter', label: 'Carta (8.5" x 11")', description: 'Formato estándar para documentos.' },
  { id: '10x15', label: 'Ficha (10cm x 15cm)', description: 'Ideal para notas rápidas y fichas de estudio.' },
];

export default function ChangeFormatDialog({
  isOpen,
  onOpenChange,
  notepad,
  onSaveFormat,
}: ChangeFormatDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'letter' | '10x15'>('letter');

  useEffect(() => {
    if (notepad) {
      const currentFormat = (notepad.properties as NotepadElementProperties)?.format || 'letter';
      setSelectedFormat(currentFormat);
    }
  }, [notepad]);

  const handleSave = () => {
    if (notepad?.id) {
      onSaveFormat(notepad.id, selectedFormat);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar Formato del Cuaderno</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as 'letter' | '10x15')}>
            {formats.map((format) => (
              <Label
                key={format.id}
                htmlFor={format.id}
                className="flex items-start space-x-3 p-4 rounded-md border hover:bg-accent cursor-pointer"
              >
                <RadioGroupItem value={format.id} id={format.id} />
                <div className="grid gap-1.5">
                  <span className="font-semibold">{format.label}</span>
                  <span className="text-sm text-muted-foreground">{format.description}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
