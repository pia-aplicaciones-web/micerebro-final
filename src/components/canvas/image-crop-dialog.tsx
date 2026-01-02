'use client';

import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropDialogProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  aspect?: number; // relación de aspecto (width/height)
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspect = 4/3
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const onCropChange = useCallback((crop: any) => {
    setCrop(crop);
  }, []);

  const onCropAreaChange = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const rotateLeft = () => {
    setRotation(prev => prev - 90);
  };

  const rotateRight = () => {
    setRotation(prev => prev + 90);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  function getRadianAngle(degreeValue: number) {
    return (degreeValue * Math.PI) / 180;
  }

  const getCroppedImg = useCallback(async (
    imageSrc: string,
    pixelCrop: any,
    rotation = 0
  ): Promise<string | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    // set each dimensions to double largest dimension to allow for a safe area for the
    // image to rotate in without being clipped by canvas context
    canvas.width = safeArea;
    canvas.height = safeArea;

    // translate canvas context to a central location on image to allow rotating around the center.
    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate(getRadianAngle(rotation));
    ctx.translate(-safeArea / 2, -safeArea / 2);

    // draw rotated image and store data.
    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );
    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // paste generated rotated image with correct offsets for x,y crop values.
    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    // As Base64 string
    return canvas.toDataURL('image/jpeg');
  }, []);

  const handleCropComplete = useCallback(async () => {
    try {
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(
          imageSrc,
          croppedAreaPixels,
          rotation
        );
        if (croppedImage) {
          onCropComplete(croppedImage);
          onClose();
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [croppedAreaPixels, rotation, imageSrc, getCroppedImg, onCropComplete, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Recortar Imagen</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {/* Área de crop */}
          <div className="relative h-96 bg-gray-100 rounded-lg overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              rotation={rotation}
              zoom={zoom}
              aspect={aspect}
              onCropChange={onCropChange}
              onCropComplete={onCropAreaChange}
              onRotationChange={setRotation}
              onZoomChange={setZoom}
            />
          </div>

          {/* Controles */}
          <div className="flex flex-col space-y-4">
            {/* Rotación */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={rotateLeft}
                className="flex items-center space-x-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Girar Izq</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={rotateRight}
                className="flex items-center space-x-2"
              >
                <RotateCw className="w-4 h-4" />
                <span>Girar Der</span>
              </Button>
            </div>

            {/* Zoom */}
            <div className="flex items-center space-x-4">
              <ZoomOut className="w-4 h-4 text-gray-500" />
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={0.1}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <ZoomIn className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 min-w-[60px]">
                {Math.round(zoom * 100)}%
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleCropComplete}>
            Aplicar Recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;

