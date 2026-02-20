import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ref, getMetadata } from 'firebase/storage';
import { getFirebaseFirestore, getFirebaseStorage } from '@/lib/firebase';
import { CanvasElement, WithId } from '@/lib/types';

/** Solo procesar URLs de Firebase Storage; ignorar URLs externas */
function isFirebaseStorageUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('firebasestorage.googleapis.com');
}

/** Extraer path desde URL de descarga para ref() */
function getStoragePathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/o\/(.+?)(\?|$)/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    /* ignore */
  }
  return null;
}

interface StorageUsage { 
  totalBoards: number;
  totalElements: number;
  totalImageSize: number; // in bytes
  isLoading: boolean;
  error: string | null;
}

const initialState: StorageUsage = {
  totalBoards: 0,
  totalElements: 0,
  totalImageSize: 0,
  isLoading: true,
  error: null,
};

export function useStorageUsage(userId: string | undefined): StorageUsage {
  const [usage, setUsage] = useState<StorageUsage>(initialState);

  const calculateUsage = useCallback(async () => {
    if (!userId) {
      setUsage((prev) => ({ ...prev, isLoading: false, error: 'User ID is undefined.' }));
      return;
    }

    setUsage((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const db = getFirebaseFirestore();
      const storage = getFirebaseStorage();

      if (!db) {
        setUsage((prev) => ({ ...prev, isLoading: false, error: 'Firestore no está inicializado.' }));
        return;
      }

      let totalBoards = 0;
      let totalElements = 0;
      let totalImageSize = 0;

      // 1. Get total boards
      const boardsCollectionRef = collection(db, 'users', userId, 'canvasBoards');
      const boardsSnapshot = await getDocs(boardsCollectionRef);
      totalBoards = boardsSnapshot.size;

      // 2. Solo intentar getMetadata si Storage está disponible
      const canFetchMetadata = !!storage;

      for (const boardDoc of boardsSnapshot.docs) {
        const boardId = boardDoc.id;
        const elementsCollectionRef = collection(db, 'users', userId, 'canvasBoards', boardId, 'canvasElements');
        const elementsSnapshot = await getDocs(elementsCollectionRef);
        totalElements += elementsSnapshot.size;

        if (!canFetchMetadata) continue;

        for (const elementDoc of elementsSnapshot.docs) {
          const element = elementDoc.data() as WithId<CanvasElement>;
          const elType = element.type as string;

          if (elType === 'image' || elType === 'image-frame') {
            const imageUrl = (element.content as any)?.url;
            if (imageUrl && isFirebaseStorageUrl(imageUrl)) {
              try {
                const path = getStoragePathFromUrl(imageUrl);
                if (path) {
                  const imageRef = ref(storage!, path);
                  const metadata = await getMetadata(imageRef);
                  totalImageSize += metadata.size;
                }
              } catch (imgError) {
                console.warn('Could not get metadata for image:', imgError);
              }
            }
          } else if (elType === 'block-dibujo') {
            const blockImages = (element.content as any)?.images as { url: string }[] | undefined;
            if (blockImages && Array.isArray(blockImages)) {
              for (const img of blockImages) {
                if (img.url && isFirebaseStorageUrl(img.url)) {
                  try {
                    const path = getStoragePathFromUrl(img.url);
                    if (path) {
                      const imageRef = ref(storage!, path);
                      const metadata = await getMetadata(imageRef);
                      totalImageSize += metadata.size;
                    }
                  } catch (imgError) {
                    console.warn('Could not get metadata for block-dibujo image:', imgError);
                  }
                }
              }
            }
          }
        }
      }

      setUsage({
        totalBoards,
        totalElements,
        totalImageSize,
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al calcular uso de almacenamiento';
      console.error('Error calculating storage usage:', error);
      setUsage((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      calculateUsage();
    } else {
      setUsage(initialState);
    }
  }, [userId, calculateUsage]);

  return usage;
}
