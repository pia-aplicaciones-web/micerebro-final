'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import type { UserPreferences } from '@/lib/types';

export function useUserPreferences() {
  const firestore = getFirebaseFirestore();
  const { user } = useAuthContext();

  const [micPermission, setMicPermission] = useState<UserPreferences['microphonePermission']>('prompt');

  useEffect(() => {
    if (!firestore || !user) {
      setMicPermission('prompt');
      return;
    };
    const userDocRef = doc(firestore, 'users', user.uid);

    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      const data = doc.data();
      const storedPermission = data?.preferences?.microphonePermission;
      setMicPermission(storedPermission || 'prompt');
    }, (error) => {
      console.error("Error fetching user preferences:", error);
    });

    return () => unsubscribe();
  }, [firestore, user]);

  const updateUserMicPreference = useCallback(async (newPermissionState: 'granted' | 'denied' | 'prompt') => {
    if (!firestore || !user) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
      await setDoc(userDocRef, { preferences: { microphonePermission: newPermissionState } }, { merge: true });
    } catch (error) {
      console.error("Error updating user mic preference:", error);
    }
  }, [firestore, user]);

  return {
    micPermission,
    updateUserMicPreference,
  };
}
