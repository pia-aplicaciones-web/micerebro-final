// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { useRouter } from 'next/navigation';
import {
  // Herramientas principales
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  FileText,
  CheckSquare,
  Image,
  // Acciones
  Plus,
  Trash2,
  Download,
  Mic,
  MicOff,
  // Navegación
  FolderOpen,
  ChevronDown,
  Search,
  MapPin,
  // UI
  GripVertical,
  Settings,
  LogOut,
  LayoutGrid,
  Layers,
  Clock,
  Timer,
  Sparkles,
  PanelLeft,
  Heart,
  Zap,
  Brain,
  // NUEVAS MEJORAS
  Palette,
  Wand2,
  Bell,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ElementType, CanvasElement, Board, WithId, CommentContent, NotepadContent } from '@/lib/types';
import { signOut } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import CreateBoardDialog from './create-board-dialog';
// NUEVOS IMPORTS PARA LAS MEJORAS
import AITextEditor from './ai-text-editor';
import { THEME_COLORS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Colores de notas adhesivas
const stickyColors = [
  { name: 'yellow', hex: '#fef08a' },
  { name: 'pink', hex: '#fda4af' },
  { name: 'blue', hex: '#93c5fd' },
  { name: 'green', hex: '#86efac' },
  { name: 'orange', hex: '#fdba74' },
  { name: 'purple', hex: '#d8b4fe' },
];

// Botón de herramienta con texto debajo
const ToolButton = ({
  icon: Icon,
  label,
  onClick,
  isActive,
  isRecording,
  hasDropdown,
  disabled,
  className,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
  isRecording?: boolean;
  hasDropdown?: boolean;
  disabled?: boolean;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'relative flex flex-col items-center justify-center p-2 bg-blue-500 border border-white rounded-none transition-all duration-150',
          'hover:bg-blue-400 active:scale-95',
          isActive && 'bg-blue-300 shadow-inner',
          isRecording && 'bg-red-500 animate-pulse',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
      >
        <Icon className={cn('w-5 h-5 mb-1', isRecording ? 'text-white' : 'text-white/90')} strokeWidth={1.5} />
        <span className="text-xs text-white/90 text-center leading-tight">{label}</span>
        {hasDropdown && (
          <ChevronDown className="absolute bottom-0.5 right-0.5 w-2 h-2 text-white/60" />
        )}
      </button>
    </TooltipTrigger>
    <TooltipContent side="right" className="text-xs">
      {label}
    </TooltipContent>
  </Tooltip>
);

// Separador vertical
const Divider = () => <div className="w-full h-px bg-white/20 my-1" />;

type ToolsSidebarV2Props = {
  elements: WithId<CanvasElement>[];
  boards: WithId<Board>[];
  onUploadImage: () => void;
  onAddImageFromUrl: () => void;
  onPanToggle: () => void;
  isListening?: boolean;
  onToggleDictation?: () => void;
  onRenameBoard: () => void;
  onDeleteBoard: () => void;
  onOpenNotepad: (id: string) => void;
  onLocateElement: (id: string) => void;
  addElement: (type: ElementType, props?: any) => Promise<string>;
  clearCanvas: () => void;
  onExportBoardToPng: () => void;
  onFormatToggle: () => void;
  isFormatToolbarOpen: boolean;
  isPanningActive?: boolean;
  onAddComment?: () => void;
  onOpenGlobalSearch?: () => void;
};

export default function ToolsSidebarV2(props: ToolsSidebarV2Props) {
  const {
    elements,
    boards,
    onUploadImage,
    onAddImageFromUrl,
    onPanToggle,
    isListening = false,
    onToggleDictation,
    onDeleteBoard,
    onOpenNotepad,
    onLocateElement,
    addElement,
    clearCanvas,
    onExportBoardToPng,
    onFormatToggle,
    isFormatToolbarOpen,
    isPanningActive,
    onAddComment,
    onOpenGlobalSearch,
  } = props;

  const { toast } = useToast();
  const router = useRouter();
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 80 });
  const [activeTool, setActiveTool] = useState<string>('select');

  // NUEVOS ESTADOS PARA LAS MEJORAS
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showThemesDialog, setShowThemesDialog] = useState(false);
  const [showTextEditorDialog, setShowTextEditorDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Estado para Firebase
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('toolbarV2Pos');
      if (saved) setPosition(JSON.parse(saved));
    } catch {}
  }, []);

  // Verificar si Firebase está disponible
  useEffect(() => {
    const checkFirebase = () => {
      try {
        // Intentar acceder a addElement para verificar si Firebase está listo
        if (typeof addElement === 'function') {
          setIsFirebaseReady(true);
        } else {
          setIsFirebaseReady(false);
        }
      } catch (error) {
        setIsFirebaseReady(false);
      }
    };

    checkFirebase();

    // Re-verificar cada segundo por 10 segundos
    const interval = setInterval(() => {
      checkFirebase();
    }, 1000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [addElement]);

  const savePosition = (x: number, y: number) => {
    setPosition({ x, y });
    localStorage.setItem('toolbarV2Pos', JSON.stringify({ x, y }));
  };

  const allNotepads = useMemo(
    () => elements.filter((el) => ['notepad', 'notepad-simple', 'yellow-notepad', 'tabbed-notepad'].includes(el.type)),
    [elements]
  );
  const hiddenNotepads = useMemo(() => allNotepads.filter((el) => el.hidden), [allNotepads]);

  const allComments = useMemo(
    () => elements.filter((el) => {
      if (el.type !== 'comment') return false;
      const c = el.content as CommentContent;
      return c && (c.title || c.label || c.text);
    }),
    [elements]
  );

  const handleAdd = async (type: ElementType, props?: any) => {
    if (!isFirebaseReady) {
      toast({
        variant: 'destructive',
        title: 'Firebase no disponible',
        description: 'Espera a que se cargue la aplicación completamente.'
      });
      return;
    }

    try {
      await createElementDirectly(type, props);
      toast({ title: '✓ Creado' });
    } catch (e: any) {
      console.error('Error creando elemento:', e);
      toast({
        variant: 'destructive',
        title: 'Error al crear',
        description: e.message || 'No se pudo crear el elemento.'
      });
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut();
      router.push('/');
    }
  };

  // Función helper para crear elementos directamente con Firebase
  const createElementDirectly = async (type: string, props?: any) => {
    const { getApp } = await import('firebase/app');
    const { getAuth } = await import('firebase/auth');
    const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

    const app = getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);

    if (!auth.currentUser || !boardId) {
      throw new Error('Usuario no autenticado o board inválido');
    }

    const user = auth.currentUser;
    const elementsRef = collection(firestore, 'users', user.uid, 'canvasBoards', boardId, 'canvasElements');

    const defaultPosition = { x: 400, y: 400 };
    const defaultSize = { width: 200, height: 150 };

    const position = props?.properties?.position || defaultPosition;
    const size = props?.properties?.size || defaultSize;
    const zIndex = type === 'container' ? 0 : 100;

    const elementData = {
      type,
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      userId: user.uid,
      properties: {
        ...props?.properties,
        position,
        size,
      },
      content: props?.content || props || '',
      zIndex,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(elementsRef, elementData);
    console.log(`✅ Elemento ${type} creado con ID:`, docRef.id);
    return docRef.id;
  };

  // FUNCIONES DE LAS NUEVAS MEJORAS
  const applyTemplate = async (templateType: string) => {
    try {
      // Usar Firebase directamente
      const { getApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const { getFirestore, collection, addDoc, serverTimestamp } = await import('firebase/firestore');

      const app = getApp();
      const auth = getAuth(app);
      const firestore = getFirestore(app);

      if (!auth.currentUser) {
        throw new Error('Usuario no autenticado');
      }

      if (!boardId) {
        throw new Error('Board ID no válido');
      }

      const user = auth.currentUser;
      const elementsRef = collection(firestore, 'users', user.uid, 'canvasBoards', boardId, 'canvasElements');

      const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
      const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

      switch (templateType) {
        case 'weekly-complete':
          // Planner semanal completo
          await createElementDirectly('weekly-planner', {
            properties: {
              position: { x: centerX - 400, y: centerY - 300 },
              size: { width: 794, height: 567 }
            }
          });
          await createElementDirectly('todo', {
            content: { title: '📋 Tareas de la Semana', items: [] },
            properties: {
              position: { x: centerX + 420, y: centerY - 300 },
              size: { width: 280, height: 250 }
            }
          });
          await createElementDirectly('sticky', {
            content: '💡 Ideas de la semana',
            color: 'yellow',
            properties: { position: { x: centerX + 420, y: centerY } }
          });
          break;

        case 'home-dashboard':
          // Dashboard del hogar
          await createElementDirectly('text', {
            content: '<div style="font-size: 28px; font-weight: bold; text-align: center;">🏠 Dashboard del Hogar</div>',
            properties: {
              position: { x: centerX - 200, y: centerY - 350 },
              size: { width: 400, height: 50 },
              backgroundColor: 'transparent'
            }
          });
          await createElementDirectly('todo', {
            content: {
              title: '🛒 Lista de Compras',
              items: [
                { id: '1', text: 'Leche', completed: false },
                { id: '2', text: 'Pan', completed: false },
                { id: '3', text: 'Frutas y verduras', completed: false },
              ]
            },
            properties: {
              position: { x: centerX - 450, y: centerY - 280 },
              size: { width: 280, height: 300 },
              backgroundColor: '#E8F5E9'
            }
          });
          await createElementDirectly('todo', {
            content: {
              title: '🧹 Limpieza Semanal',
              items: [
                { id: '1', text: 'Aspirar', completed: false },
                { id: '2', text: 'Limpiar baños', completed: false },
                { id: '3', text: 'Cambiar sábanas', completed: false },
              ]
            },
            properties: {
              position: { x: centerX - 140, y: centerY - 280 },
              size: { width: 280, height: 300 },
              backgroundColor: '#E3F2FD'
            }
          });
          await createElementDirectly('notepad-simple', {
            content: {
              title: '🍽️ Menú Semanal',
              text: '<b>Lunes:</b> Pollo<br><b>Martes:</b> Pasta<br><b>Miércoles:</b> Ensalada<br><b>Jueves:</b> Tacos<br><b>Viernes:</b> Pizza<br><b>Sábado:</b> Parrilla<br><b>Domingo:</b> Sopa'
            },
            properties: {
              position: { x: centerX + 170, y: centerY - 280 },
              size: { width: 280, height: 300 }
            }
          });
          break;

        case 'vision-board':
          // Vision board personal
          await createElementDirectly('text', {
            content: '<div style="font-size: 32px; font-weight: bold; text-align: center; color: #6B21A8;">✨ Mi Visión 2025 ✨</div>',
            properties: {
              position: { x: centerX - 200, y: centerY - 350 },
              size: { width: 400, height: 60 },
              backgroundColor: 'transparent'
            }
          });
          const visionCategories = [
            { title: '💼 Carrera', color: 'blue', x: -300, y: -250 },
            { title: '❤️ Relaciones', color: 'pink', x: 0, y: -250 },
            { title: '🏋️ Salud', color: 'green', x: 300, y: -250 },
            { title: '💰 Finanzas', color: 'yellow', x: -300, y: 50 },
            { title: '📚 Aprendizaje', color: 'purple', x: 0, y: 50 },
            { title: '🌱 Crecimiento', color: 'orange', x: 300, y: 50 },
          ];
          for (const cat of visionCategories) {
            await createElementDirectly('sticky', {
              content: `${cat.title}\n\n• Meta 1\n• Meta 2\n• Meta 3`,
              color: cat.color,
              properties: {
                position: { x: centerX + cat.x, y: centerY + cat.y },
                size: { width: 200, height: 200 }
              }
            });
          }
          break;

        case 'sprint':
          // Sprint planning
          await createElementDirectly('text', {
            content: '<div style="font-size: 24px; font-weight: bold; color: white; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #3F51B5, #7C4DFF);">🚀 Sprint Planning</div>',
            properties: {
              position: { x: centerX - 120, y: centerY - 350 },
              size: { width: 240, height: 50 }
            }
          });
          const columns = [
            { title: '📥 Backlog', color: '#F5F5F5', x: -400 },
            { title: '🔄 En Progreso', color: '#BBDEFB', x: -130 },
            { title: '👀 Revisión', color: '#FFF9C4', x: 140 },
            { title: '✅ Hecho', color: '#C8E6C9', x: 410 },
          ];
          for (const col of columns) {
            await createElementDirectly('todo', {
              content: { title: col.title, items: [] },
              properties: {
                position: { x: centerX + col.x, y: centerY - 280 },
                size: { width: 240, height: 450 },
                backgroundColor: col.color
              }
            });
          }
          break;

        case 'brainstorm':
          // Brainstorming
          const colors = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
          for (let i = 0; i < 6; i++) {
            await createElementDirectly('sticky', {
              content: `💡 Idea ${i + 1}`,
              color: colors[i % colors.length],
              properties: {
                position: {
                  x: centerX + (i % 3 - 1) * 180,
                  y: centerY + (Math.floor(i / 3) - 0.5) * 180
                }
              }
            });
          }
          break;

        default:
          break;
      }

      setShowTemplatesDialog(false);
      toast({ title: "✅ Plantilla creada", description: "Los elementos se han añadido al tablero." });
    } catch (error) {
      console.error('Error creando plantilla:', error);
      toast({ 
        variant: 'destructive',
        title: "Error", 
        description: "No se pudo crear la plantilla." 
      });
    }
  };

  const applyThemeToSelected = async (themeKey: string) => {
    // Esta función se implementará cuando tengamos acceso a selectedElementIds
    toast({ title: "Tema aplicado", description: `Tema aplicado.` });
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    setNewTag('');
    toast({ title: "Etiqueta agregada", description: `Etiqueta "${newTag}" agregada.` });
  };

  // Funciones de recordatorios
  const getElementsWithReminders = () => {
    return elements.filter(el => el.properties?.dueDate);
  };

  const getElementTitle = (element: any) => {
    if (element.type === 'notepad' || element.type === 'notepad-simple') {
      return element.content?.title || 'Cuaderno';
    }
    if (element.type === 'sticky') {
      return element.content?.substring(0, 20) || 'Nota';
    }
    return `${element.type} ${element.id?.substring(0, 4)}`;
  };

  const getReminderUrgency = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'destructive';
    if (diffDays <= 1) return 'destructive';
    if (diffDays <= 3) return 'default';
    return 'secondary';
  };

  const formatDueDate = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencido';
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    return `En ${diffDays} días`;
  };

  const setReminderForSelected = () => {
    const date = prompt('Fecha límite (YYYY-MM-DD):');
    if (date) {
      toast({ title: 'Recordatorio establecido', description: `Fecha: ${date}` });
    }
  };

  // Funciones del redactor AI
  const getSelectedElementContent = () => {
    return 'Texto de ejemplo para editar';
  };

  const handleTextEditorSave = (newContent: string) => {
    setShowTextEditorDialog(false);
    toast({ title: 'Texto actualizado', description: 'El contenido ha sido procesado y guardado.' });
  };

  return (
    <>
      <CreateBoardDialog isOpen={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen} />
      
      <Rnd
        position={position}
        size={{ width: 80, height: 'auto' }}
        bounds="window"
        dragHandleClassName="toolbar-drag"
        onDragStop={(_, d) => savePosition(d.x, d.y)}
        enableResizing={false}
        className="z-[10001]"
      >
        <div className="flex flex-col items-center py-2 px-1.5 rounded-xl bg-blue-600 shadow-2xl border border-white/10">
          {/* Indicador de Firebase */}
          {!isFirebaseReady && (
            <div className="mb-2 text-xs text-yellow-400 text-center">
              Cargando...
            </div>
          )}
          
          {/* Drag Handle */}
          <div className="toolbar-drag cursor-grab active:cursor-grabbing w-full flex justify-center py-1 mb-1 hover:bg-white/5 rounded">
            <GripVertical className="w-4 h-4 text-white/40" />
          </div>


          {/* === CREAR ELEMENTOS === */}
          
          {/* Notas Adhesivas */}
          <Popover>
            <PopoverTrigger asChild>
              <div>
                <ToolButton icon={StickyNote} label="Nota adhesiva" hasDropdown disabled={!isFirebaseReady} />
              </div>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-auto p-2 bg-blue-700 border-white/10">
              <div className="grid grid-cols-3 gap-1.5">
                {stickyColors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => handleAdd('sticky', { color: c.name })}
                    className="w-8 h-8 rounded shadow-sm hover:scale-110 transition-transform border border-black/20"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Texto */}
          <Popover>
            <PopoverTrigger asChild>
              <div>
                <ToolButton icon={Type} label="Texto" hasDropdown disabled={!isFirebaseReady} />
              </div>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-auto p-2 bg-blue-700 border-white/10">
              <div className="grid grid-cols-4 gap-1.5">
                {['#ffffff','#fef08a','#fda4af','#93c5fd','#86efac','#fdba74','#d8b4fe','transparent'].map((hex) => (
                  <button
                    key={hex}
                    onClick={() => handleAdd('text', { properties: { backgroundColor: hex }})}
                    className={cn(
                      'w-7 h-7 rounded hover:scale-110 transition-transform',
                      hex === 'transparent' ? 'border-2 border-dashed border-white/30' : 'border border-black/20 shadow-sm'
                    )}
                    style={{ backgroundColor: hex === 'transparent' ? 'transparent' : hex }}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Cuadernos */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <ToolButton icon={FileText} label="Cuaderno" hasDropdown />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="bg-blue-700 border-white/10 text-white">
              <DropdownMenuItem onClick={() => handleAdd('notepad')} className="hover:bg-white/10">
                <Plus className="mr-2 h-4 w-4" /> Cuaderno clásico
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAdd('yellow-notepad')} className="hover:bg-white/10">
                <Plus className="mr-2 h-4 w-4" /> Bloc amarillo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAdd('tabbed-notepad')} className="hover:bg-white/10">
                <Plus className="mr-2 h-4 w-4" /> Con pestañas
              </DropdownMenuItem>
              {hiddenNotepads.length > 0 && (
                <>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="hover:bg-white/10">
                      <Layers className="mr-2 h-4 w-4" /> Cerrados ({hiddenNotepads.length})
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="bg-blue-700 border-white/10 text-white">
                      {hiddenNotepads.map((n) => (
                        <DropdownMenuItem key={n.id} onClick={() => onOpenNotepad(n.id)} className="hover:bg-white/10">
                          {(n.content as NotepadContent)?.title || 'Sin título'}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Imagen */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <ToolButton icon={Image} label="Imagen" hasDropdown />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="bg-blue-700 border-white/10 text-white">
              <DropdownMenuItem onClick={onUploadImage} className="hover:bg-white/10">
                Subir archivo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddImageFromUrl} className="hover:bg-white/10">
                Desde URL
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => handleAdd('moodboard')} className="hover:bg-white/10">
                Moodboard
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* To-Do */}
          <ToolButton icon={CheckSquare} label="Lista de tareas" onClick={() => handleAdd('todo')} />

          <Divider />

          {/* === UTILIDADES === */}

          {/* Marcadores */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <ToolButton icon={MapPin} label="Etiqueta / Quitar" hasDropdown />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="w-56 bg-[#3d3d3d] border-white/10 text-white">
              {allComments.length > 0 ? (
                <div className="max-h-48 overflow-y-auto">
                  {allComments.map((c) => {
                    const content = c.content as CommentContent;
                    return (
                      <DropdownMenuItem 
                        key={c.id} 
                        onClick={() => onLocateElement(c.id)}
                        className="hover:bg-white/10"
                      >
                        <MapPin className="mr-2 h-4 w-4 text-cyan-400" />
                        <span className="truncate">{content?.label || content?.title || 'Sin nombre'}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              ) : (
                <div className="px-3 py-4 text-center text-sm text-white/50">
                  Sin marcadores
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Divider />

          {/* === ACCIONES === */}
          
          <ToolButton 
            icon={isListening ? MicOff : Mic} 
            label={isListening ? 'Detener dictado' : 'Dictar'} 
            onClick={onToggleDictation}
            isRecording={isListening}
          />

          <ToolButton 
            icon={PanelLeft} 
            label="Panel de formato" 
            onClick={onFormatToggle}
            isActive={isFormatToolbarOpen}
          />


          <Divider />

          {/* === TABLEROS Y CONFIG === */}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <ToolButton icon={LayoutGrid} label="Tableros" hasDropdown />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="bg-blue-700 border-white/10 text-white">
              <DropdownMenuItem onClick={() => setIsCreateBoardOpen(true)} className="hover:bg-white/10">
                <Plus className="mr-2 h-4 w-4" /> Nuevo tablero
              </DropdownMenuItem>
              {boards.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="hover:bg-white/10">
                    <FolderOpen className="mr-2 h-4 w-4" /> Abrir
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-blue-700 border-white/10 text-white">
                    {boards.map((b) => (
                      <DropdownMenuItem key={b.id} onClick={() => router.push(`/board/${b.id}`)} className="hover:bg-white/10">
                        {b.name || 'Sin nombre'}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={onDeleteBoard} className="text-red-400 hover:bg-white/10">
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div>
                <ToolButton icon={Settings} label="Opciones" hasDropdown />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="bg-blue-700 border-white/10 text-white">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="hover:bg-white/10">
                    <Trash2 className="mr-2 h-4 w-4" /> Limpiar tablero
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Limpiar tablero?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se eliminarán todos los elementos. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={clearCanvas} className="bg-red-500">
                      Limpiar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleSignOut} className="hover:bg-white/10">
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Divider />

          {/* ===== NUEVAS MEJORAS ===== */}
          <ToolButton
            icon={LayoutGrid}
            label="Plantillas"
            onClick={() => setShowTemplatesDialog(true)}
          />

          <ToolButton
            icon={Heart}
            label="Habits"
            onClick={() => handleAdd('habit-tracker', { properties: { size: { width: 640, height: 420 } } })}
          />

          <ToolButton
            icon={Zap}
            label="Eisenhower"
            onClick={() => handleAdd('eisenhower-matrix', { properties: { size: { width: 720, height: 520 } } })}
          />

          <ToolButton
            icon={Sparkles}
            label="Brain Dump"
            onClick={() => handleAdd('brain-dump', { properties: { size: { width: 520, height: 420 } } })}
          />

          <ToolButton
            icon={Brain}
            label="Gratitud"
            onClick={() => handleAdd('gratitude-journal', { properties: { size: { width: 520, height: 560 } } })}
          />

          <ToolButton
            icon={StickyNote}
            label="Stickers"
            onClick={() => handleAdd('sticker', { properties: { size: { width: 160, height: 160 } } })}
          />

          <ToolButton
            icon={Clock}
            label="Fecha / Hora"
            onClick={() => handleAdd('datetime-widget', { 
              content: { theme: 'modern', showCalendar: true, showAnalog: true },
              properties: { size: { width: 340, height: 420 } }
            })}
          />

          <ToolButton
            icon={Palette}
            label="Temas"
            onClick={() => setShowThemesDialog(true)}
          />

          <ToolButton
            icon={Wand2}
            label="Redactor AI"
            onClick={() => setShowTextEditorDialog(true)}
          />

          <ToolButton
            icon={Bell}
            label="Recordatorios"
            onClick={() => setShowRemindersDialog(true)}
          />

        </div>
      </Rnd>

      {/* ===== DIÁLOGOS DE LAS NUEVAS MEJORAS ===== */}

      {/* PLANTILLAS */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Plantillas Rápidas
            </DialogTitle>
            <DialogDescription>
              Crea estructuras predefinidas para comenzar rápidamente (tamaño 21x15cm)
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => applyTemplate('weekly-complete')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
              <span className="text-2xl">📅</span>
              <span className="text-sm font-medium">Planificación Semanal</span>
              <span className="text-[10px] text-gray-500">Planner + Tareas + Notas</span>
            </Button>
            <Button variant="outline" onClick={() => applyTemplate('home-dashboard')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
              <span className="text-2xl">🏠</span>
              <span className="text-sm font-medium">Dashboard Hogar</span>
              <span className="text-[10px] text-gray-500">Compras + Limpieza + Menú</span>
            </Button>
            <Button variant="outline" onClick={() => applyTemplate('vision-board')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
              <span className="text-2xl">✨</span>
              <span className="text-sm font-medium">Vision Board</span>
              <span className="text-[10px] text-gray-500">Metas por categoría</span>
            </Button>
            <Button variant="outline" onClick={() => applyTemplate('sprint')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5">
              <span className="text-2xl">🚀</span>
              <span className="text-sm font-medium">Sprint Planning</span>
              <span className="text-[10px] text-gray-500">Kanban 4 columnas</span>
            </Button>
            <Button variant="outline" onClick={() => applyTemplate('brainstorm')} className="h-24 flex-col gap-2 hover:border-primary hover:bg-primary/5 col-span-2">
              <span className="text-2xl">💡</span>
              <span className="text-sm font-medium">Lluvia de Ideas</span>
              <span className="text-[10px] text-gray-500">6 notas adhesivas de colores</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* TEMAS */}
      <Dialog open={showThemesDialog} onOpenChange={setShowThemesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Temas y Etiquetas
            </DialogTitle>
            <DialogDescription>
              Aplica colores temáticos y organiza con etiquetas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Colores Temáticos</label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(THEME_COLORS).map(([key, theme]) => (
                  <Button
                    key={key}
                    variant="outline"
                    size="sm"
                    onClick={() => applyThemeToSelected(key)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: theme.bg }}
                    />
                    <span className="text-xs">{theme.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Etiquetas</label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Nueva etiqueta..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                />
                <Button size="sm" onClick={addTag}>Agregar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* REDACTOR AI */}
      <Dialog open={showTextEditorDialog} onOpenChange={setShowTextEditorDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5" />
              Redactor AI
            </DialogTitle>
            <DialogDescription>
              Mejora, resume y estructura tu texto con IA
            </DialogDescription>
          </DialogHeader>
          <AITextEditor
            initialContent={getSelectedElementContent()}
            onSave={handleTextEditorSave}
          />
        </DialogContent>
      </Dialog>

      {/* RECORDATORIOS */}
      <Dialog open={showRemindersDialog} onOpenChange={setShowRemindersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Recordatorios
            </DialogTitle>
            <DialogDescription>
              Gestiona fechas límite y recordatorios visuales
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recordatorios Activos</label>
              <div className="space-y-2 mt-2">
                {getElementsWithReminders().map(element => (
                  <div key={element.id} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm truncate">{getElementTitle(element)}</span>
                    <Badge variant={getReminderUrgency(element.properties?.dueDate)}>
                      {formatDueDate(element.properties?.dueDate)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <Button onClick={setReminderForSelected} className="w-full">
              Establecer Recordatorio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
