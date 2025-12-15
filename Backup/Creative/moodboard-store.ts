'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MoodboardImage {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Moodboard {
  id: string;
  name: string;
  images: MoodboardImage[];
  ideas: string;
  createdAt: number;
  updatedAt: number;
}

interface MoodboardStore {
  moodboards: Moodboard[];
  activeMoodboardId: string | null;
  isOpen: boolean;
  ideasMinimized: boolean;
  
  // Actions
  openMoodboard: (id: string) => void;
  createMoodboard: (name: string) => string;
  deleteMoodboard: (id: string) => void;
  closeMoodboard: () => void;
  
  // Update current moodboard
  updateMoodboardName: (name: string) => void;
  updateIdeas: (ideas: string) => void;
  addImage: (image: Omit<MoodboardImage, 'id'>) => void;
  updateImage: (imageId: string, updates: Partial<MoodboardImage>) => void;
  removeImage: (imageId: string) => void;
  
  // Ideas panel
  toggleIdeasMinimized: () => void;
  
  // Getters
  getActiveMoodboard: () => Moodboard | null;
}

const generateId = () => `mb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useMoodboardStore = create<MoodboardStore>()(
  persist(
    (set, get) => ({
      moodboards: [],
      activeMoodboardId: null,
      isOpen: false,
      ideasMinimized: false,

      openMoodboard: (id: string) => {
        set({ activeMoodboardId: id, isOpen: true });
      },

      createMoodboard: (name: string) => {
        const id = generateId();
        const newMoodboard: Moodboard = {
          id,
          name: name || 'Nuevo Moodboard',
          images: [],
          ideas: '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          moodboards: [...state.moodboards, newMoodboard],
          activeMoodboardId: id,
          isOpen: true,
        }));
        return id;
      },

      deleteMoodboard: (id: string) => {
        set((state) => ({
          moodboards: state.moodboards.filter((m) => m.id !== id),
          activeMoodboardId: state.activeMoodboardId === id ? null : state.activeMoodboardId,
          isOpen: state.activeMoodboardId === id ? false : state.isOpen,
        }));
      },

      closeMoodboard: () => {
        set({ isOpen: false });
      },

      updateMoodboardName: (name: string) => {
        set((state) => ({
          moodboards: state.moodboards.map((m) =>
            m.id === state.activeMoodboardId
              ? { ...m, name, updatedAt: Date.now() }
              : m
          ),
        }));
      },

      updateIdeas: (ideas: string) => {
        set((state) => ({
          moodboards: state.moodboards.map((m) =>
            m.id === state.activeMoodboardId
              ? { ...m, ideas, updatedAt: Date.now() }
              : m
          ),
        }));
      },

      addImage: (image) => {
        const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          moodboards: state.moodboards.map((m) =>
            m.id === state.activeMoodboardId
              ? { ...m, images: [...m.images, { ...image, id }], updatedAt: Date.now() }
              : m
          ),
        }));
      },

      updateImage: (imageId: string, updates: Partial<MoodboardImage>) => {
        set((state) => ({
          moodboards: state.moodboards.map((m) =>
            m.id === state.activeMoodboardId
              ? {
                  ...m,
                  images: m.images.map((img) =>
                    img.id === imageId ? { ...img, ...updates } : img
                  ),
                  updatedAt: Date.now(),
                }
              : m
          ),
        }));
      },

      removeImage: (imageId: string) => {
        set((state) => ({
          moodboards: state.moodboards.map((m) =>
            m.id === state.activeMoodboardId
              ? {
                  ...m,
                  images: m.images.filter((img) => img.id !== imageId),
                  updatedAt: Date.now(),
                }
              : m
          ),
        }));
      },

      toggleIdeasMinimized: () => {
        set((state) => ({ ideasMinimized: !state.ideasMinimized }));
      },

      getActiveMoodboard: () => {
        const state = get();
        return state.moodboards.find((m) => m.id === state.activeMoodboardId) || null;
      },
    }),
    {
      name: 'creative-moodboard-storage',
    }
  )
);
