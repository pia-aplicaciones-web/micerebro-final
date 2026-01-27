import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import MobileBoardClient from '@/components/canvas/mobile/mobile-board-client';
import { useAuthContext } from '@/context/AuthContext';
import { useBoardStore } from '@/lib/store/boardStore';

const MobilePage = ({ params }) => {
  const router = useRouter();
  const { user, authLoading } = useAuthContext();
  const { loadBoard, createBoard } = useBoardStore();

  const [resolvedBoardId, setResolvedBoardId] = useState(null);
  const [isLoadingBoardResolution, setIsLoadingBoardResolution] = useState(true);

  useEffect(() => {
    const resolveBoard = async () => {
      console.log('useEffect: Iniciando resolveBoard');
      setIsLoadingBoardResolution(true);
      if (params.boardId === 'auto-load-board') {
        console.log('useEffect: boardId es auto-load-board');
        console.log('useEffect: authLoading:', authLoading, 'user:', user);
        if (!authLoading && user) {
          console.log('useEffect: Usuario autenticado, intentando cargar/crear tablero.');
          try {
            let boardToLoad = await loadBoard(user.uid);
            if (!boardToLoad) {
              console.log('useEffect: No se encontró tablero, creando uno nuevo.');
              boardToLoad = await createBoard(user.uid);
            }
            if (boardToLoad?.id) {
              console.log('useEffect: Tablero resuelto con ID:', boardToLoad.id);
              setResolvedBoardId(boardToLoad.id);
              router.replace(`/movil/board/${boardToLoad.id}`);
              console.log('useEffect: Redirección a:', `/movil/board/${boardToLoad.id}`);
            } else {
              console.error('Failed to load or create a board for the user.');
              setIsLoadingBoardResolution(false);
            }
          } catch (error) {
            console.error('Error resolving mobile board:', error);
            setIsLoadingBoardResolution(false);
          }
        } else if (!authLoading && !user) {
          console.log('useEffect: Usuario no autenticado.');
          setIsLoadingBoardResolution(false);
          // Si no hay usuario y no se redirige a login, ¿qué esperamos?
          // Podríamos redirigir a una página de inicio de sesión aquí si es necesario.
        }
      } else {
        console.log('useEffect: boardId es real:', params.boardId);
        setResolvedBoardId(params.boardId);
        setIsLoadingBoardResolution(false);
      }
      console.log('useEffect: Finalizando resolveBoard');
    };

    resolveBoard();
  }, [params.boardId, user, authLoading, loadBoard, createBoard, router]);

  console.log('Render: isLoadingBoardResolution:', isLoadingBoardResolution, 'authLoading:', authLoading, 'resolvedBoardId:', resolvedBoardId);

  if (isLoadingBoardResolution || authLoading || !resolvedBoardId) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <MobileBoardClient boardId={resolvedBoardId} />
  );
};

export default MobilePage;