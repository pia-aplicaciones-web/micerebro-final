'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';

// Error boundary para componentes individuales
class ErrorBoundary extends React.Component<
  { componentName: string; children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ERROR BOUNDARY] ${this.props.componentName}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-red-500 text-sm p-2 border border-red-300 rounded bg-red-50">
          Error en {this.props.componentName}: {this.state.error?.message}
        </div>
      );
    }
    return this.props.children;
  }
}
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
import { WithId, CanvasElement, Board, ElementType } from '@/lib/types';
import html2canvas from 'html2canvas';

// Componentes del Canvas
import Canvas from '@/components/canvas/canvas';
import ToolsSidebar from '@/components/canvas/tools-sidebar';
import FormattingToolbar from '@/components/canvas/formatting-toolbar';

// Diálogos
import AddImageFromUrlDialog from '@/components/canvas/elements/add-image-from-url-dialog';
import ChangeFormatDialog from '@/components/canvas/change-format-dialog';
import EditCommentDialog from '@/components/canvas/elements/edit-comment-dialog';
import RenameBoardDialog from '@/components/canvas/rename-board-dialog';
import BoardTitleDisplay from '@/components/canvas/board-title-display';
import GlobalSearch from '@/components/canvas/global-search';
// QuickAddTask movido al menú principal (tools-sidebar.tsx)
// import QuickAddTask from '@/components/canvas/quick-add-task';

// Hook de dictado
import { useDictation } from '@/hooks/use-dictation';

interface BoardPageClientProps {
  boardId: string;
}

type AuthUser = {
  uid?: string;
  isAnonymous?: boolean;
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
  
  const authCheckRef = useRef(false);

  // CRÍTICO: Verificar autenticación - simplificado
  useEffect(() => {
    if (authCheckRef.current) return;
    if (authLoading) return; // Esperar a que auth termine de cargar

    // Necesitamos el usuario real de AuthContext para operar; si no está, esperar
    if (!user?.uid) {
      console.log('⏸️ Sin usuario aún; esperando AuthContext...');
      return;
    }
  }, [user, authLoading]);
  
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

  // CRÍTICO: Cleanup del listener cuando el componente se desmonta o cambia boardId
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [boardId]);

  // Estado local
  const { boards, handleRenameBoard, handleDeleteBoard, clearCanvas } = useBoardState(boardId);
  const canvasRef = useRef<any>(null);
  
  // Estados de UI
  const [isFormatToolbarOpen, setIsFormatToolbarOpen] = useState(true);
  const [isImageUrlDialogOpen, setIsImageUrlDialogOpen] = useState(false);
  const [changeFormatDialogOpen, setChangeFormatDialogOpen] = useState(false);
  const [isPanningActive, setIsPanningActive] = useState(false);
  const [isRenameBoardDialogOpen, setIsRenameBoardDialogOpen] = useState(false);
  
  // Estados de Selección
  const [selectedElement, setSelectedElement] = useState<WithId<CanvasElement> | null>(null);
  const [activatedElementId, setActivatedElementId] = useState<string | null>(null);
  const [selectedNotepadForFormat, setSelectedNotepadForFormat] = useState<WithId<CanvasElement> | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditCommentDialogOpen, setIsEditCommentDialogOpen] = useState(false);
  const [selectedCommentForEdit, setSelectedCommentForEdit] = useState<WithId<CanvasElement> | null>(null);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // Dictado
  const {
    isListening: isDictationListening,
    finalTranscript,
    interimTranscript,
    toggle: toggleDictation,
    stop: stopDictation,
  } = useDictation();
  const liveTranscript = interimTranscript
    ? `${finalTranscript} ${interimTranscript}`.trim()
    : finalTranscript;
  
  // Insertar texto dictado en el elemento activo (contentEditable o input/textarea)
  const lastFinalHandledRef = useRef<string>('');
  useEffect(() => {
    if (!isDictationListening) return;
    if (!finalTranscript) return;
    if (finalTranscript === lastFinalHandledRef.current) return;
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;
    const text = finalTranscript.replace(lastFinalHandledRef.current, '').trim();
    if (!text) return;
    const suffix = text.endsWith(' ') ? '' : ' ';
    try {
      if (active.isContentEditable) {
        document.execCommand('insertText', false, text + suffix);
        active.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
        const start = active.selectionStart ?? active.value.length;
        const end = active.selectionEnd ?? active.value.length;
        const before = active.value.slice(0, start);
        const after = active.value.slice(end);
        active.value = before + text + suffix + after;
        const newPos = start + text.length + suffix.length;
        active.selectionStart = active.selectionEnd = newPos;
        active.dispatchEvent(new Event('input', { bubbles: true }));
        active.dispatchEvent(new Event('change', { bubbles: true }));
      }
    } catch (err) {
      console.error('No se pudo insertar dictado', err);
      stopDictation();
    }
    lastFinalHandledRef.current = finalTranscript;
  }, [finalTranscript, isDictationListening, stopDictation]);

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
    console.log('🚀 [BoardPageClient] useEffect de carga de tablero ejecutándose:', { boardId, userUid: user?.uid, authLoading, isAnonymous: user?.isAnonymous });

    // Guard: Verificar condiciones básicas
    if (typeof window === 'undefined' || !boardId) {
      console.log('⏸️ [BoardPageClient] Guards básicos fallaron:', { window: typeof window, boardId });
      return;
    }

    // Solo usar userId real de AuthContext
    const effectiveUserId = user?.uid;

    if (!effectiveUserId) {
      if (authLoading) {
        console.log('⏸️ Auth cargando, esperando...');
        return;
      }
      console.log('❌ No hay userId disponible');
      return;
    }

    console.log('🔍 Effective userId:', effectiveUserId);

    // Guard: Prevenir llamadas múltiples si ya está cargando o ya se cargó este tablero
    if (isLoadingRef.current) {
      console.log('⏸️ [BoardPageClient] Ya hay una carga en progreso, ignorando...');
      return;
    }

    // Guard: Si ya se cargó este mismo tablero para este usuario, no volver a cargar
    if (hasLoadedRef.current && currentBoardIdRef.current === boardId && currentUserIdRef.current === effectiveUserId) {
      console.log('⏸️ [BoardPageClient] Tablero ya cargado:', boardId);
      return;
    }

    // Guard: Si auth está cargando, esperar
    if (authLoading) {
      console.log('⏸️ [BoardPageClient] Auth aún cargando, esperando...');
      return;
    }

    // Marcar como cargando ANTES de hacer la llamada
    isLoadingRef.current = true;
    hasLoadedRef.current = true;
    currentBoardIdRef.current = boardId;
    currentUserIdRef.current = effectiveUserId;

    console.log('📂 [BoardPageClient] Cargando tablero:', boardId, 'para usuario:', effectiveUserId);

    const loadPromise = boardId === 'new'
      ? createBoardRef.current?.(effectiveUserId)
      : loadBoardRef.current?.(boardId, effectiveUserId);

    if (!loadPromise) {
      console.error('❌ [BoardPageClient] No se pudo obtener función de carga');
      isLoadingRef.current = false;
      hasLoadedRef.current = false;
      return;
    }

    console.log('🔄 [BoardPageClient] Ejecutando promesa de carga...');
    loadPromise
      .then((result: any) => {
        console.log('✅ [BoardPageClient] Promesa de carga completada:', result);
        isLoadingRef.current = false;
        if (boardId === 'new' && result) {
          console.log('✅ [BoardPageClient] Tablero creado:', result);
          router.push(`/board/${result}/`);
        } else {
          console.log('✅ [BoardPageClient] Tablero cargado exitosamente');
        }
      })
      .catch((err: any) => {
        console.error('❌ [BoardPageClient] Error en promesa de carga:', err);
        console.error('❌ [BoardPageClient] Detalles del error:', { message: err?.message, stack: err?.stack });

        // Manejo de permisos: si no puedes leer el tablero, crea uno nuevo para este usuario y redirige
        const isPermError = err?.code === 'permission-denied' || (err?.message || '').toLowerCase().includes('insufficient permissions');
        const targetUserId = user?.uid || localStorage.getItem('currentUserId');
        if (isPermError && targetUserId) {
          console.warn('⚠️ [BoardPageClient] Permiso denegado. Creando tablero nuevo para el usuario actual...');
          createBoardRef.current?.(targetUserId)
            ?.then((newId: string) => {
              if (newId) {
                console.log('✅ [BoardPageClient] Nuevo tablero creado por falta de permisos:', newId);
                router.push(`/board/${newId}/`);
              }
            })
            .catch((createErr: any) => {
              console.error('❌ [BoardPageClient] Error al crear tablero tras permiso denegado:', createErr);
            });
        }

        isLoadingRef.current = false;
        hasLoadedRef.current = false;
        currentBoardIdRef.current = null;
        currentUserIdRef.current = null;
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
      try {
        const result = await uploadFile(file, userId, storage);
        if (result.success) {
          await addElement('image', { content: { url: result.url }, properties: { size: { width: 300, height: 200 } } });
          toast({ title: 'Imagen subida' });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: result.error });
        }
      } catch {
        toast({ variant: 'destructive', title: 'Error al subir imagen' });
      }
    };
    input.click();
  }, [user, storage, addElement, toast]);

  // Ref para almacenar el ID pendiente de localizar (para elementos recién creados)
  const pendingLocateRef = useRef<string | null>(null);

  const handleLocateElement = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el && canvasRef.current) {
      try {
        // Validar datos antes de centrar
        const props = (el as any).properties;
        const pos = props?.position ?? { x: el.x, y: el.y };
        const size = props?.size ?? { width: el.width, height: el.height };
        const x = Number(pos?.x);
        const y = Number(pos?.y);
        const w = Number(size?.width);
        const h = Number(size?.height);
        if ([x, y, w, h].some(v => !Number.isFinite(v))) {
          console.error('[AUDITORÍA] Localizador con datos inválidos, no se puede centrar:', { id, pos, size });
          pendingLocateRef.current = null;
          return;
        }
        handleSelectElement(id);
        canvasRef.current.centerOnElement(el);
        pendingLocateRef.current = null;
      } catch (err) {
        console.error('[AUDITORÍA] Error al centrar localizador', id, err);
        pendingLocateRef.current = null;
      }
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
        canvasRef.current.centerOnElement(el);
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

  const handleSaveFormat = useCallback((id: string, format: 'letter' | '10x15') => {
    const size = format === 'letter' ? { width: 794, height: 1021 } : { width: 378, height: 567 };
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

  const handleAddElement = useCallback(
    async (type: ElementType, props?: any) => {
      const centerPoint = canvasRef.current?.getViewportCenter?.();
      const mergedProps = {
        ...props,
        properties: {
          ...(props?.properties || {}),
          ...(centerPoint ? { position: props?.properties?.position || centerPoint } : {}),
        },
      };
      return addElement(type, mergedProps);
    },
    [addElement]
  );

  // Menú mejoras: acciones rápidas para elementos especiales
  const handleAddHabitTracker = useCallback(async () => {
    try {
      await addElement('habit-tracker', {
        content: { title: 'Mis Hábitos', habits: [] },
      } as any);
      toast({ title: 'Habit Tracker agregado', description: 'Busca el nuevo bloque en el lienzo.' });
    } catch (err) {
      console.error('No se pudo crear Habit Tracker', err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear Habit Tracker' });
    }
  }, [addElement, toast]);

  const handleAddEisenhower = useCallback(async () => {
    try {
      await addElement('eisenhower-matrix', {
        content: {
          quadrants: { do: [], schedule: [], delegate: [], eliminate: [] },
        },
      } as any);
      toast({ title: 'Matriz Eisenhower agregada', description: 'Busca el nuevo bloque en el lienzo.' });
    } catch (err) {
      console.error('No se pudo crear Matriz Eisenhower', err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la matriz' });
    }
  }, [addElement, toast]);

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

  // Crear localizador (reemplaza antiguo "comment")
  const handleAddMarker = useCallback(async () => {
    try {
      const viewportCenter = getViewportCenter();
      await addElement('locator', {
        content: { label: 'Localizador' },
        properties: { position: viewportCenter, size: { width: 48, height: 48 } },
      });
      toast({ title: 'Localizador creado', description: 'Busca el pin negro en el tablero.' });
    } catch (err) {
      console.error('Error al crear localizador', err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el localizador' });
    }
  }, [addElement, getViewportCenter, toast]);

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
        <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <>
      <RenameBoardDialog
        isOpen={isRenameBoardDialogOpen}
        onOpenChange={setIsRenameBoardDialogOpen}
        currentBoardName={board?.name || ''}
        onSave={(name) => { handleRenameBoard(name); setIsRenameBoardDialogOpen(false); }}
      />
      
      <div className="h-screen w-screen relative overflow-hidden">
        {/* Nombre del tablero en esquina superior izquierda */}
        <BoardTitleDisplay name={board?.name || ""} />

        <Canvas
          ref={canvasRef}
          elements={elements as WithId<CanvasElement>[]}
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
          isListening={isDictationListening}
          liveTranscript={liveTranscript}
          finalTranscript={finalTranscript}
          interimTranscript={interimTranscript}
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
        />
        
        <ErrorBoundary componentName="ToolsSidebar">
          <ToolsSidebar
            elements={elements || []}
            boards={boards || []}
            onUploadImage={handleUploadImage}
            onAddImageFromUrl={() => setIsImageUrlDialogOpen(true)}
            onPanToggle={() => canvasRef.current?.activatePanMode()}
            onRenameBoard={() => setIsRenameBoardDialogOpen(true)}
            onDeleteBoard={handleDeleteBoard}
            isListening={isDictationListening}
            onToggleDictation={toggleDictation}
            onOpenNotepad={handleOpenNotepad}
            onLocateElement={handleLocateElement}
            onAddComment={handleAddMarker}
            updateElement={updateElement}
            selectedElementIds={selectedElementIds}
            addElement={addElement}
            clearCanvas={() => clearCanvas(elements)}
            onExportBoardToPng={handleExportToPng}
            onFormatToggle={() => setIsFormatToolbarOpen(p => !p)}
            isFormatToolbarOpen={isFormatToolbarOpen}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
          />
        </ErrorBoundary>

        {/* Menú 3 horizontal flotante para mejoras - DESHABILITADO TEMPORALMENTE POR ERRORES */}
        {/*
        <ErrorBoundary componentName="FloatingMenu">
          <TooltipProvider>
            <Rnd
            default={{ x: 120, y: 60, width: 520, height: 'auto' }}
            bounds="window"
            dragHandleClassName="menu3-drag"
            enableResizing={false}
            className="z-[60050]"
          >
            <div className="bg-black/90 text-white rounded-xl shadow-2xl border border-white/20 px-3 py-2">
              <div className="menu3-drag flex items-center gap-2 cursor-grab active:cursor-grabbing pb-2 border-b border-white/20">
                <GripVertical className="w-4 h-4 text-white/70" />
                <span className="text-xs font-semibold">Mejoras</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {[
                  { label: 'Habit Tracker', icon: Sparkles, action: handleAddHabitTracker, tip: 'Crear bloque de hábitos' },
                  { label: 'Eisenhower', icon: ClipboardList, action: handleAddEisenhower, tip: 'Matriz urgente/importante' },
                  { label: 'Brain Dump', icon: Brain, action: () => handleAddElement('brain-dump'), tip: 'Caja de vaciado mental' },
                  { label: 'Gratitud', icon: Heart, action: () => handleAddElement('gratitude-journal'), tip: 'Diario de gratitud' },
                  {
                    label: 'Sticker',
                    icon: Tag,
                    action: () => {}, // manejado por el popover
                    tip: 'Añadir sticker decorativo',
                    dropdown: true,
                  },
                  { label: 'Fecha/Hora', icon: CalendarClock, action: () => handleAddElement('datetime-widget'), tip: 'Widget de fecha/hora' },
                ].map((item) => {
                  try {
                    const Icon = item.icon;
                    if (!Icon) return null;
                    const key = item.label;
                    const handleClick = async () => {
                      try {
                        if (typeof item.action === 'function') {
                          await item.action();
                        }
                      } catch (err) {
                        console.error('[FloatingMenu] Error ejecutando acción', key, err);
                      }
                    };
                    return item.dropdown ? (
                      <Popover key={key}>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/15 text-xs font-medium">
                            <Icon className="h-4 w-4 text-white" />
                            <span className="text-white">{item.label}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 bg-white text-slate-800 border border-slate-200 shadow-lg">
                          <div className="text-xs font-semibold mb-2">Stickers</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'star', color: '#FFD700', category: 'productivity' },
                              { id: 'heart', color: '#E91E63', category: 'emotions' },
                              { id: 'smile', color: '#FFEB3B', category: 'emotions' },
                              { id: 'check', color: '#4CAF50', category: 'productivity' },
                              { id: 'fire', color: '#FF6B6B', category: 'productivity' },
                              { id: 'lightning', color: '#FF9800', category: 'productivity' },
                            ].map((stk) => (
                              <button
                                key={stk.id}
                                className="h-10 rounded-lg border border-slate-200 hover:border-slate-400 flex items-center justify-center text-xs"
                                style={{ color: stk.color }}
                                onClick={() =>
                                  handleAddElement('sticker', {
                                    content: { stickerId: stk.id, category: stk.category, color: stk.color },
                                  })
                                }
                              >
                                {stk.id}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={handleClick}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/15 text-xs font-medium"
                          >
                            <Icon className="h-4 w-4 text-white" />
                            <span className="text-white">{item.label}</span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-black text-white border border-neutral-700">
                          <p>{item.tip}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  } catch (err) {
                    console.error('[FloatingMenu] Error renderizando ítem', item?.label, err);
                    return null;
                  }
                })}
              </div>
            </div>
          </Rnd>
        </TooltipProvider>
        </ErrorBoundary>
        */}

        {/* HiddenElementsMenu DESHABILITADO TEMPORALMENTE POR ERRORES */}
        {/* <HiddenElementsMenu addElement={handleAddElement} defaultOpen /> */}

        <ErrorBoundary componentName="FormattingToolbar">
          <FormattingToolbar
            isOpen={isFormatToolbarOpen}
            onClose={() => setIsFormatToolbarOpen(false)}
            onAddComment={handleAddMarker}
            onEditComment={handleEditComment}
            isMobileSheet={isMobile}
            onLocateElement={handleLocateElement}
            onPanToggle={() => { setIsPanningActive(p => !p); canvasRef.current?.activatePanMode(); }}
            addElement={addElement}
            isPanningActive={isPanningActive}
            selectedElement={selectedElement}
          />
        </ErrorBoundary>

        <ErrorBoundary componentName="ChangeFormatDialog">
          <ChangeFormatDialog
            isOpen={changeFormatDialogOpen}
            onOpenChange={setChangeFormatDialogOpen}
            notepad={selectedNotepadForFormat}
            onSaveFormat={handleSaveFormat}
          />
        </ErrorBoundary>

        <ErrorBoundary componentName="AddImageFromUrlDialog">
          <AddImageFromUrlDialog
            isOpen={isImageUrlDialogOpen}
            onOpenChange={setIsImageUrlDialogOpen}
            onAddImage={async (url) => {
              await addElement('image', { content: { url }, properties: { size: { width: 300, height: 200 } } });
              setIsImageUrlDialogOpen(false);
            }}
          />
        </ErrorBoundary>

        {/* EditCommentDialog ya no se usa para localizadores */}

        <ErrorBoundary componentName="GlobalSearch">
          <GlobalSearch
            elements={elements || []}
            isOpen={isGlobalSearchOpen}
            onClose={() => setIsGlobalSearchOpen(false)}
            onLocateElement={handleLocateElement}
          />
        </ErrorBoundary>

        {/* QuickAddTask movido al menú principal (tools-sidebar.tsx) */}
      </div>
    </>
  );
}
