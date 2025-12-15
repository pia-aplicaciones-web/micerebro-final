// src/lib/types.ts

import type { Timestamp } from 'firebase/firestore';

export interface Point {
  x: number;
  y: number;
}

// ELEMENTOS ACTIVOS (con botones y funcionalidad)
export type ElementType =
  'image' | 'text' | 'sticky' | 'notepad' | 'notepad-simple' |
  'container' | 'comment-bubble' | 'todo' | 'moodboard' |
  'yellow-notepad' | 'datetime-widget' | 'habit-tracker' | 'eisenhower-matrix' |
  'brain-dump' | 'gratitude-journal' | 'sticker' | 'locator' |
  // Elementos del sistema (sin botones directos)
  'frame' | 'connector' | 'drawing';

// ELEMENTOS DESCONTINUADOS (removidos del sistema)
// 'super-notebook', 'test-notepad', 'comment', 'tabbed-notepad',
// 'stopwatch', 'countdown', 'highlight-text', 'pomodoro-timer',
// 'brainstorm-generator', 'color-palette-generator', 'accordion'

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
  format?: 'letter' | '10x15';
  
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
}

export interface NotepadSimpleContent {
  title?: string;
  text?: string;
  content?: string;
}

export interface YellowNotepadContent {
  text?: string;
  searchQuery?: string;
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

export interface ImageContent {
  url: string;
}

export interface CommentContent {
  text?: string;
  authorId?: string;
  title?: string;
  label?: string;
}

export interface ContainerContent {
  title?: string;
  elementIds: string[];
  layout?: 'single' | 'two-columns'; // Layout del contenedor
}

export interface ConnectorContent {
  fromElementId: string;
  toElementId: string;
  color?: string;
  label?: string;
}

export interface FrameContent {
    title?: string;
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

export interface AccordionItem {
  id: string;
  title: string;
  content: string;
  isOpen?: boolean;
}

export interface AccordionContent {
  title?: string;
  items: AccordionItem[];
}

export interface TabbedNotepadTab {
  id: string;
  title: string;
  content: string;
}

export interface TabbedNotepadContent {
  title?: string;
  tabs: TabbedNotepadTab[];
  activeTabId?: string;
}

// Alias para compatibilidad (ahora tipados correctamente)
export type ImageElementProperties = CanvasElementProperties;
export type NotepadElementProperties = CanvasElementProperties & {
  format?: 'letter' | '10x15';
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

export interface NotepadSimpleCanvasElement extends BaseVisualProperties {
  type: 'notepad-simple';
  hidden?: boolean;
  content: NotepadSimpleContent;
}

export interface FrameCanvasElement extends BaseVisualProperties {
  type: 'frame';
  hidden?: boolean;
  content: FrameContent;
}

export interface ConnectorCanvasElement extends BaseVisualProperties {
  type: 'connector';
  hidden?: boolean;
  content: ConnectorContent;
}

export interface ContainerCanvasElement extends BaseVisualProperties {
  type: 'container';
  hidden?: boolean;
  content: ContainerContent;
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

export interface DrawingCanvasElement extends BaseVisualProperties {
  type: 'drawing';
  hidden?: boolean;
  content?: Record<string, unknown>; // Contenido genérico para dibujos
}

export interface MoodboardCanvasElement extends BaseVisualProperties {
  type: 'moodboard';
  hidden?: boolean;
  content: MoodboardContent;
}

export interface YellowNotepadCanvasElement extends BaseVisualProperties {
  type: 'yellow-notepad';
  hidden?: boolean;
  content: YellowNotepadContent;
}

export type CanvasElement =
  | ImageCanvasElement
  | TextCanvasElement
  | StickyCanvasElement
  | NotepadCanvasElement
  | NotepadSimpleCanvasElement
  | FrameCanvasElement
  | ConnectorCanvasElement
  | ContainerCanvasElement
  | CommentCanvasElement
  | TodoCanvasElement
  | DrawingCanvasElement
  | MoodboardCanvasElement
  | YellowNotepadCanvasElement
  | DatetimeWidgetCanvasElement
  | HabitTrackerCanvasElement
  | EisenhowerMatrixCanvasElement
  | BrainDumpCanvasElement
  | GratitudeJournalCanvasElement
  | StickerCanvasElement
  | LocatorCanvasElement;

export type WithId<T> = T & { id: string };

export interface Board {
  id: string;
  name: string;
  userId?: string;
  createdAt?: Timestamp | Date | FieldValue | null;
  updatedAt?: Timestamp | Date | FieldValue | null;
  description?: string;
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
  | NotepadSimpleContent
  | YellowNotepadContent
  | TodoContent
  | CommentContent
  | ContainerContent
  | ConnectorContent
  | FrameContent
  | MoodboardContent
  | AccordionContent
  | TabbedNotepadContent
  | Record<string, unknown>; // Para drawing y otros

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
    
    // Callbacks opcionales/específicas
    onDuplicateElement?: (id: string) => void;
    addElement?: (type: ElementType, props?: { color?: string; content?: ElementContent; properties?: CanvasElementProperties; parentId?: string; tags?: string[] }) => Promise<string>;
    setActiveTextEditorId?: (id: string | null) => void;
    onDoubleClick?: (rect: DOMRect) => void;
    allElements?: WithId<CanvasElement>[];
    isPreview?: boolean;
    isListening?: boolean;
    liveTranscript?: string;
    finalTranscript?: string;
    interimTranscript?: string;
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
}
