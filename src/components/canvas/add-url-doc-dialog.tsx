"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function extractTitleFromUrl(url: string): string {
  try {
    if (!url || !url.startsWith('http')) return '';
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    const segments = path.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last !== 'edit' && last !== 'view' && last.length > 2) {
      return decodeURIComponent(last).replace(/[_-]/g, ' ');
    }
    return u.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

type AddUrlDocDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAdd: (url: string, title: string) => void;
};

export default function AddUrlDocDialog({
  isOpen,
  onOpenChange,
  onAdd,
}: AddUrlDocDialogProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    setTitle((prev) => {
      const extracted = extractTitleFromUrl(value);
      return extracted && !prev ? extracted : prev;
    });
  }, []);

  const handleAdd = () => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      onAdd(`https://${trimmedUrl}`, title.trim() || extractTitleFromUrl(trimmedUrl) || 'Documento');
    } else {
      onAdd(trimmedUrl, title.trim() || extractTitleFromUrl(trimmedUrl) || 'Documento');
    }
    setUrl('');
    setTitle('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setUrl('');
    setTitle('');
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>+ URL docs</DialogTitle>
          <DialogDescription>
            Añade un enlace a un documento como referencia. Se mostrará una miniatura con el nombre; al hacer clic se abre en una nueva pestaña.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="url-doc-url">URL del documento</Label>
            <Input
              id="url-doc-url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://docs.google.com/..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url-doc-title">Nombre (opcional)</Label>
            <Input
              id="url-doc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Se extrae automáticamente de la URL"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={!url.trim()}>
            Añadir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
