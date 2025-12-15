'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, limit, orderBy, doc, setDoc, getDoc, query } from 'firebase/firestore';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { signInWithGoogle, signInWithEmail, createUserWithEmail } from '@/lib/auth';
import { getFirebaseFirestore } from '@/lib/firebase';

export default function HomePage() {
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const hasProcessedRef = useRef(false);

  // Función para redirigir al tablero
  const redirectToBoard = useCallback(async (user) => {
    if (hasProcessedRef.current || isRedirecting) return;

    hasProcessedRef.current = true;
    setIsRedirecting(true);

    try {
      // Si es invitado, crear un tablero temporal sin persistencia
      if (user.isGuest) {
        const boardId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Guardar información temporal del invitado en localStorage
        localStorage.setItem('guestUser', JSON.stringify({
          uid: user.uid,
          displayName: user.displayName,
          boardId: boardId,
          createdAt: new Date().toISOString()
        }));

        window.location.href = `/board/${boardId}/`;
        return;
      }

      // Para usuarios autenticados, usar Firestore normalmente
      const firestore = getFirebaseFirestore();
      if (!firestore) throw new Error('Firestore no disponible');

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Invitado',
          createdAt: serverTimestamp(),
        });
      }

      const boardsCollection = collection(firestore, 'users', user.uid, 'canvasBoards');
      let boardId = null;

      try {
        const q = query(boardsCollection, orderBy('updatedAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          boardId = snapshot.docs[0].id;
        }
      } catch {
        const snapshot = await getDocs(boardsCollection);
        if (!snapshot.empty) {
          boardId = snapshot.docs[0].id;
        }
      }

      if (!boardId) {
        const newBoard = await addDoc(boardsCollection, {
          name: 'Mi Primer Tablero',
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        boardId = newBoard.id;
      }

      window.location.href = `/board/${boardId}/`;

    } catch (error) {
      console.error('Error:', error);
      hasProcessedRef.current = false;
      setIsRedirecting(false);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el tablero.' });
    }
  }, [isRedirecting, toast]);

  // Verificar usuario existente al cargar
  useEffect(() => {
    const checkAuth = async () => {
      if (hasProcessedRef.current) return;

      try {
        // Aquí podríamos verificar si ya hay un usuario autenticado
        // Pero esto se maneja mejor en el AuthContext
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();
  }, []);

  // Handler para entrar como invitado
  const handleGuestLogin = useCallback(() => {
    console.log('🎯 Botón invitado clickeado!');
    // Crear ID único para invitado
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    window.location.href = `/board/${guestId}/`;
  }, []);

  // Handler de login con Google
  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    hasProcessedRef.current = false;

    try {
      console.log('🔄 Iniciando sesión con Google...');
      const result = await signInWithGoogle();
      console.log('✅ Login Google exitoso:', result.user.email);

      if (result?.user) {
        await redirectToBoard(result.user);
      }
    } catch (error) {
      console.error('❌ Error Google:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Error al iniciar sesión con Google.'
      });
      setIsLoggingIn(false);
    }
  };

  // Handler de login con email/password
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (isLoggingIn || !email || !password) return;
    setIsLoggingIn(true);
    hasProcessedRef.current = false;

    try {
      let result;
      if (isCreatingAccount) {
        console.log('🔄 Creando cuenta...');
        result = await createUserWithEmail(email, password);
        toast({ title: '¡Cuenta creada!', description: 'Bienvenido a Mi Cerebro' });
      } else {
        console.log('🔄 Iniciando sesión con email...');
        result = await signInWithEmail(email, password);
      }

      console.log('✅ Login exitoso');
      if (result?.user) {
        await redirectToBoard(result.user);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      let errorMessage = 'Error al iniciar sesión.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No existe una cuenta con este email.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta.';
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido.';
      }
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
      setIsLoggingIn(false);
    }
  };

  // Mostrar loading si está redirigiendo
  if (isRedirecting) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
        <p className="mt-4 text-lg font-semibold text-slate-900">Cargando tu tablero...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center" style={{ backgroundColor: '#96e4e6' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 text-center">
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
          {!showLoginForm ? (
            // Vista principal con botones
            <div className="space-y-4">
              {/* Botón Google */}
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                size="lg"
                className="w-full bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-200 hover:border-slate-300 shadow-sm h-12"
                type="button"
              >
                {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : (
                  <svg width="20" height="20" viewBox="0 0 24 24" className="mr-2">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Iniciar con Google
              </Button>

              {/* Separador */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400">O usa email</span>
                </div>
              </div>

              {/* Botón Entrar (Login con email) - ACTIVO */}
              <Button
                onClick={() => { setShowLoginForm(true); setIsCreatingAccount(false); }}
                size="lg"
                className="w-full bg-[#16b5a8] hover:bg-[#139c91] text-white h-12"
                type="button"
              >
                <LogIn className="h-5 w-5 mr-2" />
                Entrar
              </Button>

              {/* Botón Crear cuenta */}
              <Button
                onClick={() => { setShowLoginForm(true); setIsCreatingAccount(true); }}
                variant="outline"
                size="lg"
                className="w-full h-12"
                type="button"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Crear cuenta
              </Button>

              {/* Opción Entrar como invitado */}
              <button
                type="button"
                onClick={handleGuestLogin}
                className="w-full text-center text-sm text-slate-500 italic hover:text-slate-700 transition-colors py-2 cursor-pointer"
                style={{ background: 'none', border: 'none' }}
              >
                Entrar como invitado
              </button>
            </div>
          ) : (
            // Formulario de email/password
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {isCreatingAccount ? 'Crear cuenta' : 'Iniciar sesión'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isCreatingAccount ? 'Ingresa tus datos para registrarte' : 'Ingresa tu email y contraseña'}
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16b5a8] focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16b5a8] focus:border-transparent"
                  placeholder="••••••"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoggingIn}
                size="lg"
                className="w-full bg-[#16b5a8] hover:bg-[#139c91] text-white h-12"
              >
                {isLoggingIn ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : isCreatingAccount ? (
                  <UserPlus className="h-5 w-5 mr-2" />
                ) : (
                  <LogIn className="h-5 w-5 mr-2" />
                )}
                {isLoggingIn ? 'Cargando...' : isCreatingAccount ? 'Crear cuenta' : 'Iniciar sesión'}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setIsCreatingAccount(!isCreatingAccount)}
                  className="text-[#16b5a8] hover:underline"
                >
                  {isCreatingAccount ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLoginForm(false); setEmail(''); setPassword(''); }}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Volver
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
