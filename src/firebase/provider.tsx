
'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { initFirebase, getFirebaseApp, getFirebaseAuth, getFirebaseFirestore, getFirebaseStorage } from '@/lib/firebase';

export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

const defaultState: FirebaseContextState = {
    firebaseApp: null,
    firestore: null,
    auth: null,
    storage: null,
    user: null,
    isUserLoading: true,
    userError: null
};

export const FirebaseContext = createContext<FirebaseContextState>(defaultState);

export const useFirebaseContext = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    console.error('useFirebaseContext must be used within a FirebaseProvider.');
    return defaultState;
  }
  return context;
};

export const useAuth = (): Auth | null => {
  return useFirebaseContext()?.auth ?? null;
};

export const useFirestore = (): Firestore | null => {
  return useFirebaseContext()?.firestore ?? null;
};

export const useStorage = (): FirebaseStorage | null => {
    return useFirebaseContext()?.storage ?? null;
};

export const useFirebaseApp = (): FirebaseApp | null => {
  return useFirebaseContext()?.firebaseApp ?? null;
};

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebaseContext();
  return { user, isUserLoading, userError };
};

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FirebaseContextState>(defaultState);

  useEffect(() => {
    let mounted = true;
    initFirebase()
      .then(() => {
        if (!mounted) return;
        setState({
          firebaseApp: getFirebaseApp(),
          firestore: getFirebaseFirestore(),
          auth: getFirebaseAuth(),
          storage: getFirebaseStorage(),
          user: getFirebaseAuth()?.currentUser ?? null,
          isUserLoading: false,
          userError: null,
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setState((prev) => ({ ...prev, isUserLoading: false, userError: err }));
      });
    return () => { mounted = false; };
  }, []);

  return (
    <FirebaseContext.Provider value={state}>
      {children}
    </FirebaseContext.Provider>
  );
}
