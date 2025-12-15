'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { initFirebase, getFirebaseAuth, clearFirebaseSession } from '@/lib/firebase';

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
            console.log('🔄 [AuthContext] Auth state changed:', {
              user: !!user,
              uid: user?.uid,
              isAnonymous: user?.isAnonymous,
              email: user?.email,
              displayName: user?.displayName
            });

            setUser(user);
            setLoading(false);
            setError(null);

            // Solo mantener flags esenciales de sesión
            if (user) {
              sessionStorage.setItem('hasActiveSession', 'true');
              sessionStorage.setItem('currentUserId', user.uid);
              if (user.isAnonymous) {
                sessionStorage.setItem('isAnonymousUser', 'true');
              } else {
                sessionStorage.removeItem('isAnonymousUser');
                // Limpiar flag de login reciente cuando se establece sesión permanente
                sessionStorage.removeItem('justLoggedIn');
              }
            } else {
              sessionStorage.removeItem('hasActiveSession');
              sessionStorage.removeItem('isAnonymousUser');
              sessionStorage.removeItem('currentUserId');
              sessionStorage.removeItem('justLoggedIn');
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

  // Verificar sesión persistente al cargar
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkPersistedSession = async () => {
      try {
        console.log('🔍 [AuthContext] Verificando sesión persistente...');

        // Esperar a que Firebase se inicialice
        await initFirebase();
        const auth = getFirebaseAuth();

        if (auth) {
          // Verificar si hay indicadores de sesión en storage
          setLoading(false);
        } else {
          console.error('❌ [AuthContext] No se pudo obtener instancia de auth');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ [AuthContext] Error verificando sesión persistente:', error);
        await clearFirebaseSession();
        setLoading(false);
      }
    };

    checkPersistedSession();
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

