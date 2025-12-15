'use client';

import React, { useEffect, useState, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  setPersistence, 
  browserSessionPersistence,
  type Auth, 
  type User 
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { firebaseConfig } from '@/lib/firebase';
import { FirebaseContext, type FirebaseContextState } from '@/firebase/provider';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebaseState, setFirebaseState] = useState<{
    firebaseApp: FirebaseApp | null;
    auth: Auth | null;
    firestore: Firestore | null;
    storage: FirebaseStorage | null;
    initialized: boolean;
    initError: Error | null;
  }>({
    firebaseApp: null,
    auth: null,
    firestore: null,
    storage: null,
    initialized: false,
    initError: null,
  });

  const [userState, setUserState] = useState<{
    user: User | null;
    isUserLoading: boolean;
    userError: Error | null;
  }>({
    user: null,
    isUserLoading: true,
    userError: null,
  });

  // Inicializar Firebase en el cliente
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (firebaseState.initialized) return;

    const initFirebase = async () => {
      try {
        let app: FirebaseApp;
        if (!getApps().length) {
          app = initializeApp(firebaseConfig);
        } else {
          app = getApp();
        }

        const authInstance = getAuth(app);
        
        // CRÍTICO: Configurar persistencia de SESIÓN
        // La sesión se cierra cuando el usuario cierra el navegador/pestaña
        // Pero se mantiene mientras la pestaña esté abierta (incluso semanas)
        await setPersistence(authInstance, browserSessionPersistence);
        console.log('✅ Firebase Auth configurado con persistencia de SESIÓN');
        
        const firestoreInstance = getFirestore(app);
        const storageInstance = getStorage(app);

        console.log('✅ Firebase inicializado correctamente');
        
        setFirebaseState({
          firebaseApp: app,
          auth: authInstance,
          firestore: firestoreInstance,
          storage: storageInstance,
          initialized: true,
          initError: null,
        });
      } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
        setFirebaseState({
          firebaseApp: null,
          auth: null,
          firestore: null,
          storage: null,
          initialized: true,
          initError: error instanceof Error ? error : new Error('Error desconocido'),
        });
        setUserState({ user: null, isUserLoading: false, userError: null });
      }
    };

    initFirebase();
  }, [firebaseState.initialized]);

  // Manejar cambios de autenticación
  useEffect(() => {
    if (!firebaseState.auth || !firebaseState.initialized) {
      if (firebaseState.initialized) {
        setUserState({ user: null, isUserLoading: false, userError: null });
      }
      return;
    }

    let isMounted = true;
    const unsubscribe = onAuthStateChanged(
      firebaseState.auth,
      (user) => {
        if (!isMounted) return;
        
        if (user && typeof window !== 'undefined') {
          // Marcar que hay sesión activa
          sessionStorage.setItem('hasActiveSession', 'true');
          if (user.isAnonymous) {
            sessionStorage.setItem('isAnonymousUser', 'true');
          }
        } else if (typeof window !== 'undefined') {
          // Limpiar marcadores de sesión
          sessionStorage.removeItem('hasActiveSession');
          sessionStorage.removeItem('isAnonymousUser');
        }
        
        if (isMounted) {
          setUserState({ user, isUserLoading: false, userError: null });
        }
      },
      (error) => {
        if (isMounted) {
          setUserState({ user: null, isUserLoading: false, userError: error });
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [firebaseState.auth, firebaseState.initialized]);

  // Valor del contexto memoizado
  const contextValue = useMemo(
    (): FirebaseContextState => ({
      firebaseApp: firebaseState.firebaseApp,
      firestore: firebaseState.firestore,
      auth: firebaseState.auth,
      storage: firebaseState.storage,
      ...userState,
    }),
    [
      firebaseState.firebaseApp,
      firebaseState.firestore,
      firebaseState.auth,
      firebaseState.storage,
      firebaseState.initialized,
      userState.user,
      userState.isUserLoading,
      userState.userError,
    ]
  );

  return (
    <FirebaseContext.Provider value={contextValue}>
      {contextValue.auth && <FirebaseErrorListener />}
      {children}
    </FirebaseContext.Provider>
  );
}
