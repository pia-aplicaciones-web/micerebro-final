'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { signInWithGoogle, signInWithEmail, createUserWithEmail } from '@/lib/auth';
import { getDocuments, createDocument, getDocument, setDocument } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EmailAuthDialog from '@/components/auth/email-auth-dialog';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const { toast } = useToast();
  
  const [emailAuthDialogOpen, setEmailAuthDialogOpen] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState('login');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  
  const hasProcessedRef = useRef(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!authLoading && user && !isRedirecting) {
      redirectToBoard(user);
    }
  }, [user, authLoading, isRedirecting]);

  // Función para redirigir al tablero
  const redirectToBoard = useCallback(async (userToProcess) => {
    if (hasProcessedRef.current || isRedirecting) return;
    
    hasProcessedRef.current = true;
    setIsRedirecting(true);
    
    try {
      // Asegurar documento de usuario
      const userDoc = await getDocument('users', userToProcess.uid);
      
      if (!userDoc) {
        await setDocument('users', userToProcess.uid, {
          uid: userToProcess.uid,
          email: userToProcess.email,
          displayName: userToProcess.displayName || 'Invitado',
        });
      }

      // Buscar tablero existente
      const boardsCollection = `users/${userToProcess.uid}/canvasBoards`;
      let boardId = null;
      
      try {
        const boards = await getDocuments(boardsCollection, [
          { type: 'orderBy', field: 'updatedAt', direction: 'desc' },
          { type: 'limit', value: 1 }
        ]);
        if (boards.length > 0) {
          boardId = boards[0].id;
        }
      } catch {
        // Si falla orderBy, buscar sin orden
        const boards = await getDocuments(boardsCollection);
        if (boards.length > 0) {
          boardId = boards[0].id;
        }
      }

      // Si no hay tablero, crear uno
      if (!boardId) {
        boardId = await createDocument(boardsCollection, {
          name: 'Mi Primer Tablero',
          userId: userToProcess.uid,
        });
        toast({ title: '¡Bienvenido!', description: 'Hemos creado tu primer tablero.' });
      }

      // Redirigir directamente sin flags innecesarios
      console.log('🚀 Redirigiendo a:', `/board/${boardId}/`);
      router.push(`/board/${boardId}/`);
      
    } catch (error) {
      console.error('Error:', error);
      hasProcessedRef.current = false;
      setIsRedirecting(false);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el tablero.' });
    }
  }, [isRedirecting, router, toast]);

  // Handler de login con Google
  const handleGoogleLogin = useCallback(async () => {
    console.log('🔵 handleGoogleLogin llamado', { isLoggingIn, authLoading });
    if (isLoggingIn) {
      console.log('⚠️ Ya está iniciando sesión, ignorando click');
      return;
    }
    
    setIsLoggingIn(true);
    hasProcessedRef.current = false;
    
    try {
      console.log('🔄 Iniciando login Google...');
      const result = await signInWithGoogle();
      console.log('✅ Login exitoso:', result?.user?.email);
      if (result?.user) {
        await redirectToBoard(result.user);
      }
    } catch (error) {
      console.error('❌ Error login Google:', error);
      console.error('❌ Error completo:', JSON.stringify(error, null, 2));
      const errorMessage = error?.message || error?.toString() || 'Error al iniciar sesión.';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
      setIsLoggingIn(false);
    }
  }, [isLoggingIn, authLoading, redirectToBoard, toast]);

  // Handler de login con email
  const handleEmailAuth = useCallback(async (email, password) => {
    hasProcessedRef.current = false;
    
    try {
      const result = emailAuthMode === 'login' 
        ? await signInWithEmail(email, password)
        : await createUserWithEmail(email, password);
      
      if (result?.user) {
        await redirectToBoard(result.user);
      }
    } catch (error) {
      throw error;
    }
  }, [emailAuthMode, redirectToBoard]);

  // Loading mientras Firebase se inicializa
  const isFirebaseLoading = authLoading;

  // Mostrar loading si está redirigiendo
  if (isRedirecting || (isLoggingIn && hasProcessedRef.current)) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        <p className="mt-4 text-lg font-semibold text-slate-900">Cargando tu tablero...</p>
      </div>
    );
  }

  // Página de login
  return (
    <>
      <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <div className="w-full max-w-md px-6">
          {/* Logo */}
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="h-16 w-16 bg-black rounded-full flex items-center justify-center mb-4 shadow-lg">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ffaa" />
                    <stop offset="50%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#0066ff" />
                  </linearGradient>
                </defs>
                <path d="M6 18C6 14 8 12 12 12C14 12 16 13 18 14C20 15 22 16 24 16C26 16 28 15 30 14C32 13 34 14 34 18C34 22 32 24 30 24C28 24 26 23 24 22C22 21 20 20 18 20C16 20 14 21 12 22C10 23 8 22 6 18Z" fill="url(#logoGradient)"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Mi cerebro</h1>
            <p className="text-slate-500 text-lg">Tu lienzo de ideas infinitas.</p>
          </div>

          {/* Tarjeta Login */}
          <div className="bg-white p-8 rounded-2xl shadow-xl">
            {isFirebaseLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="mt-4 text-slate-500">Inicializando...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🟢 Botón Google clickeado');
                    handleGoogleLogin();
                  }} 
                  disabled={isLoggingIn || isFirebaseLoading} 
                  size="lg" 
                  className="w-full"
                  type="button"
                >
                  {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : (
                    <img src="/google-logo.svg" alt="Google" width={20} height={20} className="mr-2" />
                  )}
                  {isLoggingIn ? 'Iniciando...' : 'Iniciar con Google'}
                </Button>

              </div>
            )}

            <div className="mt-6 text-center space-x-2">
              <button 
                onClick={() => { setEmailAuthMode('login'); setEmailAuthDialogOpen(true); }}
                className="text-blue-600 hover:text-blue-700 underline text-sm"
                type="button"
                disabled={isFirebaseLoading}
              >
                Log in
              </button>
              <span className="text-slate-400">/</span>
              <button 
                onClick={() => { setEmailAuthMode('signup'); setEmailAuthDialogOpen(true); }}
                className="text-blue-600 hover:text-blue-700 underline text-sm"
                type="button"
                disabled={isFirebaseLoading}
              >
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      </div>

      <EmailAuthDialog
        isOpen={emailAuthDialogOpen}
        onOpenChange={setEmailAuthDialogOpen}
        mode={emailAuthMode}
        onAuth={handleEmailAuth}
      />
    </>
  );
}

