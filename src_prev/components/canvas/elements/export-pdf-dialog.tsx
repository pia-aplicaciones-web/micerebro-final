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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ExportPdfDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  totalPages: number;
  onExport: (selectedPages: number[]) => void;
}

export default function ExportPdfDialog({
  isOpen,
  onOpenChange,
  totalPages,
  onExport,
}: ExportPdfDialogProps) {
  const [selectedPages, setSelectedPages] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Por defecto, seleccionar todas las páginas
      setSelectedPages(Array.from({ length: totalPages }, (_, i) => i));
    }
  }, [isOpen, totalPages]);

  const handleTogglePage = (pageIndex: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageIndex)
        ? prev.filter((p) => p !== pageIndex)
        : [...prev, pageIndex].sort((a, b) => a - b)
    );
  };

  const handleSelectAll = () => {
    if (selectedPages.length === totalPages) {
      setSelectedPages([]);
    } else {
      setSelectedPages(Array.from({ length: totalPages }, (_, i) => i));
    }
  };

  const handleExport = () => {
    if (selectedPages.length === 0) {
      return;
    }
    onExport(selectedPages);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Páginas a PDF</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="w-full"
            >
              {selectedPages.length === totalPages ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {Array.from({ length: totalPages }, (_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Checkbox
                  id={`page-${i}`}
                  checked={selectedPages.includes(i)}
                  onCheckedChange={() => handleTogglePage(i)}
                />
                <Label
                  htmlFor={`page-${i}`}
                  className="flex-1 cursor-pointer"
                >
                  Página {i + 1}
                </Label>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            {selectedPages.length === 0
              ? 'Selecciona al menos una página para exportar'
              : `Se exportarán ${selectedPages.length} página${selectedPages.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={selectedPages.length === 0}>
            Exportar PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

