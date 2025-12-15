'use client';

import { useParams } from 'next/navigation';
import BoardPageClient from './BoardPageClient';
import { Loader2 } from 'lucide-react';

export default function BoardPage() {
  const params = useParams();
  const boardId = params?.boardId as string;

  // Si no hay boardId, mostrar loading (esto pasa brevemente durante hidratación)
  if (!boardId) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        <p className="mt-4 text-lg font-semibold text-slate-900">Cargando tablero...</p>
      </div>
    );
  }

  return <BoardPageClient boardId={boardId} />;
}
