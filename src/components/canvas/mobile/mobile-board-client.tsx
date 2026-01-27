'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Menu, X as CloseIcon } from 'lucide-react';

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
import { WithId, CanvasElement, Board } from '@/lib/types';

// Componentes del Canvas
import MobileMenu from '@/components/canvas/mobile-menu';
import { Button } from '@/components/ui/button';

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

  // Aquí iría la lógica de carga de tablero similar a BoardPageClient
  // Por simplicidad, por ahora solo mostraremos un mensaje
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
    <div className="relative h-screen w-screen bg-[#96e4e6] flex flex-col items-center justify-start p-4">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Vista Móvil del Tablero</h1>
      <p className="text-slate-700 mb-8">Board ID: {boardId}</p>

      {/* Botón para abrir el MobileMenu */}
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

      <p className="text-slate-500 mt-4">Contenido del tablero móvil por diseñar...</p>
      {/* Aquí irá el contenido específico para móvil */}
    </div>
  );
}
