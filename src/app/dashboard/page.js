'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser } from '@/firebase/provider';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  
  // Guards para prevenir llamadas múltiples
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    // Guard: Prevenir ejecución múltiple
    if (hasLoadedRef.current || isLoadingRef.current) {
      console.log('⏸️ Dashboard ya procesado o en progreso, ignorando...');
      return;
    }
    
    // Guard: Esperar a que termine la carga de usuario
    if (isUserLoading) {
      console.log('⏸️ Usuario aún cargando, esperando...');
      return;
    }
    
    // Guard: Si no hay usuario, redirigir
    if (!user) {
      console.log('⏸️ No hay usuario, redirigiendo a inicio...');
      router.push('/');
      return;
    }
    
    // Guard: Si ya procesamos este usuario, no volver a procesar
    if (currentUserIdRef.current === user.uid) {
      console.log('⏸️ Usuario ya procesado:', user.uid);
      return;
    }
    
    // Guard: Verificar que firestore esté disponible
    if (!firestore) {
      console.log('⏸️ Firestore no disponible, esperando...');
      return;
    }

    // Marcar como cargando ANTES de hacer la llamada
    isLoadingRef.current = true;
    currentUserIdRef.current = user.uid;
    
    const loadDashboard = async () => {
      try {
        console.log('📂 Cargando dashboard para usuario:', user.uid);
        const boardsCollection = collection(firestore, 'users', user.uid, 'canvasBoards');
        const q = query(boardsCollection, orderBy('updatedAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const boardId = snapshot.docs[0].id;
          console.log('✅ Tablero encontrado:', boardId);
          hasLoadedRef.current = true;
          isLoadingRef.current = false;
          router.push(`/board/${boardId}/`);
        } else {
          console.log('⏸️ No hay tableros, redirigiendo a inicio...');
          hasLoadedRef.current = true;
          isLoadingRef.current = false;
          router.push('/');
        }
      } catch (error) {
        console.error('❌ Error cargando tablero:', error);
        hasLoadedRef.current = false;
        isLoadingRef.current = false;
        currentUserIdRef.current = null;
        router.push('/');
      }
    };

    loadDashboard();
  }, [user, isUserLoading, firestore, router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
      <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      <p className="mt-4 text-lg font-semibold text-slate-900">Cargando tu tablero...</p>
    </div>
  );
}

