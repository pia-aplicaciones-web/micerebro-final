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
import ImageCropDialog from "@/components/canvas/image-crop-dialog";

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
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  const handleAddClick = async () => {
    if (!url) return;

    setIsLoadingImage(true);
    try {
      // Validar que la URL sea accesible
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error('La URL no es accesible');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.startsWith('image/')) {
        throw new Error('La URL no apunta a una imagen válida');
      }

      // Si es válida, abrir el diálogo de crop
      setImageToCrop(url);
      setIsCropDialogOpen(true);
      onOpenChange(false); // Cerrar el diálogo actual
    } catch (error) {
      console.error('Error al validar la imagen:', error);
      // Si hay error, añadir la imagen directamente sin crop
      onAddImage(url);
      onOpenChange(false);
    } finally {
      setIsLoadingImage(false);
    }
  };

  const handleCropComplete = (croppedImageUrl: string) => {
    onAddImage(croppedImageUrl);
    setIsCropDialogOpen(false);
    setImageToCrop("");
    setUrl("");
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
          <Button onClick={handleAddClick} disabled={!url || isLoadingImage}>
            {isLoadingImage ? "Validando..." : "Continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Diálogo de Crop */}
      <ImageCropDialog
        isOpen={isCropDialogOpen}
        onClose={() => {
          setIsCropDialogOpen(false);
          setImageToCrop("");
          onOpenChange(true); // Reabrir el diálogo original
        }}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
      />
    </Dialog>
  );
}
