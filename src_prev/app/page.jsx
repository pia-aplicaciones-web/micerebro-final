'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { collection, getDocs, addDoc, serverTimestamp, limit, orderBy, doc, setDoc, getDoc, query } from 'firebase/firestore';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { initFirebase, getFirebaseAuth, getFirebaseFirestore, clearFirebaseSession } from '@/lib/firebase';

// Usar la inicialización centralizada de Firebase
async function getFirebaseInstances() {
  await initFirebase();
  const auth = getFirebaseAuth();
  const firestore = getFirebaseFirestore();
  return { auth, firestore };
}

export default function HomePage() {
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const hasProcessedRef = useRef(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const troubleshootSession = useCallback(async () => {
    console.log('🔧 Iniciando solución de problemas de sesión...');
    try {
      await clearFirebaseSession();
      toast({ title: 'Sesión limpiada', description: 'Intenta iniciar sesión nuevamente.' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Error limpiando sesión:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo limpiar la sesión.' });
    }
  }, [toast]);

  const handleManualSignOut = useCallback(async () => {
    try {
      if (isSigningOut) return;
      setIsSigningOut(true);
      const { auth } = await getFirebaseInstances();
      if (auth?.currentUser) {
        await signOut(auth);
      }
      await clearFirebaseSession();
      toast({ title: 'Sesión cerrada', description: 'Inicia sesión de nuevo cuando quieras.' });
      setTimeout(() => window.location.href = '/', 500);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cerrar sesión.' });
    } finally {
      setIsSigningOut(false);
    }
  }, [isSigningOut, toast]);

  // Función para redirigir al tablero
  const redirectToBoard = useCallback(async (user, firestore) => {
    if (hasProcessedRef.current || isRedirecting) return;
    
    hasProcessedRef.current = true;
    setIsRedirecting(true);
    
    try {
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

      // CRÍTICO: Guardar en sessionStorage para que BoardPageClient sepa que hay sesión activa
      sessionStorage.setItem('justLoggedIn', 'true');
      sessionStorage.setItem('userId', user.uid);

      console.log('🚀 Redirigiendo a:', `/board/${boardId}/`);
      // Guardar userId en localStorage para que persista
      localStorage.setItem('currentUserId', user.uid);
      localStorage.setItem('lastBoardId', boardId);
      // Redirección inmediata - el AuthContext ya debería tener el usuario
      window.location.href = `/board/${boardId}/`;
      
    } catch (error) {
      console.error('Error:', error);
      hasProcessedRef.current = false;
      setIsRedirecting(false);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el tablero.' });
    }
  }, [isRedirecting, toast]);

  // Verificar redirect de Google y usuario existente al cargar
  useEffect(() => {
    const checkAuth = async () => {
      if (hasProcessedRef.current) return;

      try {
        const { auth, firestore } = await getFirebaseInstances();

        // Verificar si hay resultado de redirect (esto SÍ debería redirigir)
        const result = await getRedirectResult(auth);
        if (result?.user) {
          console.log('✅ Usuario de redirect:', result.user.email);
          await redirectToBoard(result.user, firestore);
          return;
        }

        // NO redirigir automáticamente si ya hay usuario logueado en la página de inicio
        // Solo redirigir si viene de un redirect de Google
        // Esto previene bucles infinitos
        if (auth.currentUser) {
          console.log('✅ Usuario ya logueado en página de inicio:', auth.currentUser.email);
          // No hacer redirect automático aquí
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();
  }, [redirectToBoard]);

  // Handler de login con Google (usando Popup que es más confiable)
  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    hasProcessedRef.current = false;

    try {
      const { auth, firestore } = await getFirebaseInstances();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      console.log('🔄 Abriendo popup de Google...');
      // Usar signInWithPopup en lugar de signInWithRedirect para mayor compatibilidad
      const result = await signInWithPopup(auth, provider);
      console.log('✅ Login Google exitoso:', result.user.email);

      if (result?.user) {
        await redirectToBoard(result.user, firestore);
      }
    } catch (error) {
      console.error('❌ Error Google:', error);

      let errorMessage = 'Error al iniciar sesión con Google.';

      // Manejar errores específicos
      if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup bloqueado por el navegador. Permitir popups e intenta nuevamente.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Popup cerrado. Intenta nuevamente.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Espera unos minutos.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Esta cuenta ha sido deshabilitada.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Cuenta no encontrada. Verifica que uses la misma cuenta de Google.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Credenciales inválidas. Intenta nuevamente.';
      }

      // Si el popup falla, intentar con redirect como fallback
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
        try {
          console.log('🔄 Popup bloqueado, usando redirect...');
          const { auth } = await getFirebaseInstances();
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          await signInWithRedirect(auth, provider);
          return; // No resetear isLoggingIn porque se está redirigiendo
        } catch (redirectError) {
          console.error('❌ Error redirect:', redirectError);
          toast({ variant: 'destructive', title: 'Error', description: 'Error al iniciar sesión con Google.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Error', description: errorMessage });
      }
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
      const { auth, firestore } = await getFirebaseInstances();

      let result;
      if (isCreatingAccount) {
        console.log('🔄 Creando cuenta...');
        result = await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: '¡Cuenta creada!', description: 'Bienvenido a Mi Cerebro' });
      } else {
        console.log('🔄 Iniciando sesión con email...');
        result = await signInWithEmailAndPassword(auth, email, password);
      }

      console.log('✅ Login exitoso');
      if (result?.user) {
        await redirectToBoard(result.user, firestore);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      let errorMessage = 'Error al iniciar sesión.';

      // Manejar errores específicos
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
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Email o contraseña incorrectos.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Espera unos minutos.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Esta cuenta ha sido deshabilitada.';
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

              {/* Botón de solución de problemas */}
              <Button
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                variant="ghost"
                size="sm"
                className="w-full text-xs text-slate-500 hover:text-slate-700"
                type="button"
              >
                ¿Problemas con el login?
              </Button>

              {showTroubleshoot && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700 mb-2">
                    Si no puedes iniciar sesión, limpia la sesión:
                  </p>
                  <Button
                    onClick={troubleshootSession}
                    variant="destructive"
                    size="sm"
                    className="w-full text-xs"
                    type="button"
                  >
                    Limpiar sesión y recargar
                  </Button>
                  <button
                    type="button"
                    onClick={handleManualSignOut}
                    className="mt-3 text-[11px] text-slate-400 hover:text-slate-600"
                    disabled={isSigningOut}
                  >
                    {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                  </button>
                </div>
              )}
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
