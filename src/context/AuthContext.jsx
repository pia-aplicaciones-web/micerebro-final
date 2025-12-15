'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { initFirebase, getFirebaseAuth } from '@/lib/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Inicializar Firebase y escuchar cambios de autenticación
  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    let unsubscribe = null;

    const initialize = async () => {
      try {
        await initFirebase();
        setInitialized(true);
        
        const auth = getFirebaseAuth();
        if (!auth) {
          setLoading(false);
          return;
        }

        unsubscribe = onAuthStateChanged(
          auth,
          (user) => {
            setUser(user);
            setLoading(false);
            setError(null);
            
            // Solo mantener flags esenciales de sesión
            if (user) {
              sessionStorage.setItem('hasActiveSession', 'true');
              if (user.isAnonymous) {
                sessionStorage.setItem('isAnonymousUser', 'true');
              } else {
                sessionStorage.removeItem('isAnonymousUser');
              }
            } else {
              sessionStorage.removeItem('hasActiveSession');
              sessionStorage.removeItem('isAnonymousUser');
            }
          },
          (err) => {
            setError(err);
            setLoading(false);
            setUser(null);
          }
        );
      } catch (err) {
        console.error('Error inicializando Firebase:', err);
        setError(err);
        setLoading(false);
      }
    };

    initialize();

    // CRÍTICO: Cleanup del listener cuando el componente se desmonta
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const value = {
    user,
    loading,
    error,
    initialized,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  }
  return context;
};

