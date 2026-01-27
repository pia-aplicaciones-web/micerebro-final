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
      setIsLoadingBoardResolution(true);
      if (params.boardId === 'auto-load-board') {
        if (!authLoading && user) {
          try {
            let boardToLoad = await loadBoard(user.uid);
            if (!boardToLoad) {
              boardToLoad = await createBoard(user.uid);
            }
            if (boardToLoad?.id) {
              setResolvedBoardId(boardToLoad.id);
              router.replace(`/movil/board/${boardToLoad.id}`);
            } else {
              // Fallback if somehow no board is loaded or created
              console.error('Failed to load or create a board for the user.');
              setIsLoadingBoardResolution(false);
            }
          } catch (error) {
            console.error('Error resolving mobile board:', error);
            setIsLoadingBoardResolution(false);
          }
        } else if (!authLoading && !user) {
          // If not authenticated, redirect to login or a public board
          // For now, let's just stop loading and let the client render
          setIsLoadingBoardResolution(false);
        }
      } else {
        setResolvedBoardId(params.boardId);
        setIsLoadingBoardResolution(false);
      }
    };

    resolveBoard();
  }, [params.boardId, user, authLoading, loadBoard, createBoard, router]);

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