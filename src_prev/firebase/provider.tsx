
'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { createContext, useContext, type ReactNode } from 'react';

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
    console.error("FirebaseProvider is a dummy component. Use FirebaseClientProvider instead.");
    return <>{children}</>;
}
