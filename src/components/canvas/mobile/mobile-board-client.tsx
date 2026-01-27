'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Menu, X as CloseIcon } from 'lucide-react';
import { Rnd } from 'react-rnd';

// Hooks y Contextos
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseStorage } from '@/lib/firebase';
import { useBoardStore } from '@/lib/store/boardStore';
import { useBoardState } from '@/hooks/use-board-state';
import { useElementManager } from '@/hooks/use-element-manager';
import { useToast } from '@/hooks/use-toast';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useDictation } from '@/hooks/use-dictation';

// Utilidades y Tipos
import { uploadFile } from '@/lib/upload-helper';
import { WithId, CanvasElement, Board, NotepadContent } from '@/lib/types';
import html2canvas from 'html2canvas';

// Componentes del Canvas
import Canvas from '@/components/canvas/canvas';
import MobileMenu from '@/components/canvas/mobile-menu';
import { Button } from '@/components/ui/button';
import BoardTitleDisplay from '@/components/canvas/board-title-display';
import FormattingToolbar from '@/components/canvas/formatting-toolbar';
import GalleryElement from '@/components/canvas/elements/gallery-element';

// Diálogos
import AddImageFromUrlDialog from '@/components/canvas/elements/add-image-from-url-dialog';
import ChangeFormatDialog from '@/components/canvas/change-format-dialog';
import EditCommentDialog from '@/components/canvas/elements/edit-comment-dialog';
import RenameBoardDialog from '@/components/canvas/rename-board-dialog';
import GlobalSearch from '@/components/canvas/global-search';
import ImageCropDialog from '@/components/canvas/image-crop-dialog';
import { BoardPasswordDialog } from '@/components/BoardPasswordDialog';

interface MobileBoardClientProps {
  boardId: string;
}

type AuthUser = {
  uid?: string;
  displayName?: string | null;
};

export default function MobileBoardClient({ boardId }: MobileBoardClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext() as {
    user: AuthUser | null;
    loading: boolean;
  };
  const storage = getFirebaseStorage();
  const { toast } = useToast();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  // Estado global del tablero (Zustand)
  const {
    elements,
    board,
    loadBoard,
    createBoard,
    updateElement,
    deleteElement,
    isLoading: isBoardLoading,
    error,
    cleanup,
  } = useBoardStore();

  // Refs para funciones de Zustand
  const loadBoardRef = useRef<any>(null);
  const createBoardRef = useRef<any>(null);
  const cleanupRef = useRef<any>(null);

  useEffect(() => {
    loadBoardRef.current = loadBoard;
    createBoardRef.current = createBoard;
    cleanupRef.current = cleanup;
  }, [loadBoard, createBoard, cleanup]);

  const { boards, handleRenameBoard, handleDeleteBoard, clearCanvas } = useBoardState(boardId);
  const { isListening, transcript, interimTranscript, toggleListening } = useSpeechToText();
  useDictation(isListening, transcript, interimTranscript);
  const { addElement } = useElementManager(boardId, () => ({ x: 0, y: 0 }), () => 1); // Simplificado para móviles

  const handleAddImageFromUrl = useCallback(() => {
    // Implementar lógica de agregar imagen desde URL para móvil
    toast({ title: 'Añadir imagen desde URL (móvil)', description: 'Funcionalidad por implementar' });
  }, [toast]);

  const handleUploadImage = useCallback(() => {
    // Implementar lógica de subir imagen para móvil
    toast({ title: 'Subir imagen (móvil)', description: 'Funcionalidad por implementar' });
  }, [toast]);

  const handleCropImage = useCallback(() => {
    // Implementar lógica de recortar imagen para móvil
    toast({ title: 'Recortar imagen (móvil)', description: 'Funcionalidad por implementar' });
  }, [toast]);

  const handleAddImageFromUrlWithCrop = useCallback(() => {
    // Implementar lógica de agregar imagen desde URL con crop para móvil
    toast({ title: 'Añadir imagen con crop (móvil)', description: 'Funcionalidad por implementar' });
  }, [toast]);

  const handleOpenNotepad = useCallback((id: string) => {
    toast({ title: `Abrir cuaderno ${id} (móvil)`, description: 'Funcionalidad por implementar' });
  }, [toast]);

  const handleLocateElement = useCallback((id: string) => {
    toast({ title: `Localizar elemento ${id} (móvil)`, description: 'Funcionalidad por implementar' });
  }, [toast]);

  // Refs para prevenir múltiples cargas
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const currentBoardIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  // Cargar tablero
  useEffect(() => {
    if (typeof window === 'undefined' || !boardId) return;
    if (authLoading) return;

    // Permitir acceso a usuarios invitados (boards que empiezan con 'guest_')
    const isGuestBoard = boardId.startsWith('guest_');
    if (!user?.uid && !isGuestBoard) {
      router.replace('/');
      return;
    }

    const effectiveUserId = user?.uid || (isGuestBoard ? 'guest' : null);

    // Guard: Prevenir llamadas múltiples si ya está cargando o ya se cargó este tablero
    if (isLoadingRef.current) {
      console.log('⏸️ Ya hay una carga en progreso, ignorando...');
      return;
    }

    // Guard: Si ya se cargó este mismo tablero para este usuario, no volver a cargar
    if (hasLoadedRef.current && currentBoardIdRef.current === boardId && currentUserIdRef.current === effectiveUserId) {
      console.log('⏸️ Tablero ya cargado:', boardId);
      return;
    }

    // Guard: Si auth está cargando, esperar
    if (authLoading) {
      console.log('⏸️ Auth aún cargando, esperando...');
      return;
    }

    // Marcar como cargando ANTES de hacer la llamada
    isLoadingRef.current = true;
    hasLoadedRef.current = true;
    currentBoardIdRef.current = boardId;
    currentUserIdRef.current = effectiveUserId;

    console.log('📂 Cargando tablero:', boardId, 'para usuario:', effectiveUserId);

    const loadPromise = boardId === 'new'
      ? createBoardRef.current?.(effectiveUserId)
      : loadBoardRef.current?.(boardId, effectiveUserId);

    if (!loadPromise) {
      console.error('❌ No se pudo obtener función de carga');
      isLoadingRef.current = false;
      hasLoadedRef.current = false;
      return;
    }

    loadPromise
      .then((result: any) => {
        isLoadingRef.current = false;
        if (boardId === 'new' && result) {
          console.log('✅ Tablero creado:', result);
          router.push(`/board/${result}/`);
        } else {
          console.log('✅ Tablero cargado');
        }
      })
      .catch(async (err: any) => {
        console.error('❌ Error cargando tablero:', err);
        isLoadingRef.current = false;
        hasLoadedRef.current = false;
        currentBoardIdRef.current = null;
        currentUserIdRef.current = null;

        const isPermDenied = err?.code === 'permission-denied' || /permission|denied/i.test(err?.message || '');
        if (isPermDenied) {
          try {
            const newBoardId = await createBoardRef.current?.(effectiveUserId);
            if (newBoardId) {
              router.replace(`/board/${newBoardId}/`);
              return;
            }
          } catch (createErr) {
            console.error('❌ Error creando tablero tras permiso denegado:', createErr);
          }
        }
      });

    return () => {
      // Solo hacer cleanup si el componente se desmonta
      // No resetear los refs aquí porque pueden causar problemas
    };
  }, [boardId, user?.uid, authLoading, router]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      // Resetear refs solo al desmontar completamente
      hasLoadedRef.current = false;
      isLoadingRef.current = false;
      currentBoardIdRef.current = null;
      currentUserIdRef.current = null;
    };
  }, []);

  // Buscar elemento gallery
  const galleryElement = useMemo(() => {
    return elements.find(el => el.type === 'gallery');
  }, [elements]);

  // Filtrar elementos para el canvas (SIEMPRE excluir gallery del canvas)
  const canvasElements = useMemo(() => {
    return elements.filter(el => el.type !== 'gallery' && (el.type as any) !== 'photo-ideas-guide');
  }, [elements]);

  // Crear gallery si no existe (solo una vez por tablero)
  const galleryCreatedRef = useRef(false);
  useEffect(() => {
    // Solo crear gallery si no existe y estamos en un tablero válido
    const shouldCreateGallery = !galleryCreatedRef.current &&
                               !galleryElement &&
                               user?.uid &&
                               boardId !== 'new' &&
                               boardId;

    if (shouldCreateGallery) {
      galleryCreatedRef.current = true;
      console.log('Creando elemento gallery único...');

      // Limpiar cualquier gallery existente antes de crear uno nuevo
      const existingGalleries = elements.filter(el => el.type === 'gallery');
      if (existingGalleries.length > 0) {
        console.log('Eliminando galleries existentes antes de crear uno nuevo:', existingGalleries.length);
        existingGalleries.forEach(gallery => {
          deleteElement(gallery.id);
        });

        // Esperar un poco antes de crear el nuevo para evitar conflictos
        setTimeout(() => {
          addElement('gallery', {
            content: { title: 'Mi galería', images: [] },
            properties: { size: { width: 378, height: 800 } },
            x: -400,
            y: 100,
            width: 378,
            height: 800,
            hidden: true, // Gallery siempre oculto en canvas
            zIndex: -1,
          }).then(() => {
            console.log('Gallery único creado exitosamente');
          }).catch((error) => {
            console.error('Error creando gallery único:', error);
            galleryCreatedRef.current = false;
          });
        }, 100);
      } else {
        // No hay galleries existentes, crear directamente
      addElement('gallery', {
        content: { title: 'Mi galería', images: [] },
        properties: { size: { width: 378, height: 800 } },
        x: -400,
        y: 100,
        width: 378,
        height: 800,
          hidden: true, // Gallery siempre oculto en canvas
        zIndex: -1,
      }).then(() => {
          console.log('Gallery único creado exitosamente');
      }).catch((error) => {
          console.error('Error creando gallery único:', error);
          galleryCreatedRef.current = false;
      });
      }
    }
  }, [galleryElement, addElement, user?.uid, boardId, elements, deleteElement]);

  // Handlers para el MobileMenu y el Canvas (migrados de BoardPageClient)
  const handleSelectElement = useCallback((elementId: string | null) => {
    setSelectedElementIds(elementId ? [elementId] : []);
  }, [setSelectedElementIds]);

  const handleUploadImage = useCallback(async () => {
    const userId = user?.uid;
    if (!userId || !storage) {
      toast({ title: 'Error', description: 'Debes iniciar sesión' });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const result = await uploadFile(file, userId, storage);
        if (result.success) {
          await addElement('image', { content: { url: result.url }, properties: { size: { width: 300, height: 200 } } });
          toast({ title: 'Imagen subida' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      } catch (error) {
        console.error('Error al subir imagen:', error);
        toast({ variant: 'destructive', title: 'Error al subir imagen' });
      }
    };
    input.click();
  }, [user, storage, addElement, toast]);

  const handleCropImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setUploadedFileToProcess(file);
      setIsImageCropDialogOpen(true);
    };
    input.click();
  }, []);

  const handleAddImageFromUrlWithCrop = useCallback(() => {
    setIsImageUrlDialogOpen(true);
    setShouldOpenCropAfterUrl(true);
  }, []);

  const handleCropComplete = useCallback(async (croppedImageDataUrl: string) => {
    const userId = user?.uid;
    if (!userId || !storage || !uploadedFileToProcess) {
      toast({ title: 'Error', description: 'Sesión expirada o archivo no encontrado' });
      return;
    }

    try {
      const response = await fetch(croppedImageDataUrl);
      const blob = await response.blob();
      const croppedFile = new File([blob], uploadedFileToProcess.name, {
        type: uploadedFileToProcess.type,
        lastModified: Date.now()
      });

      const result = await uploadFile(croppedFile, userId, storage);
      if (result.success) {
        await addElement('image', { content: { url: result.url }, properties: { size: { width: 300, height: 200 } } });
        toast({ title: 'Imagen subida y recortada' });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    } catch (error) {
      console.error('Error al procesar imagen recortada:', error);
      toast({ variant: 'destructive', title: 'Error al subir imagen recortada' });
    } finally {
      setIsImageCropDialogOpen(false);
      setImageToCrop("");
      setUploadedFileToProcess(null);
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
    }
  }, [user, storage, addElement, toast, uploadedFileToProcess, imageToCrop]);

  const handleCropCancel = useCallback(() => {
    setIsImageCropDialogOpen(false);
    setImageToCrop("");
    setUploadedFileToProcess(null);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
  }, [imageToCrop]);

  const handleOpenNotepad = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      updateElement(id, { hidden: false });
      handleSelectElement(id);
      canvasRef.current?.centerOnElement(el);
    }
  }, [elements, updateElement, handleSelectElement]);

  const handleLocateElement = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el && canvasRef.current) {
      handleSelectElement(id);
      const offsetY = -(typeof el.height === 'number' ? el.height * 0.4 : 60); // dejar espacio debajo
      canvasRef.current.centerOnElement(el, 1, { y: offsetY });
    }
  }, [elements, handleSelectElement]);

  const handleChangeNotepadFormat = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      setSelectedNotepadForFormat(el);
      setChangeFormatDialogOpen(true);
    }
  }, [elements]);

  const handleSaveFormat = useCallback((id: string, format: 'letter' | '10x15' | '20x15') => {
    const size = format === 'letter'
      ? { width: 794, height: 1021 }
      : format === '20x15'
        ? { width: 567, height: 756 }
        : { width: 378, height: 567 };
    updateElement(id, { width: size.width, height: size.height, properties: { ...selectedNotepadForFormat?.properties, format, size } });
    setChangeFormatDialogOpen(false);
  }, [selectedNotepadForFormat, updateElement]);

  const handleEditComment = useCallback((comment: WithId<CanvasElement>) => {
    setSelectedCommentForEdit(comment);
    setIsEditCommentDialogOpen(true);
  }, []);

  const handleEditElement = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      setActivatedElementId(id);
      canvasRef.current?.centerOnElement(el);
    }
  }, [elements]);

  const handleExportToPng = useCallback(async () => {
    if (!canvasRef.current) return;
    const container = canvasRef.current.getCanvasContainer();
    if (!container) return;
    try {
      toast({ title: 'Exportando...' });
      const canvas = await html2canvas(container, { backgroundColor: '#96e4e6', scale: 2, useCORS: true });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${board?.name || 'tablero'}_${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Exportado' });
      }, 'image/png');
    } catch {
      toast({ variant: 'destructive', title: 'Error al exportar' });
    }
  }, [board, toast]);

  const handleAddMarker = useCallback(async () => {
    try {
      const viewportCenter = getViewportCenter();
      const newCommentId = await addElement('comment', {
        content: { title: 'Nuevo Localizador', label: 'Localizador', text: '' },
        properties: { position: viewportCenter, size: { width: 48, height: 48 } },
      });
      
      // Crear objeto temporal para abrir diálogo de edición inmediatamente
      const newComment: WithId<CanvasElement> = {
        id: newCommentId,
        type: 'comment',
        content: { title: 'Nuevo Localizador', label: 'Localizador', text: '' },
        properties: { position: viewportCenter, size: { width: 48, height: 48 } },
        x: viewportCenter.x,
        y: viewportCenter.y,
        width: 48,
        height: 48,
      };
      
      // Abrir diálogo de edición automáticamente
      setTimeout(() => {
        const found = elements.find(el => el.id === newCommentId);
        setSelectedCommentForEdit(found || newComment);
        setIsEditCommentDialogOpen(true);
      }, 150);
      
      toast({ title: 'Localizador creado - Edita la etiqueta' });
    } catch {
      toast({ variant: 'destructive', title: 'Error' });
    }
  }, [addElement, getViewportCenter, toast, elements]);

  // Buscar elemento gallery
  const galleryElement = useMemo(() => {
    return elements.find(el => el.type === 'gallery');
  }, [elements]);

  // Filtrar elementos para el canvas (SIEMPRE excluir gallery del canvas)
  const canvasElements = useMemo(() => {
    return elements.filter(el => el.type !== 'gallery' && (el.type as any) !== 'photo-ideas-guide');
  }, [elements]);

  // Crear gallery si no existe (solo una vez por tablero)
  const galleryCreatedRef = useRef(false);
  useEffect(() => {
    // Solo crear gallery si no existe y estamos en un tablero válido
    const shouldCreateGallery = !galleryCreatedRef.current &&
                               !galleryElement &&
                               user?.uid &&
                               boardId !== 'new' &&
                               boardId;

    if (shouldCreateGallery) {
      galleryCreatedRef.current = true;
      console.log('Creando elemento gallery único...');

      // Limpiar cualquier gallery existente antes de crear uno nuevo
      const existingGalleries = elements.filter(el => el.type === 'gallery');
      if (existingGalleries.length > 0) {
        console.log('Eliminando galleries existentes antes de crear uno nuevo:', existingGalleries.length);
        existingGalleries.forEach(gallery => {
          deleteElement(gallery.id);
        });

        // Esperar un poco antes de crear el nuevo para evitar conflictos
        setTimeout(() => {
          addElement('gallery', {
            content: { title: 'Mi galería', images: [] },
            properties: { size: { width: 378, height: 800 } },
            x: -400,
            y: 100,
            width: 378,
            height: 800,
            hidden: true, // Gallery siempre oculto en canvas
            zIndex: -1,
          }).then(() => {
            console.log('Gallery único creado exitosamente');
          }).catch((error) => {
            console.error('Error creando gallery único:', error);
            galleryCreatedRef.current = false;
          });
        }, 100);
      } else {
        // No hay galleries existentes, crear directamente
      addElement('gallery', {
        content: { title: 'Mi galería', images: [] },
        properties: { size: { width: 378, height: 800 } },
        x: -400,
        y: 100,
        width: 378,
        height: 800,
          hidden: true, // Gallery siempre oculto en canvas
        zIndex: -1,
      }).then(() => {
          console.log('Gallery único creado exitosamente');
      }).catch((error) => {
          console.error('Error creando gallery único:', error);
          galleryCreatedRef.current = false;
      });
      }
    }
  }, [galleryElement, addElement, user?.uid, boardId, elements, deleteElement]);


  // === RENDERS ===
  if (authLoading || isBoardLoading || !board) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Cargando tablero móvil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <p className="text-red-600 text-lg">Error: {error}</p>
        <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Diálogo de contraseña del tablero */}
      {/* {isPasswordDialogOpen && board && (
        <BoardPasswordDialog
          boardName={board.name}
          onPasswordSubmit={handlePasswordSubmit}
          isLoading={isVerifyingPassword}
        />
      )} */}

      {/* Solo mostrar el tablero si la contraseña está verificada (o no hay) */}
      {/* {isPasswordVerified && ( */}
        <>
          <RenameBoardDialog
        isOpen={isRenameBoardDialogOpen}
        onOpenChange={setIsRenameBoardDialogOpen}
        currentBoardName={board?.name || ''}
        onSave={(name) => { handleRenameBoard(name); setIsRenameBoardDialogOpen(false); }}
      />

          <div className="h-screen w-screen relative overflow-hidden">
            {/* Nombre del tablero en esquina superior izquierda */}
            <BoardTitleDisplay name={board?.name || ""} onUpdateName={handleRenameBoard} onDeleteBoard={handleDeleteBoard} />

            {/* Botón de menú móvil */}
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-4 right-4 z-[1001] bg-white border border-gray-200 shadow-md hover:bg-gray-100"
              onClick={handleToggleMobileMenu}
            >
              {isMobileMenuOpen ? (
                <CloseIcon className="h-6 w-6 text-black" />
              ) : (
                <Menu className="h-6 w-6 text-black" />
              )}
            </Button>

            {/* MobileMenu */}
            <MobileMenu
              isOpen={isMobileMenuOpen}
              onClose={handleToggleMobileMenu}
              elements={elements || []}
              boards={boards || []}
              boardId={boardId}
              user={user}
              isListening={isListening}
              onToggleDictation={toggleListening}
              onOpenNotepad={handleOpenNotepad}
              onLocateElement={handleLocateElement}
              addElement={addElement}
              onRenameBoard={handleRenameBoard}
              onDeleteBoard={handleDeleteBoard}
              onUploadImage={handleUploadImage}
              onAddImageFromUrl={handleAddImageFromUrl}
              onCropImage={handleCropImage}
              onAddImageFromUrlWithCrop={handleAddImageFromUrlWithCrop}
            />

            {/* Canvas Principal */}
            <Canvas
              ref={canvasRef}
              elements={canvasElements as WithId<CanvasElement>[]}
              board={board as WithId<Board>}
              selectedElementIds={[]} // Dejar vacío por ahora, o gestionar selección para móvil
              onSelectElement={handleSelectElement} // Usar el handler migrado
              updateElement={updateElement}
              deleteElement={deleteElement}
              unanchorElement={(id) => updateElement(id, { parentId: undefined })}
              addElement={addElement}
              onLocateElement={handleLocateElement}
              onFormatToggle={() => setIsFormatToolbarOpen(p => !p)}
              onChangeNotepadFormat={handleChangeNotepadFormat} // Usar el handler migrado
              onEditElement={handleEditElement} // Usar el handler migrado
              selectedElement={selectedElement}
              activatedElementId={activatedElementId}
              isMobile={true}
              setIsDirty={setIsDirty}
              onBringToFront={() => {}}
              onSendToBack={() => {}}
              onMoveBackward={() => {}}
              onGoToHome={() => canvasRef.current?.goToHome()}
              onCenterView={() => {}}
              onGroupElements={() => {}} // Lógica de grupo para móvil
              saveLastView={() => {}} // Lógica para guardar vista
              onActivateDrag={() => {}} // Lógica para activar drag
              onEditComment={handleEditComment} // Usar el handler migrado
              onDuplicateElement={() => {}} // Lógica para duplicar
              onUngroup={() => {}} // Lógica para desagrupar
              user={user}
              storage={storage}
              toast={toast}
              isPreview={false}
            />

            {/* FormattingToolbar para móvil (visible en la parte inferior) */}
            <FormattingToolbar
              isOpen={isFormatToolbarOpen} // Controla la visibilidad del toolbar móvil
              onClose={() => setIsFormatToolbarOpen(false)}
              elements={selectedElement ? [selectedElement] : []}
              onAddComment={handleAddMarker} // Usar el handler migrado
              onEditComment={handleEditComment} // Usar el handler migrado
              isMobileSheet={true}
              onLocateElement={handleLocateElement}
              onPanToggle={() => { setIsPanningActive(p => !p); canvasRef.current?.activatePanMode(); }}
              addElement={addElement}
              isPanningActive={isPanningActive}
              selectedElement={selectedElement}
              onUpdateElement={updateElement}
            />

            {/* Diálogos (migrados de BoardPageClient) */}
            <AddImageFromUrlDialog
              isOpen={isImageUrlDialogOpen}
              onOpenChange={setIsImageUrlDialogOpen}
              onAddImage={async (url) => {
                if (shouldOpenCropAfterUrl) {
                  setImageToCrop(url);
                  setIsImageCropDialogOpen(true);
                  setShouldOpenCropAfterUrl(false);
                } else {
                  await addElement('image', { content: { url }, properties: { size: { width: 300, height: 200 } } });
                }
                setIsImageUrlDialogOpen(false);
              }}
            />

            <ImageCropDialog
              isOpen={isImageCropDialogOpen}
              onClose={handleCropCancel}
              imageSrc={imageToCrop}
              onCropComplete={handleCropComplete}
            />

            {selectedCommentForEdit && (
              <EditCommentDialog
                isOpen={isEditCommentDialogOpen}
                onOpenChange={setIsEditCommentDialogOpen}
                comment={selectedCommentForEdit}
                onUpdate={updateElement}
                onDelete={deleteElement}
              />
            )}

            <GlobalSearch
              elements={elements || []}
              isOpen={isGlobalSearchOpen}
              onClose={() => setIsGlobalSearchOpen(false)}
              onLocateElement={handleLocateElement}
            />
          </div>
        </>
      {/* )} */}
    </>
  );
}
