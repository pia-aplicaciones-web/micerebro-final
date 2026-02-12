import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, getMetadata } from 'firebase/storage';
import { getFirebaseFirestore, getFirebaseStorage } from '@/lib/firebase';
import { CanvasElement, WithId, Board } from '@/lib/types';

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

function bytesToReadableSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

      if (!db || !storage) {
        throw new Error('Firebase Firestore or Storage not initialized.');
      }

      let totalBoards = 0;
      let totalElements = 0;
      let totalImageSize = 0;

      // 1. Get total boards
      const boardsCollectionRef = collection(db, 'users', userId, 'canvasBoards');
      const boardsSnapshot = await getDocs(boardsCollectionRef);
      totalBoards = boardsSnapshot.size;

      // 2. Get total elements and image sizes per board
      for (const boardDoc of boardsSnapshot.docs) {
        const boardId = boardDoc.id;
        const elementsCollectionRef = collection(db, 'users', userId, 'canvasBoards', boardId, 'canvasElements');
        const elementsSnapshot = await getDocs(elementsCollectionRef);
        totalElements += elementsSnapshot.size;

        for (const elementDoc of elementsSnapshot.docs) {
          const element = elementDoc.data() as WithId<CanvasElement>;
          
          // Check for image elements
          if (element.type === 'image' || element.type === 'image-frame') {
            const imageUrl = (element.content as any)?.url;
            if (imageUrl) {
              try {
                const imageRef = ref(storage, imageUrl);
                const metadata = await getMetadata(imageRef);
                totalImageSize += metadata.size;
              } catch (imgError) {
                console.warn(`Could not get metadata for image ${imageUrl}:`, imgError);
              }
            }
          } else if (element.type === 'block-dibujo') {
            const blockImages = (element.content as any)?.images as { url: string }[] | undefined;
            if (blockImages && Array.isArray(blockImages)) {
              for (const img of blockImages) {
                if (img.url) {
                  try {
                    const imageRef = ref(storage, img.url);
                    const metadata = await getMetadata(imageRef);
                    totalImageSize += metadata.size;
                  } catch (imgError) {
                    console.warn(`Could not get metadata for block-dibujo image ${img.url}:`, imgError);
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
    } catch (error: any) {
      console.error('Error calculating storage usage:', error);
      setUsage((prev) => ({ ...prev, isLoading: false, error: error.message }));
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
