'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

/**
 * Hook para obtener el estado de autenticación del usuario
 * @returns {Object} { user, loading, error }
 */
export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false);
        setError(null);
        
        // Guardar estado en sessionStorage
        if (user) {
          sessionStorage.setItem('hasActiveSession', 'true');
          if (user.isAnonymous) {
            sessionStorage.setItem('isAnonymousUser', 'true');
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

    return () => unsubscribe();
  }, []);

  return { user, loading, error };
}

