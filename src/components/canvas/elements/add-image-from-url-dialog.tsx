"use client";

import React, { useState } from "react";
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

type AddImageFromUrlDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddImage: (url: string) => void;
};

export default function AddImageFromUrlDialog({
  isOpen,
  onOpenChange,
  onAddImage,
}: AddImageFromUrlDialogProps) {
  const [url, setUrl] = useState("");

  const handleAddClick = () => {
    if (url) {
      onAddImage(url);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Añadir Imagen desde URL</DialogTitle>
          <DialogDescription>
            Pega la URL completa de la imagen que deseas añadir al lienzo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="imageUrl" className="text-right">
              URL
            </Label>
            <Input
              id="imageUrl"
              name="imageUrl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="col-span-3"
              placeholder="https://..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleAddClick} disabled={!url}>Añadir Imagen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
