'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Rnd } from 'react-rnd';

// Hooks y Contextos
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseStorage } from '@/lib/firebase';
import { useBoardStore } from '@/lib/store/boardStore';
import { useBoardState } from '@/hooks/use-board-state';
import { useElementManager } from '@/hooks/use-element-manager';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useToast } from '@/hooks/use-toast';

// Utilidades y Tipos
import { uploadFile } from '@/lib/upload-helper';
import { WithId, CanvasElement, Board } from '@/lib/types';
import html2canvas from 'html2canvas';

// Componentes del Canvas
import Canvas from '@/components/canvas/canvas';
import ToolsSidebar from '@/components/canvas/tools-sidebar';
import FormattingToolbar from '@/components/canvas/formatting-toolbar';
import GalleryElement from '@/components/canvas/elements/gallery-element';

// Diálogos
import AddImageFromUrlDialog from '@/components/canvas/elements/add-image-from-url-dialog';
import ChangeFormatDialog from '@/components/canvas/change-format-dialog';
import EditCommentDialog from '@/components/canvas/elements/edit-comment-dialog';
import RenameBoardDialog from '@/components/canvas/rename-board-dialog';
import BoardTitleDisplay from '@/components/canvas/board-title-display';
import GlobalSearch from '@/components/canvas/global-search';
import ImageCropDialog from '@/components/canvas/image-crop-dialog';
import { BoardPasswordDialog } from '@/components/BoardPasswordDialog';
import { SafetyIndicator } from '@/components/SafetyControls';


// Debug Menu (temporal)
// QuickAddTask movido al menú principal (tools-sidebar.tsx)
// import QuickAddTask from '@/components/canvas/quick-add-task';

// Hooks de dictado
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useDictation } from '@/hooks/use-dictation';

interface BoardPageClientProps {
  boardId: string;
}

type AuthUser = {
  uid?: string;
  displayName?: string | null;
};

export default function BoardPageClient({ boardId }: BoardPageClientProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext() as {
    user: AuthUser | null;
    loading: boolean;
  };
  const storage = getFirebaseStorage();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Guía: no crear usuarios anónimos ni cargar sin usuario real de AuthContext
  
  // Refs para funciones de Zustand
  const loadBoardRef = useRef<any>(null);
  const createBoardRef = useRef<any>(null);
  const cleanupRef = useRef<any>(null);

  // Estado global del tablero (Zustand)
  const {
    elements,
    board,
    loadBoard,
    createBoard,
    updateElement,
    deleteElement,
    selectedElementIds,
    setSelectedElementIds,
    isLoading: isBoardLoading,
    error,
    cleanup,
  } = useBoardStore();
  
  useEffect(() => {
    loadBoardRef.current = loadBoard;
    createBoardRef.current = createBoard;
    cleanupRef.current = cleanup;
  }, [loadBoard, createBoard, cleanup]);

  // Estados para contraseña del tablero
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // CRÍTICO: Cleanup del listener cuando el componente se desmonta o cambia boardId
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [boardId]);

  // Verificar contraseña del tablero
  useEffect(() => {
    if (board && board.password && !isPasswordVerified) {
      setIsPasswordDialogOpen(true);
    } else if (board && !board.password) {
      setIsPasswordVerified(true);
    }
  }, [board, isPasswordVerified]);


  // Función para verificar contraseña del tablero
  const handlePasswordSubmit = useCallback(async (enteredPassword: string) => {
    if (!board?.password) {
      setIsPasswordVerified(true);
      setIsPasswordDialogOpen(false);
      return;
    }

    setIsVerifyingPassword(true);

    try {
      // Verificar contraseña (por ahora comparación simple, en producción usar hash)
      if (enteredPassword === board.password) {
        setIsPasswordVerified(true);
        setIsPasswordDialogOpen(false);
        toast({
          title: 'Acceso concedido',
          description: 'Bienvenido al tablero protegido.'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Contraseña incorrecta',
          description: 'La contraseña ingresada no es correcta.'
        });
      }
    } catch (error) {
      console.error('Error al verificar contraseña:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hubo un problema al verificar la contraseña.'
      });
    } finally {
      setIsVerifyingPassword(false);
    }
  }, [board, toast]);

  // Estado local
  const { boards, handleRenameBoard, handleDeleteBoard, clearCanvas } = useBoardState(boardId);
  const canvasRef = useRef<any>(null);
  
  // Estados de UI
  const [isFormatToolbarOpen, setIsFormatToolbarOpen] = useState(false);
  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
  const [shouldOpenCropAfterUrl, setShouldOpenCropAfterUrl] = useState(false);
  const [changeFormatDialogOpen, setChangeFormatDialogOpen] = useState(false);
  const [isPanningActive, setIsPanningActive] = useState(false);
  const [isRenameBoardDialogOpen, setIsRenameBoardDialogOpen] = useState(false);
  const [isImageCropDialogOpen, setIsImageCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [uploadedFileToProcess, setUploadedFileToProcess] = useState<File | null>(null);
  
  // Estados de Selección
  const [selectedElement, setSelectedElement] = useState<WithId<CanvasElement> | null>(null);
  const [activatedElementId, setActivatedElementId] = useState<string | null>(null);
  const [selectedNotepadForFormat, setSelectedNotepadForFormat] = useState<WithId<CanvasElement> | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditCommentDialogOpen, setIsEditCommentDialogOpen] = useState(false);
  const [selectedCommentForEdit, setSelectedCommentForEdit] = useState<WithId<CanvasElement> | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Función para eliminar todas las imágenes del usuario
  const deleteAllUserImages = useCallback(async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Usuario no autenticado'
      });
      return;
    }

    // Crear un diálogo con la información copiable
    const userId = user.uid;
    const firebaseUrl = 'https://console.firebase.google.com/project/micerebroapp/storage/micerebroapp.firebasestorage.app/files';

    // Copiar URL al portapapeles
    navigator.clipboard?.writeText(firebaseUrl).then(() => {
      toast({
        title: 'URL copiada al portapapeles',
        description: firebaseUrl
      });
    }).catch(() => {
      toast({
        title: 'URL (cópiala manualmente)',
        description: firebaseUrl
      });
    });

    // Mostrar información detallada
    setTimeout(() => {
      const info = `
🔥 INSTRUCCIONES PARA ELIMINAR IMÁGENES:

📋 TU INFORMACIÓN:
• User ID: ${userId}
• URL Firebase Console: ${firebaseUrl}

📝 PASOS DETALLADOS:

1. ✅ URL ya copiada - pégala en tu navegador
2. En Firebase Console, panel izquierdo → "micerebroapp.firebasestorage.app"
3. Busca carpeta "users" y ábrela
4. Busca carpeta "${userId}" y ábrela
5. Abre carpeta "images"
6. Selecciona todos: Ctrl+A (Windows) o Cmd+A (Mac)
7. Botón "Eliminar" (basurero) → confirma

❓ ¿Necesitas ayuda? La URL ya está copiada.
      `;

      alert(info);
    }, 500);

  }, [user, toast]);

  // Asegurar que todos los paneles estén cerrados al iniciar la página (solo una vez)
  // REMOVIDO: El useEffect que forzaba setIsGalleryOpen(false) estaba interfiriendo con el toggle
  useEffect(() => {
    setIsGlobalSearchOpen(false);
    setIsFormatToolbarOpen(true); // El toolbar de formato debe estar abierto por defecto
    setIsImageUrlDialogOpen(false);
    setIsRenameBoardDialogOpen(false);
    setIsEditCommentDialogOpen(false);
  }, []); // Array de dependencias vacío significa que solo se ejecuta una vez al montar

  // Dictado global - CURSOR MANDA
  const { isListening, transcript, interimTranscript, toggleListening } = useSpeechToText();
  useDictation(isListening, transcript, interimTranscript);

  // Funciones auxiliares
  const getViewportCenter = useCallback(() => {
    if (canvasRef.current) return canvasRef.current.getViewportCenter();
    return { x: 400, y: 400 };
  }, []);

  const elementsRef = useRef(elements);
  useEffect(() => { elementsRef.current = elements; }, [elements]);

  const getNextZIndex = useCallback(() => {
    const els = elementsRef.current;
    if (!els?.length) return 1;
    const zIndexes = els.filter(e => typeof e.zIndex === 'number').map(e => e.zIndex!);
    return zIndexes.length ? Math.max(...zIndexes) + 1 : 2;
  }, []);

  const { addElement } = useElementManager(boardId, getViewportCenter, getNextZIndex);

  // Buscar elemento gallery
  const galleryElement = useMemo(() => {
    return elements.find(el => el.type === 'gallery');
  }, [elements]);

  // Filtrar elementos para el canvas (SIEMPRE excluir gallery del canvas)
  const canvasElements = useMemo(() => {
    return elements.filter(el => el.type !== 'gallery' && (el.type as any) !== 'photo-ideas-guide');
  }, [elements]);

  // Este código de actualización específica se ha removido para evitar conflictos
  // con la nueva lógica de gallery único

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

  // Handler para drag and drop desde galería hacia canvas
  useEffect(() => {
    const handleCanvasDrop = async (e: DragEvent) => {
      const imageUrl = e.dataTransfer?.getData('application/x-image') || 
                       e.dataTransfer?.getData('text/plain') ||
                       e.dataTransfer?.getData('text/uri-list');
      
      if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:'))) {
        e.preventDefault();
        const center = getViewportCenter();
        await addElement('image', {
          content: { url: imageUrl },
          properties: { size: { width: 300, height: 200 } },
          x: center.x - 150,
          y: center.y - 100,
          width: 300,
          height: 200,
        });
      }
    };

    const canvasContainer = canvasRef.current?.getCanvasContainer();
    if (canvasContainer) {
      canvasContainer.addEventListener('drop', handleCanvasDrop);
      canvasContainer.addEventListener('dragover', (e) => {
        if (e.dataTransfer?.types.includes('application/x-image')) {
          e.preventDefault();
        }
      });
      return () => {
        canvasContainer.removeEventListener('drop', handleCanvasDrop);
      };
    }
  }, [addElement, getViewportCenter]);

  // Sincronizar selección
  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;
  const foundElement = useMemo(() => {
    if (!selectedElementId || !elements?.length) return null;
    return elements.find(el => el.id === selectedElementId) || null;
  }, [selectedElementId, elements]);
  
  useEffect(() => {
    if (foundElement?.id !== selectedElement?.id) {
      setSelectedElement(foundElement);
    }
  }, [foundElement, selectedElement?.id]);

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

  // Handlers
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

      // Crear URL temporal para preview y crop
      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setUploadedFileToProcess(file);
      setIsImageCropDialogOpen(true);
    };
    input.click();
  }, [user, storage]);

  const handleCropImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Crear URL temporal para preview y crop
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
      // Convertir el data URL a File
      const response = await fetch(croppedImageDataUrl);
      const blob = await response.blob();
      const croppedFile = new File([blob], uploadedFileToProcess.name, {
        type: uploadedFileToProcess.type,
        lastModified: Date.now()
      });

      // Subir la imagen recortada
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
      // Limpiar estados
      setIsImageCropDialogOpen(false);
      setImageToCrop("");
      setUploadedFileToProcess(null);
      // Limpiar URL temporal
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
    }
  }, [user, storage, addElement, toast, uploadedFileToProcess, imageToCrop]);

  const handleCropCancel = useCallback(() => {
    setIsImageCropDialogOpen(false);
    setImageToCrop("");
    setUploadedFileToProcess(null);
    // Limpiar URL temporal
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
  }, [imageToCrop]);

  // Ref para almacenar el ID pendiente de localizar (para elementos recién creados)
  const pendingLocateRef = useRef<string | null>(null);

  const handleLocateElement = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el && canvasRef.current) {
      handleSelectElement(id);
      // Centrar el tablero en el localizador (o elemento) con un zoom amigable
      const offsetY = -(typeof el.height === 'number' ? el.height * 0.4 : 60); // dejar espacio debajo
      canvasRef.current.centerOnElement(el, 1, { y: offsetY });
      pendingLocateRef.current = null;
    } else {
      // Si el elemento no está aún, guardarlo para localizarlo cuando llegue
      pendingLocateRef.current = id;
    }
  }, [elements, handleSelectElement]);

  // Efecto para localizar elementos pendientes cuando llegan nuevos elementos
  useEffect(() => {
    if (pendingLocateRef.current) {
      const el = elements.find(e => e.id === pendingLocateRef.current);
      if (el && canvasRef.current) {
        handleSelectElement(pendingLocateRef.current);
        const offsetY = -(typeof el.height === 'number' ? el.height * 0.4 : 60);
        canvasRef.current.centerOnElement(el, 1, { y: offsetY });
        pendingLocateRef.current = null;
      }
    }
  }, [elements, handleSelectElement]);

  const handleOpenNotepad = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      updateElement(id, { hidden: false });
      handleSelectElement(id);
      canvasRef.current?.centerOnElement(el);
    }
  }, [elements, updateElement, handleSelectElement]);

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

  // === RENDERS ===
  // ELIMINADO: Ya no bloqueamos el acceso si no hay usuario
  // Permitimos que la app funcione sin autenticación

  if (authLoading && !user) {
    // Solo mostrar loading si auth está cargando Y no hay usuario aún
    // Pero permitir continuar después de un tiempo razonable
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Cargando...</p>
      </div>
    );
  }

  if (isBoardLoading || !board) {
    return (
      <div className="flex h-screen w-full items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">Cargando tablero...</p>
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
      {isPasswordDialogOpen && board && (
        <BoardPasswordDialog
          boardName={board.name}
          onPasswordSubmit={handlePasswordSubmit}
          isLoading={isVerifyingPassword}
        />
      )}

      {/* Solo mostrar el tablero si la contraseña está verificada */}
      {isPasswordVerified && (
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

        {/* Indicador de modo seguro - Solo en desarrollo */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-4 right-4 z-50">
            <SafetyIndicator />
          </div>
        )}

        <Canvas
          ref={canvasRef}
          elements={canvasElements as WithId<CanvasElement>[]}
          board={board as WithId<Board>}
          selectedElementIds={selectedElementIds}
          onSelectElement={handleSelectElement}
          updateElement={updateElement}
          deleteElement={deleteElement}
          unanchorElement={(id) => updateElement(id, { parentId: undefined })}
          addElement={addElement}
          onLocateElement={handleLocateElement}
          onFormatToggle={() => setIsFormatToolbarOpen(p => !p)}
          onChangeNotepadFormat={handleChangeNotepadFormat}
          onEditElement={handleEditElement}
          selectedElement={selectedElement}
          activatedElementId={activatedElementId}
          isMobile={isMobile}
          setIsDirty={setIsDirty}
          onBringToFront={() => {}}
          onSendToBack={() => {}}
          onMoveBackward={() => {}}
          onGoToHome={() => canvasRef.current?.goToHome()}
          onCenterView={() => {}}
          onGroupElements={() => {}}
          saveLastView={() => {}}
          onActivateDrag={() => {}}
          onEditComment={handleEditComment}
          onDuplicateElement={() => {}}
          onUngroup={() => {}}
          user={user}
          storage={storage}
          toast={toast}
          isPreview={false}
        />
        
        <ToolsSidebar
          elements={elements || []}
          boards={boards || []}
          boardId={boardId}
          user={user}
          onUploadImage={handleUploadImage}
          onAddImageFromUrl={() => {
            setIsImageUrlDialogOpen(true);
            setShouldOpenCropAfterUrl(false);
          }}
          onCropImage={handleCropImage}
          onAddImageFromUrlWithCrop={handleAddImageFromUrlWithCrop}
          onPanToggle={() => canvasRef.current?.activatePanMode()}
          onRenameBoard={() => setIsRenameBoardDialogOpen(true)}
          onDeleteBoard={handleDeleteBoard}
          onDeleteAllUserImages={deleteAllUserImages}
          isListening={isListening}
          onToggleDictation={toggleListening}
          onOpenNotepad={handleOpenNotepad}
          onLocateElement={handleLocateElement}
          onAddComment={handleAddMarker}
          updateElement={updateElement}
          selectedElementIds={selectedElementIds}
          addElement={addElement}
          selectElement={handleSelectElement}
          clearCanvas={() => clearCanvas(elements)}
          onExportBoardToPng={handleExportToPng}
          onFormatToggle={() => setIsFormatToolbarOpen(p => !p)}
          isFormatToolbarOpen={isFormatToolbarOpen}
          onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          canvasScrollPosition={canvasRef.current?.getTransform().x || 0}
          canvasScale={canvasRef.current?.getTransform().scale || 1}
          isGalleryPanelOpen={isGalleryOpen}
          onToggleGalleryPanel={() => setIsGalleryOpen(prev => !prev)}
        />

        <FormattingToolbar
          isOpen={isFormatToolbarOpen}
          onClose={() => setIsFormatToolbarOpen(false)}
          elements={selectedElement ? [selectedElement] : []}
          onAddComment={handleAddMarker}
          onEditComment={handleEditComment}
          isMobileSheet={isMobile}
          onLocateElement={handleLocateElement}
          onPanToggle={() => { setIsPanningActive(p => !p); canvasRef.current?.activatePanMode(); }}
          addElement={addElement}
          isPanningActive={isPanningActive}
          selectedElement={selectedElement}
          onUpdateElement={updateElement}
        />

        <ChangeFormatDialog
          isOpen={changeFormatDialogOpen}
          onOpenChange={setChangeFormatDialogOpen}
          notepad={selectedNotepadForFormat}
          onSaveFormat={handleSaveFormat}
        />

        <AddImageFromUrlDialog
          isOpen={isImageUrlDialogOpen}
          onOpenChange={setIsImageUrlDialogOpen}
          onAddImage={async (url) => {
            if (shouldOpenCropAfterUrl) {
              // Para "Desde URL + Crop": abrir diálogo de crop
              setImageToCrop(url);
              setIsImageCropDialogOpen(true);
              setShouldOpenCropAfterUrl(false);
            } else {
              // Para "Desde URL" normal: agregar imagen directamente
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


        {/* Panel lateral Galería */}
        <div
          key={`gallery-panel-${isGalleryOpen ? 'open' : 'closed'}`}
          className="fixed left-0 top-0 h-screen flex items-center"
          style={{ zIndex: isGalleryOpen ? 999 : -1 }}
        >
          {/* Panel completo */}
          <div
            className={`
              h-full bg-white shadow-2xl border-r border-gray-200
              transition-all duration-300 ease-in-out
              ${isGalleryOpen ? 'w-96' : 'w-0 overflow-hidden'}
            `}
            style={{
              zIndex: isGalleryOpen ? 999 : -1,
              backgroundColor: 'white',
              border: '1px solid #e5e7eb'
            }}
          >
                <div className="h-full flex flex-col">
                  <div className="flex-1 overflow-hidden">
                    <GalleryElement
                      {...galleryElement}
                      scale={1}
                      offset={{ x: 0, y: 0 }}
                      isSelected={false}
                      onSelectElement={() => {}}
                      onUpdate={updateElement}
                      deleteElement={deleteElement}
                      onEditElement={() => {}}
                      allElements={elements}
                      addElement={addElement}
                      onUploadImage={handleUploadImage}
                      storage={storage}
                      userId={user?.uid}
                      onLocateElement={() => {}}
                      onEditComment={() => {}}
                    />
                  </div>
                </div>
              </div>
        </div>

        {/* Pestaña con flecha - siempre visible */}
        <button
          onClick={() => setIsGalleryOpen(!isGalleryOpen)}
          className="fixed left-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-12 bg-[#bad324] hover:bg-[#a8c42a] rounded-r-lg shadow-md transition-all duration-200"
          style={{ zIndex: 1000 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-300 ${isGalleryOpen ? 'rotate-180' : 'rotate-0'}`}
          >
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>

      </div>

        </>
      )}
    </>
  );
}
