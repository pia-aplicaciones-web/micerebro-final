// @ts-nocheck
'use client';

import React, { useEffect, useState, useMemo, type ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  type Auth, 
  type User 
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { FirebaseApp } from 'firebase/app';

import { app, auth, db, storage } from '@/lib/firebase';
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
    firebaseApp: app || null,
    auth: auth || null,
    firestore: db || null,
    storage: storage || null,
    initialized: typeof window !== 'undefined',
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

