// Constantes de la aplicación

export const APP_NAME = 'Mi cerebro';
export const APP_DESCRIPTION = 'Tu lienzo de ideas infinitas';

// Rutas
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  BOARD: (boardId) => `/board/${boardId}/`,
};

// Configuración del canvas
export const CANVAS_CONFIG = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 5,
  DEFAULT_ZOOM: 1,
  ZOOM_STEP: 0.1,
};

// Tamaños de elementos
export const ELEMENT_SIZES = {
  STICKY_NOTE: { width: 200, height: 200 },
  TEXT: { width: 300, height: 150 },
  IMAGE: { width: 400, height: 300 },
};

