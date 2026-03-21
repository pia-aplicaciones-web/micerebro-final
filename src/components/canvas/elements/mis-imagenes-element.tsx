'use client';

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import type { CommonElementProps, ImageCarouselContent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { shouldAllowTouchEdit } from '@/lib/touch-edit-guard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { compressImage, uploadFile } from '@/lib/upload-helper';
import { GripVertical, Upload, Trash2, Image as ImageIcon, X, Maximize } from 'lucide-react';

const MAX_IMAGES = 50;
const MAX_LOCAL_IMAGE_KB = 100;

function isImageCarouselContent(content: unknown): content is ImageCarouselContent {
  return typeof content === 'object' && content !== null && 'images' in (content as any);
}

export default function MisImagenesElement(props: CommonElementProps) {
  const {
    id,
    content,
    isSelected,
    onSelectElement,
    onEditElement,
    onUpdate,
    deleteElement,
    minimized,
  } = props;

  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typedContent: ImageCarouselContent = isImageCarouselContent(content)
    ? content
    : { title: 'Mis imágenes', images: [], activeIndex: 0 };

  const images = Array.isArray(typedContent.images) ? typedContent.images : [];
  const activeIndex = typeof typedContent.activeIndex === 'number' ? typedContent.activeIndex : 0;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  const updateContent = useCallback((next: Partial<ImageCarouselContent>) => {
    const nextContent: ImageCarouselContent = {
      title: typedContent.title || 'Mis imágenes',
      images,
      activeIndex,
      ...next,
    };
    onUpdate(id, { content: nextContent });
  }, [id, onUpdate, typedContent.title, images, activeIndex]);

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const addImageUrls = useCallback((urls: string[], names?: string[]) => {
    if (!urls.length) return;
    const remaining = Math.max(0, MAX_IMAGES - images.length);
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: 'Máximo 50 imágenes.' });
      return;
    }
    const nextUrls = urls.slice(0, remaining);
    const nextImages = nextUrls.map((url, idx) => ({
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      url,
      name: names?.[idx],
    }));

    updateContent({
      images: [...images, ...nextImages],
      activeIndex: images.length === 0 ? 0 : activeIndex,
    });
  }, [images, activeIndex, toast, updateContent]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files || []);
    if (list.length === 0) return;

    const remaining = Math.max(0, MAX_IMAGES - images.length);
    if (remaining <= 0) {
      toast({ title: 'Límite alcanzado', description: 'Máximo 50 imágenes.' });
      return;
    }

    const toProcess = list.slice(0, remaining);
    const urls: string[] = [];
    const names: string[] = [];

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;
      try {
        if (props.userId && props.storage) {
          const result = await uploadFile(file, props.userId, props.storage);
          if (result.success) {
            urls.push(result.url);
            names.push(result.fileName);
          } else {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
          }
        } else {
          const compressed = await compressImage(file, MAX_LOCAL_IMAGE_KB);
          const sizeKB = compressed.size / 1024;
          if (sizeKB > MAX_LOCAL_IMAGE_KB) {
            toast({
              variant: 'destructive',
              title: 'Imagen demasiado grande',
              description: `Tamaño final: ${sizeKB.toFixed(2)}KB (máximo ${MAX_LOCAL_IMAGE_KB}KB)`,
            });
            continue;
          }
          const url = await readAsDataUrl(compressed);
          urls.push(url);
          names.push(file.name);
        }
      } catch (error) {
        console.error('Error al procesar imagen:', error);
      }
    }

    addImageUrls(urls, names);
  }, [addImageUrls, images.length, props.userId, props.storage, toast]);

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await handleFiles(files);
      return;
    }

    const uriList = e.dataTransfer.getData('text/uri-list');
    const plain = e.dataTransfer.getData('text/plain');
    if (uriList || plain) {
      toast({
        variant: 'destructive',
        title: 'Subida no permitida',
        description: 'Para respetar peso y resolución, sube archivos de imagen (máx. 100KB).',
      });
    }
  }, [addImageUrls, handleFiles]);

  const handleRemoveCurrent = useCallback(() => {
    if (!images.length) return;
    const indexToRemove = Math.min(Math.max(0, activeIndexRef.current), images.length - 1);
    const nextImages = images.filter((_, idx) => idx !== indexToRemove);
    const nextIndex = Math.max(0, Math.min(indexToRemove, nextImages.length - 1));
    updateContent({ images: nextImages, activeIndex: nextIndex });
  }, [images, updateContent]);

  const slides = useMemo(() => images.map((img) => ({ ...img })), [images]);

  if (minimized) {
    return (
      <Card
        className={cn(
          'w-full h-full border border-slate-200 shadow-md',
          isSelected && 'ring-2 ring-blue-500 ring-offset-2'
        )}
      >
        <div className="p-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="h-4 w-4 text-slate-400" />
            <div className="text-sm font-semibold truncate">{typedContent.title || 'Mis imágenes'}</div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onUpdate(id, { minimized: false } as any)}
            title="Abrir"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'relative w-full h-full overflow-visible border border-slate-200 shadow-md bg-white',
        isSelected && 'ring-2 ring-blue-500 ring-offset-2'
      )}
      onClick={() => onEditElement(id)}
      data-element-type="mis-imagenes"
      data-no-center="true"
    >
      {/* Basurero exterior: elimina el contenedor completo */}
      <div className="absolute -top-2 -right-2 z-20">
        <Button
          variant="destructive"
          size="icon"
          className="h-7 w-7 rounded-full shadow-lg"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            deleteElement?.(id);
          }}
          title="Eliminar contenedor"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2 min-w-0">
          <div className="drag-handle cursor-grab active:cursor-grabbing text-slate-400">
            <GripVertical className="h-4 w-4" />
          </div>
          <Input
            value={typedContent.title || 'Mis imágenes'}
            onChange={(e) => updateContent({ title: e.target.value })}
            data-dictation-target="true"
            className="h-7 text-sm font-semibold border-none shadow-none focus-visible:ring-0 p-1 bg-transparent"
            onTouchStart={(e) => {
              const target = e.currentTarget as HTMLElement;
              if (!shouldAllowTouchEdit(target)) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
          <span className="text-[11px] text-slate-500">{images.length}/{MAX_IMAGES}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onUpdate(id, { minimized: true } as any)}
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleFilePick} title="Subir imágenes">
            <Upload className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            disabled={images.length === 0}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleRemoveCurrent();
            }}
            title="Eliminar actual"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={cn(
          'relative w-full h-[calc(100%-40px)] flex items-center justify-center',
          isDragOver && 'ring-2 ring-emerald-400 ring-offset-2'
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {slides.length === 0 ? (
          <div className="w-[85%] h-[75%] rounded-2xl border-2 border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center text-slate-500 gap-2">
            <ImageIcon className="h-10 w-10" />
            <div className="text-sm font-medium">Arrastra imágenes aquí</div>
            <div className="text-xs">o usa el botón subir</div>
          </div>
        ) : (
          <Swiper
            modules={[Navigation]}
            navigation={!isMobile}
            slidesPerView={1}
            onSlideChange={(swiper) => updateContent({ activeIndex: swiper.activeIndex })}
            className="w-full h-full"
            initialSlide={Math.max(0, Math.min(activeIndex, slides.length - 1))}
          >
            {slides.map((img) => (
              <SwiperSlide key={img.id}>
                <div className="w-full h-full flex items-center justify-center bg-black/5">
                  <img
                    src={img.url}
                    alt={img.name || 'imagen'}
                    className="max-w-full max-h-full object-contain"
                    draggable={false}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.currentTarget.value = '';
        }}
      />
    </Card>
  );
}
