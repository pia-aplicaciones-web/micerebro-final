'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addSavedLink } from '@/lib/saved-links';

type AddLinkDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  boardId?: string;
};

function isValidUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    new URL(t);
    return true;
  } catch {
    return false;
  }
}

export function AddLinkDialog({ open, onOpenChange, onSaved, boardId }: AddLinkDialogProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (open) {
      setName('');
      setUrl('');
    }
  }, [open]);

  const handleSave = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!isValidUrl(trimmedUrl)) return;
    addSavedLink(name.trim() || 'Sin nombre', trimmedUrl, boardId);
    onSaved?.();
    onOpenChange(false);
  };

  const canSave = url.trim() !== '' && isValidUrl(url.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar página</DialogTitle>
          <DialogDescription>
            Asigna un nombre y pega la URL. Se abrirá en una nueva pestaña desde el menú Link.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input
              placeholder="Ej. Google Calendar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">URL</label>
            <Input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={!canSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
