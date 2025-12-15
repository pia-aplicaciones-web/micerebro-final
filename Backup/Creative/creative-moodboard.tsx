'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import {
  X,
  Save,
  Upload,
  Trash2,
  Download,
  GripVertical,
  ImagePlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useMoodboardStore, MoodboardImage } from './moodboard-store';
import IdeasPanel from './ideas-panel';
import html2canvas from 'html2canvas';

// Affirmations that rotate
const AFFIRMATIONS = [
  '✨ Tu creatividad no tiene límites',
  '🌸 Cada idea es una semilla de algo hermoso',
  '🌿 Confía en tu proceso creativo',
  '💫 Lo que imaginas, puedes crearlo',
  '🦋 Permítete explorar sin juicio',
  '🌙 La inspiración está en todas partes',
  '☀️ Hoy es un buen día para crear',
  '🌈 Tu visión es única y valiosa',
];

export default function CreativeMoodboard() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [affirmationIndex, setAffirmationIndex] = useState(0);
  const [panelSize, setPanelSize] = useState({ width: 800, height: 600 });
  const [panelPosition, setPanelPosition] = useState({ x: 100, y: 50 });
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const {
    isOpen,
    ideasMinimized,
    closeMoodboard,
    getActiveMoodboard,
    updateMoodboardName,
    updateIdeas,
    addImage,
    updateImage,
    removeImage,
    toggleIdeasMinimized,
  } = useMoodboardStore();

  const moodboard = getActiveMoodboard();

  // Rotate affirmation every 10 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAffirmationIndex((prev) => (prev + 1) % AFFIRMATIONS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            addImage({
              src,
              x: Math.random() * 200 + 50,
              y: Math.random() * 200 + 50,
              width: 200,
              height: 150,
            });
          };
          reader.readAsDataURL(file);
        }
      });
    },
    [addImage]
  );

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // Export to PNG
  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    try {
      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const link = document.createElement('a');
      link.download = `${moodboard?.name || 'moodboard'}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error exporting moodboard:', error);
    }
  };

  // Delete selected image
  const handleDeleteSelected = () => {
    if (selectedImageId) {
      removeImage(selectedImageId);
      setSelectedImageId(null);
    }
  };

  if (!isOpen || !moodboard) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <Rnd
        size={panelSize}
        position={panelPosition}
        onDragStop={(e, d) => setPanelPosition({ x: d.x, y: d.y })}
        onResizeStop={(e, direction, ref, delta, position) => {
          setPanelSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          });
          setPanelPosition(position);
        }}
        minWidth={600}
        minHeight={400}
        bounds="window"
        dragHandleClassName="moodboard-drag-handle"
        className="pointer-events-auto"
      >
        <div className="w-full h-full bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="moodboard-drag-handle flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FDF8F3] to-[#F5E1E9] border-b border-gray-100 cursor-grab active:cursor-grabbing">
            <div className="flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <Input
                value={moodboard.name}
                onChange={(e) => updateMoodboardName(e.target.value)}
                className="border-0 bg-transparent font-medium text-gray-700 focus-visible:ring-0 focus-visible:ring-offset-0 w-48"
                placeholder="Nombre del moodboard"
              />
            </div>
            <div className="flex items-center gap-2">
              {/* Affirmation */}
              <span className="text-xs text-gray-500 italic hidden md:block">
                {AFFIRMATIONS[affirmationIndex]}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-gray-600 hover:text-gray-800"
              >
                <ImagePlus className="w-4 h-4 mr-1" />
                Agregar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportPng}
                className="text-gray-600 hover:text-gray-800"
              >
                <Download className="w-4 h-4 mr-1" />
                PNG
              </Button>
              {selectedImageId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeMoodboard}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          {/* Canvas area */}
          <div
            ref={canvasRef}
            className={cn(
              'flex-1 relative bg-[#FAFAFA] overflow-hidden',
              isDraggingOver && 'bg-blue-50 border-2 border-dashed border-blue-300'
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => setSelectedImageId(null)}
          >
            {/* Empty state */}
            {moodboard.images.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                <Upload className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Arrastra imágenes aquí o haz clic en "Agregar"</p>
              </div>
            )}

            {/* Images */}
            {moodboard.images.map((img) => (
              <DraggableImage
                key={img.id}
                image={img}
                isSelected={selectedImageId === img.id}
                onSelect={() => setSelectedImageId(img.id)}
                onUpdate={(updates) => updateImage(img.id, updates)}
                onDelete={() => removeImage(img.id)}
              />
            ))}

            {/* Ideas Panel */}
            <IdeasPanel
              value={moodboard.ideas}
              onChange={updateIdeas}
              isMinimized={ideasMinimized}
              onToggleMinimize={toggleIdeasMinimized}
            />
          </div>
        </div>
      </Rnd>
    </div>
  );
}

// Draggable Image Component
interface DraggableImageProps {
  image: MoodboardImage;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<MoodboardImage>) => void;
  onDelete: () => void;
}

function DraggableImage({
  image,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: DraggableImageProps) {
  return (
    <Rnd
      size={{ width: image.width, height: image.height }}
      position={{ x: image.x, y: image.y }}
      onDragStop={(e, d) => {
        onUpdate({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          x: position.x,
          y: position.y,
        });
      }}
      minWidth={50}
      minHeight={50}
      bounds="parent"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        'group',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      <div className="relative w-full h-full">
        <img
          src={image.src}
          alt=""
          className="w-full h-full object-cover rounded-lg shadow-md"
          draggable={false}
        />
        {/* Delete button on hover */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </Rnd>
  );
}
