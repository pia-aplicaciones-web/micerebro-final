// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, forwardRef, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useRouter } from 'next/navigation';
import { BookCopy,
  RectangleHorizontal,
  StickyNote,
  Wrench,
  ImageIcon,
  FileText,
  Folder,
  Link,
  MoreHorizontal,
  Move,
  GripVertical,
  Plus,
  Save,
  LogOut,
  Trash2,
  Upload,
  Link as LinkIcon,
  EyeOff,
  FileImage,
  Images,
  ChevronDown,
  MessageCircle,
  LayoutGrid,
  LayoutDashboard,
  List,
  CalendarRange,
  Palette,
  Columns2,
  MapPin,
  Frame,
  Grid3X3,
  Maximize,
  Minus,
  Copy,
  ClipboardPaste,
  Mic,
  MicOff,
  Highlighter,
  Menu,
  X as CloseIcon,
  Crop,
  Pencil
} from 'lucide-react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useMoodboardStore } from '@/components/creative';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/context/AuthContext';
import { getFirebaseFirestore } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ElementType, CanvasElement, Board, WithId, NotepadContent, PhotoGridContent, PhotoGridFreeContent, LibretaContent, TodoContent } from '@/lib/types';

type AuthUser = {
  uid?: string;
  displayName?: string | null;
};
import { useToast } from '@/hooks/use-toast';
import CreateBoardDialog from './create-board-dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { getSavedLinks } from '@/lib/saved-links';
import type { SavedLink } from '@/lib/saved-links';
import { AddLinkDialog } from './add-link-dialog';

// Paleta de colores para notas adhesivas (ordenada como paleta visual)
const PASTEL_COLORS = {
  'verde-teal': { bg: '#F8C1D9', name: 'Rosa Pastel', label: 'Rosa Pastel' },
  'morado-claro': { bg: '#e0cee0', name: 'Morado Claro', label: 'Morado Claro' },
  'azul': { bg: '#b3d9ff', name: 'Azul', label: 'Azul' },
  'calipso': { bg: '#28c4d8', name: 'Calipso', label: 'Calipso' },
  'verde': { bg: '#a8e6cf', name: 'Verde', label: 'Verde' },
  'menta': { bg: '#d9f99d', name: 'Verde Lima', label: 'Verde Lima' },
  'amarillo-dark': { bg: '#FFF4B8', name: 'Amarillo Pastel', label: 'Amarillo Pastel' },
  'amarillo': { bg: '#f2ed6d', name: 'Amarillo', label: 'Amarillo' },
  'coral': { bg: '#f26877', name: 'Coral', label: 'Coral' },
  'naranja-suave': { bg: '#fcad56', name: 'Naranja Suave', label: 'Naranja Suave' },
  'azul-suave': { bg: '#6693bc', name: 'Azul Suave', label: 'Azul Suave' },
  'amarillo-brillante': { bg: '#f9d616', name: 'Amarillo Brillante', label: 'Amarillo Brillante' },
  'amarillo-claro': { bg: '#f2ea87', name: 'Amarillo Claro', label: 'Amarillo Claro' },
} as const;

const stickyNoteColors = Object.entries(PASTEL_COLORS).map(([key, color]) => ({
  name: key,
  label: color.label,
  className: '',
  bg: color.bg,
}));

const SidebarButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & {
    label: string;
    icon?: React.ElementType;
    isActive?: boolean;
  }
>(({ label, icon: Icon, className, isActive, children, title, ...props }, ref) => {
  const isDictationActive = className?.includes('bg-red-500');
  const tooltipText = typeof title === 'string' && title.trim().length > 0 ? title : label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          variant="ghost"
          className={cn(
            'flex flex-col items-center justify-center h-auto py-[5px] px-[6px] w-[75px] text-[11px] gap-1',
            'hover:bg-[#ADD8E6] focus-visible:bg-[#ADD8E6] active:bg-white',
            'text-black border border-border rounded-md',
            'bg-white',
            isActive && 'bg-white border-accent-foreground',
            !isDictationActive && 'text-black',
            className
          )}
          style={{
            backgroundColor: isDictationActive ? '#ef4444' : (isActive ? '#ffffff' : '#ffffff'),
            color: '#000000',
            border: `1px solid ${isDictationActive ? '#ef4444' : (isActive ? 'hsl(var(--border))' : 'hsl(var(--border))')}`,
          }}
          {...props}
        >
          {children || (Icon && <Icon className={cn('size-[19px] flex-shrink-0', isDictationActive ? 'text-white' : 'text-black')} style={isDictationActive ? undefined : { color: '#000000' }} />)}
          <span className={cn('text-center leading-tight text-[10px] truncate text-black', isDictationActive ? 'text-white' : 'text-black')} style={{ color: '#000000', fontSize: '10px' }}>
            {label}
          </span>
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="bg-gray-100 text-black border border-gray-300 shadow-md"
      >
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
});

SidebarButton.displayName = 'SidebarButton';

interface ToolsSidebarProps {
  elements: WithId<CanvasElement>[];
  boards: WithId<Board>[];
  boardId: string;
  user: AuthUser | null;
  onUploadImage: () => void;
  onAddImageFromUrl: () => void;
  onOpenUrlDocDialog?: () => void;
  onCropImage: () => void;
  onAddImageFromUrlWithCrop: () => void;
  onPanToggle: () => void;
  onRenameBoard: () => void;
  onDeleteBoard: () => void;
  onDeleteAllUserImages: () => void;
  isListening: boolean;
  onToggleDictation: () => void;
  onSaveSelectionBeforeMic?: () => void;
  onOpenNotepad: (id: string) => void;
  onLocateElement: (id: string) => void;
  onAddComment: () => void;
  updateElement: (id: string, updates: Partial<CanvasElement>) => void;
  selectedElementIds: string[];
  addElement: (type: ElementType, content?: any) => void;
  selectElement?: (elementId: string) => void;
  clearCanvas: () => void;
  onExportBoardToPng: () => void;
  onFormatToggle: () => void;
  isFormatToolbarOpen: boolean;
  onOpenGlobalSearch: () => void;
  canvasScrollPosition: number;
  canvasScale: number;
  isGalleryPanelOpen: boolean;
  onToggleGalleryPanel: () => void;
  drawingMode?: {
    isDrawingMode: boolean;
    drawingColor: 'red' | 'white' | 'calipso' | 'fucsia' | 'purple';
    strokeWidth: 2 | 4 | 6;
    toggleDrawingMode: () => void;
    setColor: (color: 'red' | 'white' | 'calipso' | 'fucsia' | 'purple') => void;
    setStrokeWidth: (width: 2 | 4 | 6) => void;
    getColorHex: () => string;
    getStrokeWidth: () => number;
  };
  onCreateMiniBoard?: () => Promise<string | null>;
}
 
 const ToolsSidebar = forwardRef<HTMLDivElement, ToolsSidebarProps>(({
   elements,
   boards,
   boardId,
   user,
   onUploadImage,
   onAddImageFromUrl,
   onOpenUrlDocDialog,
   onCropImage,
   onAddImageFromUrlWithCrop,
   onPanToggle,
  onRenameBoard,
  onDeleteBoard,
   onDeleteAllUserImages,
   isListening,
   onToggleDictation,
   onSaveSelectionBeforeMic,
   onOpenNotepad,
   onLocateElement,
   onAddComment,
   updateElement,
   selectedElementIds,
   addElement,
   selectElement,
   clearCanvas,
   onExportBoardToPng,
   onFormatToggle,
   isFormatToolbarOpen,
   onOpenGlobalSearch,
   canvasScrollPosition,
   canvasScale,
   isGalleryPanelOpen,
   onToggleGalleryPanel,
  drawingMode,
  onCreateMiniBoard,
 }, ref) => {
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isHamburgerMenuOpen, setIsHamburgerMenuOpen] = useState(false);
  const [savedGuides, setSavedGuides] = useState<any[]>([]);
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [openAddLinkDialog, setOpenAddLinkDialog] = useState(false);
  const [rndPosition, setRndPosition] = useState(() => {
    // Posición inicial fija: 5px del tablero arriba en el centro visual del usuario
    if (typeof window !== 'undefined') {
      const centerX = (window.innerWidth - 988) / 2; // 988 es el ancho del menú
      const topY = 5; // 5px de distancia del borde superior (del tablero)
      return { x: Math.max(0, centerX), y: topY };
    }
    return { x: 20, y: 5 };
  });

  // Efecto para actualizar posición basada en localizador (solo si no hay posición guardada)
  useEffect(() => {
    // Solo usar localizador si no hay posición guardada en localStorage
    const savedPosition = localStorage.getItem('toolsSidebarPosition');
    if (savedPosition) {
      return; // Mantener la posición guardada
    }

    const menuLocator = elements.find((el) =>
      el.type === 'locator' &&
      typeof el.content === 'object' &&
      el.content !== null &&
      'label' in el.content &&
      el.content.label === 'inicio menu principal'
    );

    if (menuLocator && menuLocator.x !== undefined && menuLocator.y !== undefined) {
      // Copiar coordenadas del localizador y fijar como posición inicial del menú
      const newPosition = { x: menuLocator.x, y: menuLocator.y };

      // Guardar en localStorage para que sea persistente
      localStorage.setItem('toolsSidebarPosition', JSON.stringify(newPosition));

      // Actualizar la posición del menú
      setRndPosition(newPosition);

      console.log('✅ Menú principal fijado en posición del localizador:', newPosition);
    }
  }, [elements]);
  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem('toolsSidebarPosition');
      if (savedPosition) {
        const parsedPosition = JSON.parse(savedPosition);
        // Si la posición guardada no es la posición fija deseada (5px del borde superior),
        // usar la posición fija por defecto
        if (parsedPosition.y !== 5) {
          const defaultPosition = {
            x: typeof window !== 'undefined' ? Math.max(0, (window.innerWidth - 988) / 2) : 20,
            y: 5
          };
          setRndPosition(defaultPosition);
          localStorage.setItem('toolsSidebarPosition', JSON.stringify(defaultPosition));
        } else {
          setRndPosition(parsedPosition);
        }
      } else {
        // No hay posición guardada, usar posición fija por defecto
        const defaultPosition = {
          x: typeof window !== 'undefined' ? Math.max(0, (window.innerWidth - 988) / 2) : 20,
          y: 5
        };
        setRndPosition(defaultPosition);
        localStorage.setItem('toolsSidebarPosition', JSON.stringify(defaultPosition));
      }
    } catch (e) {
      console.error('Failed to load sidebar position from localStorage', e);
      // En caso de error, usar posición fija por defecto
      const defaultPosition = {
        x: typeof window !== 'undefined' ? Math.max(0, (window.innerWidth - 988) / 2) : 20,
        y: 5
      };
      setRndPosition(defaultPosition);
    }

    // El localizador "inicio menu principal" debe ser creado manualmente por el usuario
  }, [elements, addElement]);

  const onDragStop = (e: any, d: { x: number; y: number }) => {
    const newPosition = { x: d.x, y: d.y };
    setRndPosition(newPosition);
    try {
      localStorage.setItem('toolsSidebarPosition', JSON.stringify(newPosition));
    } catch (error) {
      console.error('Failed to save sidebar position to localStorage', error);
    }
  };

  const elementsOnCanvas = useMemo(
    () => (Array.isArray(elements) ? elements : []).filter((el) => ['notepad', 'yellow-notepad', 'notes', 'mini', 'libreta', 'dictado', 'block-dibujo'].includes(el.type) && el.hidden !== true),
    [elements]
  );

  const allLocators = useMemo(
    () => (Array.isArray(elements) ? elements : []).filter((el) => el.type === 'locator'),
    [elements]
  );


  const hiddenElements = useMemo(
    () => (Array.isArray(elements) ? elements : []).filter((el) => el.hidden === true),
    [elements]
  );

  // Solo cuadernos/notas ocultos (para el bloque \"Cerrados\" en Cuadernos)
  const hiddenNotebooks = useMemo(
    () =>
      hiddenElements.filter((el) =>
        ['notepad', 'yellow-notepad', 'notes', 'mini', 'libreta', 'dictado', 'block-dibujo'].includes(el.type)
      ),
    [hiddenElements]
  );

  const COPIED_KEY = 'micerebro-copied-element';

  const handleCopyElement = useCallback((e: React.MouseEvent, element: WithId<CanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const props = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
      const size = (props as any).size || { width: element.width ?? 300, height: element.height ?? 200 };
      const payload = {
        type: element.type,
        content: element.content != null ? JSON.parse(JSON.stringify(element.content)) : undefined,
        width: typeof size.width === 'number' ? size.width : (parseFloat(String(size.width)) || element.width) ?? 300,
        height: typeof size.height === 'number' ? size.height : (parseFloat(String(size.height)) || element.height) ?? 200,
        properties: element.properties != null ? JSON.parse(JSON.stringify(element.properties)) : undefined,
      };
      localStorage.setItem(COPIED_KEY, JSON.stringify(payload));
      toast({ title: 'Copiado', description: 'Elemento copiado. Puedes pegarlo en este u otro tablero.' });
    } catch (err) {
      console.error('Error al copiar elemento:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo copiar el elemento.' });
    }
  }, [toast]);

  const handlePasteElement = useCallback(async () => {
    try {
      const raw = localStorage.getItem(COPIED_KEY);
      if (!raw) {
        toast({
          variant: 'destructive',
          title: 'Nada para pegar',
          description: 'Copia primero un cuaderno, lista de tareas u otro elemento compatible.',
        });
        return;
      }
      const copied = JSON.parse(raw) as { type: ElementType; content?: any; width?: number; height?: number; properties?: any };
      const size = copied.properties?.size || (copied.width != null && copied.height != null ? { width: copied.width, height: copied.height } : undefined);
      await addElement(copied.type, {
        content: copied.content,
        properties: {
          ...(copied.properties || {}),
          ...(size && { size }),
        },
      });
      toast({ title: 'Pegado', description: 'Elemento pegado en el tablero.' });
    } catch (err: any) {
      console.error('Error al pegar elemento:', err);
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'No se pudo pegar el elemento.' });
    }
  }, [addElement, toast]);

  const handleMinimizeElement = useCallback((e: React.MouseEvent, element: WithId<CanvasElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const id = element.id;
    const props = typeof element.properties === 'object' && element.properties !== null ? element.properties : {};
    const size = (props as any).size || { width: element.width ?? 300, height: element.height ?? 200 };
    const w = typeof size.width === 'number' ? size.width : parseFloat(String(size.width)) || 300;
    const h = typeof size.height === 'number' ? size.height : parseFloat(String(size.height)) || 200;
    const currentSize = { width: w, height: h };
    const typesWithMinimized = ['notepad', 'yellow-notepad', 'notes', 'libreta', 'mini', 'dictado'];
    if (typesWithMinimized.includes(element.type)) {
      updateElement(id, {
        minimized: true,
        properties: { ...props, size: { width: w, height: 48 }, originalSize: currentSize },
      });
    } else {
      updateElement(id, { hidden: true });
    }
  }, [updateElement]);

  // Enlaces guardados (Link)
  useEffect(() => {
    setSavedLinks(getSavedLinks());
  }, []);
  const refreshSavedLinks = useCallback(() => {
    setSavedLinks(getSavedLinks());
  }, []);

  // Cargar guías de fotos guardadas
  const loadSavedGuides = async () => {
    if (!user?.uid) return;

    try {
      const firestore = getFirebaseFirestore();
      if (!firestore) return;

      const guidesRef = collection(firestore, 'users', user.uid, 'canvasBoards', boardId, 'canvasElements');
      const q = query(
        guidesRef,
        where('type', 'in', ['photo-grid', 'photo-grid-horizontal', 'photo-grid-adaptive', 'photo-grid-free'])
      );

      const snapshot = await getDocs(q);
      const guides = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          title: doc.data().content?.title || 'Guía sin título'
        }))
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

      setSavedGuides(guides);
    } catch (error) {
      console.error('Error loading saved guides:', error);
    }
  };

  // Cargar guías cuando cambie el boardId, el usuario o los elementos
  useEffect(() => {
    loadSavedGuides();
  }, [boardId, user?.uid]);

  // También cargar elementos locales que sean guías de fotos
  useEffect(() => {
    if (Array.isArray(elements)) {
      const localGuides = elements
        .filter(el => ['photo-grid', 'photo-grid-horizontal', 'photo-grid-adaptive', 'photo-grid-free'].includes(el.type))
        .map(el => ({
          id: el.id,
          type: el.type,
          title: el.content?.title || 'Guía sin título',
          updatedAt: el.updatedAt
        }));

      // Combinar con las guías de Firestore, evitando duplicados
      setSavedGuides(prev => {
        const combined = [...prev];
        localGuides.forEach(local => {
          if (!combined.find(c => c.id === local.id)) {
            combined.push(local);
          }
        });
        return combined.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      });
    }
  }, [elements]);

  const handleAddElement = async (type: ElementType, props?: any) => {
    try {
      await addElement(type, props);
      toast({
        title: 'Elemento creado',
        description: `Se ha creado un nuevo ${type}.`,
      });
    } catch (error: any) {
      console.error(`Error al crear elemento ${type}:`, error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || `No se pudo crear el elemento ${type}.`,
      });
    }
  };

  // Helpers para mejoras
  const getViewportCenter = () => {
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;
    return { centerX, centerY };
  };

  const getSelectedElementContent = () => {
    if (!selectedElementIds || selectedElementIds.length !== 1) return '';
    const el = elements.find(e => e.id === selectedElementIds[0]);
    if (!el) return '';
    if (el.type === 'notepad') {
      const content = el.content as any;
      if (content?.pages?.length) {
        const idx = content.currentPage || 0;
        return content.pages[idx] || '';
      }
      return content?.text || '';
    }
    if (el.type === 'text' || el.type === 'sticky') {
      return typeof el.content === 'string' ? el.content : '';
    }
    return '';
  };

  const handleTextEditorSave = async (newContent: string) => {
    return;
  };

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await firebaseSignOut(auth);
        toast({ title: 'Sesión cerrada correctamente' });
        // Redirigir a la página de inicio
        router.push('/');
      } else {
        toast({ variant: 'destructive', title: 'Error al cerrar sesión: autenticación no disponible' });
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast({ variant: 'destructive', title: 'Error al cerrar sesión' });
    }
  };

  // Si es móvil/tablet, mostrar menú hamburguesa centrado
  if (isMobile) {
    return (
      <>
        <CreateBoardDialog isOpen={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen} />

        {/* Botón hamburguesa centrado */}
        <div
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50"
          style={{ zIndex: 10000 }}
        >
          <button
            onClick={() => setIsHamburgerMenuOpen(!isHamburgerMenuOpen)}
            className="bg-background text-black border border-border p-2 rounded-full shadow-lg hover:bg-[#ADD8E6] active:bg-white transition-colors"
            title="Abrir menú"
          >
            {isHamburgerMenuOpen ? <CloseIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Menú hamburguesa desplegable */}
        {isHamburgerMenuOpen && (
          <div
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background text-black border border-border rounded-lg shadow-xl z-40 max-w-sm w-full mx-4"
            style={{ zIndex: 9999 }}
          >
            <div className="p-4 max-h-96 overflow-y-auto">
              {/* Aquí irá el contenido del menú hamburguesa */}
              <div className="space-y-2">
                {/* Botón Dictar */}
                <SidebarButton
                  icon={isListening ? MicOff : Mic}
                  label={isListening ? 'Detener' : 'Dictar'}
                  title={isListening ? 'Detener dictado por voz' : 'Iniciar dictado por voz'}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onToggleDictation) {
                      onToggleDictation();
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSaveSelectionBeforeMic?.();
                  }}
                  className={cn(
                    'w-full justify-start hover:bg-[#ADD8E6] active:bg-white',
                    isListening && 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 animate-pulse'
                  )}
                />

                {/* Cuaderno */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center gap-2 p-2 hover:bg-[#ADD8E6] active:bg-white rounded text-left">
                      <BookCopy className="w-4 h-4" />
                      <span>Cuaderno</span>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="center" className="w-56 max-h-[70vh] overflow-y-auto">
                    <DropdownMenuItem onClick={handlePasteElement}>
                      <ClipboardPaste className="mr-2 h-4 w-4" />
                      <span>Pegar</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAddElement('notepad')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Agregar Cuaderno</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('yellow-notepad')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Nuevo Block</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('notes')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Agregar Apuntes</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('libreta')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Libreta</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('mini')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Mini</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('dictado')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>iPhone</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('block-dibujo')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>BLOCK DIBUJO</span>
                    </DropdownMenuItem>
                    {elementsOnCanvas.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <span>Elementos Abiertos ({elementsOnCanvas.length})</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {elementsOnCanvas.map((element) => {
                              let title = 'Sin título';
                              switch (element.type) {
                                case 'notepad': {
                                  const notepadContent = element.content as NotepadContent;
                                  title = notepadContent?.title || 'Cuaderno';
                                  break;
                                }
                                case 'yellow-notepad':
                                  title = 'Cuaderno Amarillo';
                                  break;
                                case 'notes':
                                  title = 'Apuntes';
                                  break;
                                case 'libreta': {
                                  const libretaContent = element.content as LibretaContent;
                                  title = libretaContent?.title || 'Libreta';
                                  break;
                                }
                                case 'mini':
                                  title = 'Mini';
                                  break;
                                case 'dictado': {
                                  const dictadoContentOpen = element.content as any;
                                  title = dictadoContentOpen?.title || 'iPhone';
                                  break;
                                }
                                case 'block-dibujo': {
                                  const blockDibujoContent = element.content as any;
                                  title = blockDibujoContent?.title || 'BLOCK DIBUJO';
                                  break;
                                }
                                default:
                                  title = 'Elemento';
                              }
                              return (
                                <DropdownMenuItem
                                  key={element.id}
                                  onClick={() => onLocateElement(element.id)}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="flex-1 truncate">{title}</span>
                                  <div className="flex items-center gap-0.5 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      title="Copiar"
                                      onClick={(e) => handleCopyElement(e, element)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6"
                                      title="Minimizar"
                                      onClick={(e) => handleMinimizeElement(e, element)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </DropdownMenuItem>
                              );
                            })}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fotos */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center gap-2 p-2 hover:bg-[#ADD8E6] active:bg-white rounded text-left">
                      <ImageIcon className="w-4 h-4" />
                      <span>Fotos</span>
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="center" className="w-56">
                    <DropdownMenuItem onClick={() => handleAddElement('image')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Imagen</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('gallery')}>
                      <Images className="mr-2 h-4 w-4" />
                      <span>Galería</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Tareas */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-full flex items-center gap-2 p-2 hover:bg-[#ADD8E6] active:bg-white rounded text-left"
                    >
                      <List className="w-4 h-4" />
                      <span>Lista de Tareas</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" sideOffset={5}>
                    <DropdownMenuItem onClick={() => handleAddElement('todo')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Lista de Tareas</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('time-list')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Time List</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleAddElement('timer-lista')}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Timer Lista</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sticky Note */}
                <button
                  className="w-full flex items-center gap-2 p-2 hover:bg-[#ADD8E6] active:bg-white rounded text-left"
                  onClick={() => handleAddElement('sticky')}
                >
                  <StickyNote className="w-4 h-4" />
                  <span>Nota Adhesiva</span>
                </button>

                {/* Contenedor */}
                <button
                  className="w-full flex items-center gap-2 p-2 hover:bg-[#ADD8E6] active:bg-white rounded text-left"
                  onClick={() => handleAddElement('container')}
                >
                  <Frame className="w-4 h-4" />
                  <span>Contenedor</span>
                </button>

              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Menú normal para desktop
  return (
    <>
      <CreateBoardDialog isOpen={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen} />
      <Rnd
        default={{
          x: rndPosition.x,
          y: rndPosition.y,
          width: 988,
          height: 110,
        }}
        minWidth={988}
        maxWidth={1214}
        bounds="window"
        dragHandleClassName="drag-handle"
        onDragStop={onDragStop}
        className="z-[10003]"
      >
        <div className="flex flex-row gap-[2px] flex-nowrap justify-start p-2">
          <div className="drag-handle cursor-grab active:cursor-grabbing py-1 px-1 mr-1 rounded-md bg-background border border-border flex justify-center" title="Arrastrar menú">
            <GripVertical className="size-3 rotate-90 text-black" />
          </div>

          {/* Tableros */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={LayoutDashboard} label="Tableros" title="Gestionar tableros" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={() => setIsCreateBoardOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Nuevo Tablero</span>
              </DropdownMenuItem>
              {onCreateMiniBoard && (
                <DropdownMenuItem onClick={async () => {
                  const id = await onCreateMiniBoard();
                  if (id) router.push(`/board/${id}/`);
                }}>
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  <span>+ Tablero Mini</span>
                </DropdownMenuItem>
              )}
              {boards.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <span>Abrir Tablero...</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {boards.map((board) => (
                      <DropdownMenuItem key={board.id} onClick={() => router.push(`/board/${board.id}`)}>
                        <span>{board.name || 'Sin nombre'}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Botón Dictar */}
          <SidebarButton
            icon={isListening ? MicOff : Mic}
            label={isListening ? 'Detener' : 'Dictar'}
            title={isListening ? 'Detener dictado por voz' : 'Iniciar dictado por voz'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (onToggleDictation) {
                onToggleDictation();
              }
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              onSaveSelectionBeforeMic?.();
            }}
            className={cn(
              isListening && 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
            )}
          />

          {/* Cuaderno */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={BookCopy} label="Cuadernos" title="Gestionar cuadernos y notas" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem
                onClick={handlePasteElement}
                title="Pega aquí cuadernos, listas de tareas u otros elementos copiados entre tableros"
              >
                <ClipboardPaste className="mr-2 h-4 w-4" />
                <span>Pegar</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddElement('notepad')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Agregar Cuaderno</span>
              </DropdownMenuItem>
              {/* <DropdownMenuItem onClick={() => handleAddElement('cuaderno')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>A3</span>
              </DropdownMenuItem> */} {/* DESACTIVADO - causando problemas */}
              <DropdownMenuItem onClick={() => handleAddElement('yellow-notepad')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Nuevo Block</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('notes')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Agregar Apuntes</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('libreta')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Libreta</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('mini')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Mini</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('dictado')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>iPhone</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('block-dibujo')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>BLOCK DIBUJO</span>
              </DropdownMenuItem>
              {elementsOnCanvas.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Elementos Abiertos ({elementsOnCanvas.length})</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {elementsOnCanvas.map((element) => {
                        let title = 'Sin título';
                        switch (element.type) {
                          case 'notepad':
                            const notepadContent = element.content as NotepadContent;
                            title = notepadContent?.title || 'Cuaderno';
                            break;
                          case 'yellow-notepad':
                            title = 'Cuaderno Amarillo';
                            break;
                          // case 'cuaderno': // DESACTIVADO - causando problemas
                          //   const cuadernoContent = element.content as NotepadContent;
                          //   title = cuadernoContent?.title || 'Cuaderno A3';
                          //   break;
                          case 'photo-grid':
                          case 'photo-grid-horizontal':
                          case 'photo-grid-adaptive':
                            const photoGridContent = element.content as PhotoGridContent;
                            title = photoGridContent?.title || 'Guía de Fotos';
                            break;
                          case 'photo-grid-free':
                            const photoGridFreeContent = element.content as PhotoGridFreeContent;
                            title = photoGridFreeContent?.title || 'Guía de Fotos Libre';
                            break;
                          case 'notes':
                            title = 'Apuntes';
                            break;
                          case 'libreta':
                            const libretaContent = element.content as LibretaContent;
                            title = libretaContent?.title || 'Libreta';
                            break;
                          case 'mini':
                            title = 'Mini';
                            break;
                          case 'dictado':
                            const dictadoContentOpen = element.content as any;
                            title = dictadoContentOpen?.title || 'iPhone';
                            break;
                          case 'block-dibujo': {
                            const blockDibujoContent = element.content as any;
                            title = blockDibujoContent?.title || 'BLOCK DIBUJO';
                            break;
                          }
                          default:
                            title = 'Elemento';
                        }
                        return (
                          <DropdownMenuItem
                            key={element.id}
                            onClick={() => onLocateElement(element.id)}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="flex-1 truncate">{title}</span>
                            <div className="flex items-center gap-0.5 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title="Copiar"
                                onClick={(e) => handleCopyElement(e, element)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                title="Minimizar"
                                onClick={(e) => handleMinimizeElement(e, element)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              {hiddenNotebooks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Cerrados ({hiddenNotebooks.length})</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {hiddenNotebooks.map((element) => {
                        let title = 'Sin título';
                        switch (element.type) {
                          case 'notepad':
                          case 'yellow-notepad':
                            const notepadContent = element.content as NotepadContent;
                            title = notepadContent?.title || 'Cuaderno';
                            break;
                          case 'libreta':
                            const libretaContent = element.content as LibretaContent;
                            title = libretaContent?.title || 'Libreta';
                            break;
                          case 'notes':
                            title = 'Apuntes';
                            break;
                          case 'mini':
                            title = 'Mini';
                            break;
                          case 'dictado':
                            const dictadoContentHidden = element.content as any;
                            title = dictadoContentHidden?.title || 'iPhone';
                            break;
                          case 'block-dibujo': {
                            const blockDibujoContentHidden = element.content as any;
                            title = blockDibujoContentHidden?.title || 'BLOCK DIBUJO';
                            break;
                          }
                          default:
                            title = 'Elemento';
                        }
                        return (
                          <DropdownMenuItem key={element.id} onClick={() => onOpenNotepad(element.id)}>
                            <EyeOff className="mr-2 h-4 w-4" />
                            <span>{title}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notas adhesivas (solo Tipo 2 - Header Compacto) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={StickyNote} label="Notas" title="Crear notas adhesivas" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5} className="max-h-[600px] overflow-y-auto">
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">Notas adhesivas</div>
              <div className="grid grid-cols-5 gap-2 px-3 pb-3">
                {stickyNoteColors.map((color) => (
                  <DropdownMenuItem 
                    key={`sticky-${color.name}`} 
                    onClick={() => handleAddElement('sticky', { color: color.name, properties: { variant: 'type2' } })}
                    className="flex items-center justify-center cursor-pointer"
                  >
                    <div className="w-4 h-4 rounded-md border border-gray-200/50" style={{ backgroundColor: color.bg }} />
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* To-do */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton
                icon={List}
                label="To-do"
                title="Crear o pegar lista de tareas"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={handlePasteElement}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                <span>Pegar</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <List className="mr-2 h-4 w-4" />
                  <span>Lista de Tareas</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => handleAddElement('todo')}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Lista de Tareas</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddElement('time-list')}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Time List</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddElement('timer-lista')}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Timer Lista</span>
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Link */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={LinkIcon} label="Link" title="Páginas guardadas" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5} className="w-56">
              <DropdownMenuItem onClick={() => setOpenAddLinkDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Agregar página</span>
              </DropdownMenuItem>
              {savedLinks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {savedLinks.map((link) => (
                    <DropdownMenuItem
                      key={link.id}
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      <LinkIcon className="mr-2 h-4 w-4 text-slate-600" />
                      <span className="truncate">{link.name}</span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <AddLinkDialog
            open={openAddLinkDialog}
            onOpenChange={setOpenAddLinkDialog}
            onSaved={refreshSavedLinks}
          />

          {/* Contenedor */}
          <SidebarButton
            icon={Columns2}
            label="Columna"
            title="Crear contenedor para elementos"
            onClick={() => handleAddElement('container')}
          />

          {/* Localizador */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={MapPin} label="Localizar" title="Gestionar localizadores" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5} className="w-56">
              <DropdownMenuItem onClick={() => handleAddElement('locator')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Nuevo Localizador</span>
              </DropdownMenuItem>
              {allLocators.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">
                    Localizadores ({allLocators.length})
                  </div>
                  {allLocators.map((loc) => {
                    const label =
                      typeof loc.content === 'object' && loc.content && (loc.content as any).label
                        ? (loc.content as any).label
                        : 'Localizador';
                    return (
                      <DropdownMenuItem key={loc.id} onClick={() => onLocateElement(loc.id)}>
                        <MapPin className="mr-2 h-4 w-4 text-slate-600" />
                        <span className="truncate">{label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Imagen */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={ImageIcon} label="Imagen" title="Agregar imágenes" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={onAddImageFromUrl}>
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>Desde URL</span>
              </DropdownMenuItem>
              {onOpenUrlDocDialog && (
                <DropdownMenuItem onClick={onOpenUrlDocDialog}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>+ URL docs</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onUploadImage}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Subir</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('image-frame')}>
                <Frame className="mr-2 h-4 w-4" />
                <span>Marco de foto</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onCropImage}>
                <Crop className="mr-2 h-4 w-4" />
                <span>Subir + Crop</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddImageFromUrlWithCrop}>
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>Desde URL + Crop</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Lápiz */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton
                icon={Pencil}
                label="Lápiz"
                title={drawingMode?.isDrawingMode ? "Desactivar modo dibujo" : "Activar modo dibujo"}
                isActive={drawingMode?.isDrawingMode}
                className={drawingMode?.isDrawingMode ? 'bg-teal-100 border-teal-500' : ''}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={() => drawingMode?.toggleDrawingMode()}>
                {drawingMode?.isDrawingMode ? 'Desactivar' : 'Activar'} modo dibujo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">Colores:</div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem onClick={() => drawingMode?.setColor('red')}>
                    <div className="w-4 h-4 rounded-full mr-2 border border-gray-300" style={{ backgroundColor: '#ef4444' }} />
                    <span>Rojo</span>
                    {drawingMode?.drawingColor === 'red' && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>Rojo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem onClick={() => drawingMode?.setColor('white')}>
                    <div className="w-4 h-4 rounded-full mr-2 border border-gray-300 bg-white" />
                    <span>Blanco</span>
                    {drawingMode?.drawingColor === 'white' && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>Blanco</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem onClick={() => drawingMode?.setColor('calipso')}>
                    <div className="w-4 h-4 rounded-full mr-2 border border-gray-300" style={{ backgroundColor: '#28c4d8' }} />
                    <span>Calipso</span>
                    {drawingMode?.drawingColor === 'calipso' && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>Calipso</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem onClick={() => drawingMode?.setColor('fucsia')}>
                    <div className="w-4 h-4 rounded-full mr-2 border border-gray-300" style={{ backgroundColor: '#e91e8c' }} />
                    <span>Fucsia</span>
                    {drawingMode?.drawingColor === 'fucsia' && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>Fucsia</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuItem onClick={() => drawingMode?.setColor('purple')}>
                    <div className="w-4 h-4 rounded-full bg-purple-500 mr-2 border border-gray-300" />
                    <span>Morado</span>
                    {drawingMode?.drawingColor === 'purple' && <span className="ml-auto text-xs">✓</span>}
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>Morado</TooltipContent>
              </Tooltip>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs text-gray-500 font-medium">Grosor:</div>
              <DropdownMenuItem onClick={() => drawingMode?.setStrokeWidth(2)}>
                <div className="w-6 h-1 rounded-full bg-gray-700 mr-2" style={{ height: 2 }} />
                <span>Fino</span>
                {drawingMode?.strokeWidth === 2 && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => drawingMode?.setStrokeWidth(4)}>
                <div className="w-6 rounded-full bg-gray-700 mr-2" style={{ height: 4 }} />
                <span>Medio</span>
                {drawingMode?.strokeWidth === 4 && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => drawingMode?.setStrokeWidth(6)}>
                <div className="w-6 rounded-full bg-gray-700 mr-2" style={{ height: 6 }} />
                <span>Grueso</span>
                {drawingMode?.strokeWidth === 6 && <span className="ml-auto text-xs">✓</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAddElement('block-dibujo')}>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Crear BLOCK DIBUJO</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mi Plan */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={CalendarRange} label="Mi Plan" title="Herramientas de planificación" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5} className="w-52">
              <DropdownMenuItem
                onClick={() => handleAddElement('weekly-planner')}
                className="flex items-start gap-3"
              >
                <CalendarRange className="h-4 w-4 mt-0.5 text-slate-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Plan Semanal</span>
                  <span className="text-xs text-slate-500">Vista completa de lunes a domingo</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleAddElement('vertical-weekly-planner')}
                className="flex items-start gap-3"
              >
                <CalendarRange className="h-4 w-4 mt-0.5 text-teal-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Menú Semanal</span>
                  <span className="text-xs text-slate-500">Plantilla vertical tamaño carta</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Guía Fotos */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton
                icon={Grid3X3}
                label="Guia Fotos"
                title="Herramientas para organizar fotos"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5} className="w-44">
              <DropdownMenuItem onClick={() => handleAddElement('photo-grid')}>
                Cuadrada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('photo-grid-horizontal')}>
                Horizontal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('photo-grid-adaptive')}>
                Adaptable
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('photo-grid-free')}>
                Libre
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('image-frame')}>
                Marco de fotos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('moodboard')}>
                Moodboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  Lista de guías
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={10}>
                  {savedGuides.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No hay guías guardadas
                    </DropdownMenuItem>
                  ) : (
                    savedGuides
                      .filter((guide) =>
                        ['photo-grid', 'photo-grid-horizontal', 'photo-grid-adaptive', 'photo-grid-free'].includes(
                          guide.type as string
                        )
                      )
                      .map((guide) => (
                        <DropdownMenuItem
                          key={guide.id}
                          onClick={() => {
                            if (selectElement) {
                              selectElement(guide.id);
                            }
                          }}
                        >
                          {guide.title}
                        </DropdownMenuItem>
                      ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Subir (icono carpeta) */}
          <SidebarButton
            icon={Folder}
            label="Subir"
            title="Subir imagen"
            onClick={onUploadImage}
          />

          {/* Tools */}
          <SidebarButton icon={Wrench} label="Tools" title="Herramientas de formato" onClick={onFormatToggle} isActive={isFormatToolbarOpen} />


          {/* Más */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={MoreHorizontal} label="Más" title="Más opciones" className="!w-[62px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuLabel>Texto</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleAddElement('text', { properties: { backgroundColor: '#ffffff' } })}>
                <MessageCircle className="mr-2 h-4 w-4" />
                Texto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('highlight-text')}>
                <Highlighter className="mr-2 h-4 w-4" />
                Texto destacado
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('comment-small')}>
                Añadir texto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('comment-r')}>
                Comentario R
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExportBoardToPng} className={isFormatToolbarOpen ? "bg-[#ADD8E6]/20" : ""}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>Exportar a PNG: alta resolución</span>
                {isFormatToolbarOpen && <span className="ml-auto text-xs text-blue-600">●</span>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeleteAllUserImages}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Eliminar todas mis imágenes</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Eliminar Tablero</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará permanentemente este tablero y todo su contenido. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDeleteBoard}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sí, eliminar tablero
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Limpiar Tablero</span>
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará todos los elementos del tablero. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearCanvas}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sí, limpiar tablero
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Rnd>

    </>
  );
});

ToolsSidebar.displayName = 'ToolsSidebar';

export default ToolsSidebar;
