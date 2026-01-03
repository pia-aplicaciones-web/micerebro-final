// src/lib/types.ts

import type { Timestamp } from 'firebase/firestore';

export interface Point {
  x: number;
  y: number;
}

export type ElementType =
  'image' | 'text' | 'sticky' | 'notepad' |
  'comment' | 'comment-small' | 'comment-r' | 'comment-bubble' |
  'todo' |
  'moodboard' |
  'gallery' |
  'photo-ideas-guide' |
  'yellow-notepad' |
  'mini-notes' |
  'mini' |
  'stopwatch' |
  'countdown' |
  'highlight-text' |
  'weekly-planner' |
  'vertical-weekly-planner' |
  'weekly-menu' |
  'container' |
  'two-columns' |
  'locator' |
  'image-frame' |
  'photo-grid' |
  'photo-grid-horizontal' |
  'photo-grid-adaptive' |
  'photo-grid-free' |
  'pomodoro-timer' |
  'photo-collage' |
  'photo-collage-free' |
  'collage-editable' |
  'libreta';

// Interfaz para propiedades de elementos del canvas
export interface CanvasElementProperties {
  // Posición y tamaño
  position?: Point;
  relativePosition?: Point; // Para elementos anclados en contenedores
  size?: { width: number | string; height: number | string };
  originalSize?: { width: number; height: number }; // Para elementos minimizados
  
  // Visuales
  rotation?: number;
  zIndex?: number;
  color?: string;
  backgroundColor?: string;
  
  // Específicas por tipo de elemento
  fontSize?: number | string;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  fontStyle?: 'normal' | 'italic';
  
  // Para imágenes
  showFloatingTag?: boolean;
  floatingTag?: string;
  label?: string;
  
  // Para notepads
  format?: 'letter' | '10x15' | '20x15';
  
  // Genérico para propiedades adicionales
  [key: string]: unknown;
}

import type { FieldValue } from 'firebase/firestore';

export interface BaseVisualProperties {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  color?: string;
  backgroundColor?: string;
  size?: { width: number | string; height: number | string; };
  properties?: CanvasElementProperties; 
  parentId?: string;
  userId?: string; // ID del usuario que creó el elemento
  createdAt?: Timestamp | Date | FieldValue | null; // Timestamp de creación (puede ser FieldValue durante creación)
  updatedAt?: Timestamp | Date | FieldValue | null; // Timestamp de actualización (puede ser FieldValue durante creación)
}

// Interfaces de contenido
export interface NotepadContent {
  title?: string;
  content?: string;
  currentPage?: number;
  pages?: string[];
  password?: string;
  isLocked?: boolean;
}

export interface YellowNotepadContent {
  title?: string;
  currentPage?: number;
  pages?: string[];
  searchQuery?: string;
}

export interface WeeklyPlannerContent {
  days: Record<string, string>;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}
export interface TodoContent {
  title?: string;
  items: TodoItem[];
}

export interface ContainerContent {
  title?: string;
  elementIds: string[];
  layout?: 'single' | 'two-columns';
}

export interface LocatorContent {
  label?: string;
}

export interface ImageFrameContent {
  url?: string;
  zoom?: number;
  panX?: number;
  panY?: number;
  rotation?: number;
}

export interface WeeklyMenuContent {
  days: Record<string, string>;
}


export interface PhotoGridCell {
  id: string;
  url?: string;
  caption?: string;
  showCaption?: boolean;
}

export interface PhotoGridContent {
  title?: string;
  rows: number;
  columns: number;
  cells: PhotoGridCell[];
  layoutMode?: 'default' | 'horizontal' | 'adaptive';
}

export interface PhotoGridFreeContent {
  title?: string;
  imageIds?: string[]; // IDs de las imágenes hijas (opcional, se puede calcular desde allElements)
}

export interface PhotoIdeasGuideContent {
  title?: string;
  elementIds?: string[]; // IDs de los elementos hijos (opcional, se puede calcular desde allElements)
}

export interface LibretaContent {
  title?: string;
  text?: string;
  pages?: string[];
  currentPage?: number;
}

export interface MiniContent {
  text?: string;
  password?: string;
  isLocked?: boolean;
}

export interface CommentSmallContent {
  text?: string;
}

export interface ImageContent {
  url: string;
}

export interface CommentContent {
  text?: string;
  authorId?: string;
  title?: string;
  label?: string;
}


export interface MoodboardAnnotation {
  id: string;
  imageId: string;
  x: number; // Posición relativa a la imagen (0-100%)
  y: number; // Posición relativa a la imagen (0-100%)
  text: string;
  color?: string;
}

export interface MoodboardContent {
  title?: string;
  images: Array<{
    id: string;
    url: string;
    thumbnail?: string;
  }>;
  annotations: MoodboardAnnotation[];
  layout?: 'grid' | 'masonry';
}

export interface GalleryImage {
  id: string;
  url: string;
  filename?: string;
  uploadedAt?: string;
  thumbnail?: string;
}

export interface GalleryContent {
  title?: string;
  images: GalleryImage[];
}

// Alias para compatibilidad (ahora tipados correctamente)
export type ImageElementProperties = CanvasElementProperties;
export type NotepadElementProperties = CanvasElementProperties & {
  format?: 'letter' | '10x15' | '20x15';
};
export type BaseElementProperties = BaseVisualProperties;


// Interfaces de Elementos Específicos
export interface ImageCanvasElement extends BaseVisualProperties {
  type: 'image';
  hidden?: boolean;
  content: ImageContent;
}

export interface TextCanvasElement extends BaseVisualProperties {
  type: 'text';
  hidden?: boolean;
  content: string;
}

export interface StickyCanvasElement extends BaseVisualProperties {
  type: 'sticky';
  hidden?: boolean;
  content?: string;
  tags?: string[];
}

export interface NotepadCanvasElement extends BaseVisualProperties {
  type: 'notepad';
  hidden?: boolean;
  content: NotepadContent;
  minimized?: boolean;
}

export interface CommentCanvasElement extends BaseVisualProperties {
  type: 'comment';
  hidden?: boolean;
  content: CommentContent;
}

export interface TodoCanvasElement extends BaseVisualProperties {
  type: 'todo';
  hidden?: boolean;
  content: TodoContent;
}

export interface MoodboardCanvasElement extends BaseVisualProperties {
  type: 'moodboard';
  hidden?: boolean;
  content: MoodboardContent;
}

export interface GalleryCanvasElement extends BaseVisualProperties {
  type: 'gallery';
  hidden?: boolean;
  content: GalleryContent;
}

export interface PhotoIdeasGuideCanvasElement extends BaseVisualProperties {
  type: 'photo-ideas-guide';
  hidden?: boolean;
  content: PhotoIdeasGuideContent;
}

export interface YellowNotepadCanvasElement extends BaseVisualProperties {
  type: 'yellow-notepad';
  hidden?: boolean;
  content: YellowNotepadContent;
}

export interface WeeklyPlannerCanvasElement extends BaseVisualProperties {
  type: 'weekly-planner';
  hidden?: boolean;
  content: WeeklyPlannerContent;
  properties?: CanvasElementProperties & { weekStart?: string };
}

export interface VerticalWeeklyPlannerCanvasElement extends BaseVisualProperties {
  type: 'vertical-weekly-planner';
  hidden?: boolean;
  content: WeeklyPlannerContent;
  properties?: CanvasElementProperties & { weekStart?: string };
}

export interface PhotoGridCanvasElement extends BaseVisualProperties {
  type: 'photo-grid';
  hidden?: boolean;
  content: PhotoGridContent;
}

export interface PhotoGridHorizontalCanvasElement extends BaseVisualProperties {
  type: 'photo-grid-horizontal';
  hidden?: boolean;
  content: PhotoGridContent;
}

export interface PhotoGridAdaptiveCanvasElement extends BaseVisualProperties {
  type: 'photo-grid-adaptive';
  hidden?: boolean;
  content: PhotoGridContent;
}

export interface PhotoGridFreeCanvasElement extends BaseVisualProperties {
  type: 'photo-grid-free';
  hidden?: boolean;
  content: PhotoGridFreeContent;
}

export type CanvasElement =
  | ImageCanvasElement
  | TextCanvasElement
  | StickyCanvasElement
  | NotepadCanvasElement
  | CommentCanvasElement
  | TodoCanvasElement
  | MoodboardCanvasElement
  | GalleryCanvasElement
  | YellowNotepadCanvasElement
  | WeeklyPlannerCanvasElement
  | PhotoGridCanvasElement
  | PhotoGridHorizontalCanvasElement
  | PhotoGridAdaptiveCanvasElement
  | PhotoGridFreeCanvasElement;

export type WithId<T> = T & { id: string };

export interface Board {
  id: string;
  name: string;
  userId?: string;
  createdAt?: Timestamp | Date | FieldValue | null;
  updatedAt?: Timestamp | Date | FieldValue | null;
  description?: string;
  password?: string; // Contraseña opcional para proteger el tablero
}

// Alias para compatibilidad
export type CanvasBoard = Board;

// Tipo para preferencias de usuario
export interface UserPreferences {
  microphonePermission?: 'granted' | 'denied' | 'prompt';
  theme?: 'light' | 'dark' | 'system';
  [key: string]: unknown; // Permite propiedades adicionales pero tipadas como unknown
}

// Colores temáticos usados en menús y etiquetas
export const THEME_COLORS = {
  work: { bg: '#e3f2fd', border: '#1976d2', name: 'Trabajo' },
  personal: { bg: '#f3e5f5', border: '#7b1fa2', name: 'Personal' },
  urgent: { bg: '#ffebee', border: '#d32f2f', name: 'Urgente' },
  idea: { bg: '#e8f5e8', border: '#388e3c', name: 'Ideas' },
  meeting: { bg: '#fff3e0', border: '#f57c00', name: 'Reuniones' },
  creative: { bg: '#fce4ec', border: '#c2185b', name: 'Creativo' }
};

// Union type para content según el tipo de elemento
export type ElementContent =
  | string // Para text y sticky
  | ImageContent
  | NotepadContent
  | YellowNotepadContent
  | WeeklyPlannerContent
  | WeeklyMenuContent
  | TodoContent
  | CommentContent
  | CommentSmallContent
  | LocatorContent
  | MoodboardContent
  | GalleryContent
  | ImageFrameContent
  | PhotoGridContent
  | PhotoGridFreeContent
  | PhotoIdeasGuideContent
  | LibretaContent
  | MiniContent
  | ContainerContent
  | Record<string, unknown>;

// --- INTERFAZ UNIVERSAL DE PROPS -- CORRECTED ---
export interface CommonElementProps {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    content?: ElementContent;
    properties?: CanvasElementProperties;
    color?: string;
    zIndex?: number;
    backgroundColor?: string;
    hidden?: boolean;
    minimized?: boolean;
    tags?: string[];
    parentId?: string;
    
    // Props de interacción y contexto
    scale: number;
    offset?: Point;
    isSelected?: boolean;
    isEditing?: boolean;
    
    // Callbacks
    onUpdate: (id: string, updates: Partial<WithId<CanvasElement>>) => void;
    deleteElement: (id: string) => void;
    onSelectElement: (id: string | null, isMultiSelect: boolean) => void;
    onEditElement: (id: string) => void;

    // Props de speech-to-text (opcionales)
    isListening?: boolean;
    liveTranscript?: string;
    finalTranscript?: string;
    interimTranscript?: string; 
    
    // Callbacks opcionales/específicas
    onDuplicateElement?: (id: string) => void;
    addElement?: (type: ElementType, props?: { color?: string; content?: ElementContent; properties?: CanvasElementProperties; parentId?: string; tags?: string[] }) => Promise<string>;
    setActiveTextEditorId?: (id: string | null) => void;
    onDoubleClick?: (rect: DOMRect) => void;
    allElements?: WithId<CanvasElement>[];
    isPreview?: boolean;
    onUngroup?: (elementId: string) => void;
    onLocateElement: (elementId: string) => void;
    onEditComment: (element: WithId<CanvasElement>) => void;
    onFormatToggle?: () => void;
    onChangeNotepadFormat?: (id: string) => void;
    onBringToFront?: (id: string) => void;
    onSendToBack?: (id: string) => void;
    onMoveBackward?: (id: string) => void;
    onGroupElements?: (frameId: string) => void;
    activatedElementId?: string | null;
    onActivateDrag?: (id: string) => void;
    setIsDirty?: (isDirty: boolean) => void;
    boardId?: string;
    onUploadImage?: () => void;
    storage?: any;
    userId?: string;
}
