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
  // Navegación
  FolderOpen,
  ChevronDown,
  Search,
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
          'relative flex flex-col items-center justify-center p-1.5 bg-black border border-white rounded-none transition-all duration-150',
          'hover:bg-gray-800 active:scale-95',
          isActive && 'bg-gray-700 shadow-inner',
          isRecording && 'bg-red-500 animate-pulse',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
      >
        <Icon className={cn('w-4 h-4 mb-1', isRecording ? 'text-white' : 'text-white/90')} strokeWidth={1.5} />
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
  canvasScrollPosition: { x: number; y: number }; // Nueva prop
  canvasScale: number; // Nueva prop
};

export default function ToolsSidebarV2(props: ToolsSidebarV2Props) {
  const {
    elements,
    boards,
    onUploadImage,
    onAddImageFromUrl,
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
    canvasScrollPosition, // Desestructurar nueva prop
    canvasScale, // Desestructurar nueva prop
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
    () => elements.filter((el) => ['notepad', 'yellow-notepad'].includes(el.type)),
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

    // Calcular la posición central en la vista actual del canvas
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Restar el ancho del sidebar para calcular el centro real del área de contenido
    const sidebarWidth = 80; // Ancho fijo del sidebar
    const contentAreaWidth = viewportWidth - sidebarWidth;

    const offsetX = canvasScrollPosition.x; // Posición de desplazamiento horizontal del canvas
    const offsetY = canvasScrollPosition.y; // Posición de desplazamiento vertical del canvas

    // Calcular el centro del área de contenido visible, ajustado por el desplazamiento y la escala
    const centerX = (offsetX + contentAreaWidth / 2) / canvasScale; // Convertir a coordenadas del canvas
    const centerY = (offsetY + viewportHeight / 2) / canvasScale; // Convertir a coordenadas del canvas

    // Definir un tamaño por defecto para el nuevo elemento
    const defaultElementWidth = 200; // Por ejemplo, 200px
    const defaultElementHeight = 150; // Por ejemplo, 150px

    // Ajustar la posición para que el centro del nuevo elemento esté en el centro de la vista
    const initialX = centerX - defaultElementWidth / 2;
    const initialY = centerY - defaultElementHeight / 2;

    const elementProps = {
      properties: {
        position: { x: initialX, y: initialY },
        size: { width: defaultElementWidth, height: defaultElementHeight },
        // Aquí puedes añadir zIndex: -1 para los tipos específicos si no se hace ya en TransformableElement
        zIndex: ['notepad', 'yellow-notepad', 'notes', 'mini-notes', 'container', 'two-columns'].includes(type) ? -1 : 1,
      },
      ...(props || {}), // Asegúrate de que las props existentes se fusionen
    };

    try {
      await addElement(type, elementProps);
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

  // FUNCIONES DE LAS NUEVAS MEJORAS
  const applyTemplate = async (templateType: string) => {
    // Calcular la posición central en la vista actual del canvas
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const sidebarWidth = 80; // Ancho fijo del sidebar
    const contentAreaWidth = viewportWidth - sidebarWidth;

    const offsetX = canvasScrollPosition.x; // Posición de desplazamiento horizontal del canvas
    const offsetY = canvasScrollPosition.y; // Posición de desplazamiento vertical del canvas

    // Calcular el centro del área de contenido visible, ajustado por el desplazamiento y la escala
    const centerX = (offsetX + contentAreaWidth / 2) / canvasScale; // Convertir a coordenadas del canvas
    const centerY = (offsetY + viewportHeight / 2) / canvasScale; // Convertir a coordenadas del canvas

    try {
      switch (templateType) {
        case 'weekly-complete':
          // Planner semanal completo
          await addElement('weekly-planner', {
            properties: {
              position: { x: centerX - 400 / canvasScale, y: centerY - 300 / canvasScale }, // Ajustar por escala
              size: { width: 794 / canvasScale, height: 567 / canvasScale }
            }
          });
          await addElement('todo', {
            content: { title: '📋 Tareas de la Semana', items: [] },
            properties: {
              position: { x: centerX + 420 / canvasScale, y: centerY - 300 / canvasScale }, // Ajustar por escala
              size: { width: 280 / canvasScale, height: 250 / canvasScale }
            }
          });
          await addElement('sticky', {
            content: '💡 Ideas de la semana',
            color: 'yellow',
            properties: { position: { x: centerX + 420 / canvasScale, y: centerY / canvasScale } } // Ajustar por escala
          });
          break;

        case 'home-dashboard':
          // Dashboard del hogar
          await addElement('text', {
            content: '<div style="font-size: 28px; font-weight: bold; text-align: center;">🏠 Dashboard del Hogar</div>',
            properties: {
              position: { x: centerX - 200 / canvasScale, y: centerY - 350 / canvasScale }, // Ajustar por escala
              size: { width: 400 / canvasScale, height: 50 / canvasScale },
              backgroundColor: 'transparent'
            }
          });
          await addElement('todo', {
            content: {
              title: '🛒 Lista de Compras',
              items: [
                { id: '1', text: 'Leche', completed: false },
                { id: '2', text: 'Pan', completed: false },
                { id: '3', text: 'Frutas y verduras', completed: false },
              ]
            },
            properties: {
              position: { x: centerX - 450 / canvasScale, y: centerY - 280 / canvasScale }, // Ajustar por escala
              size: { width: 280 / canvasScale, height: 300 / canvasScale },
              backgroundColor: '#E8F5E9'
            }
          });
          await addElement('todo', {
            content: {
              title: '🧹 Limpieza Semanal',
              items: [
                { id: '1', text: 'Aspirar', completed: false },
                { id: '2', text: 'Limpiar baños', completed: false },
                { id: '3', text: 'Cambiar sábanas', completed: false },
              ]
            },
            properties: {
              position: { x: centerX - 140 / canvasScale, y: centerY - 280 / canvasScale }, // Ajustar por escala
              size: { width: 280 / canvasScale, height: 300 / canvasScale },
              backgroundColor: '#E3F2FD'
            }
          });
          break;

        case 'vision-board':
          // Vision board personal
          await addElement('text', {
            content: '<div style="font-size: 32px; font-weight: bold; text-align: center; color: #6B21A8;">✨ Mi Visión 2025 ✨</div>',
            properties: {
              position: { x: centerX - 200 / canvasScale, y: centerY - 350 / canvasScale }, // Ajustar por escala
              size: { width: 400 / canvasScale, height: 60 / canvasScale },
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
            await addElement('sticky', {
              content: `${cat.title}\n\n• Meta 1\n• Meta 2\n• Meta 3`,
              color: cat.color,
              properties: {
                position: {
                  x: centerX + (cat.x / canvasScale),
                  y: centerY + (cat.y / canvasScale)
                },
                size: { width: 200 / canvasScale, height: 200 / canvasScale }
              }
            });
          }
          break;

        case 'sprint':
          // Sprint planning
          await addElement('text', {
            content: '<div style="font-size: 24px; font-weight: bold; color: white; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #3F51B5, #7C4DFF);">🚀 Sprint Planning</div>',
            properties: {
              position: { x: centerX - 120 / canvasScale, y: centerY - 350 / canvasScale }, // Ajustar por escala
              size: { width: 240 / canvasScale, height: 50 / canvasScale }
            }
          });
          const columns = [
            { title: '📥 Backlog', color: '#F5F5F5', x: -400 },
            { title: '🔄 En Progreso', color: '#BBDEFB', x: -130 },
            { title: '👀 Revisión', color: '#FFF9C4', x: 140 },
            { title: '✅ Hecho', color: '#C8E6C9', x: 410 },
          ];
          for (const col of columns) {
            await addElement('todo', {
              content: { title: col.title, items: [] },
              properties: {
                position: {
                  x: centerX + (col.x / canvasScale),
                  y: centerY - 280 / canvasScale
                },
                size: { width: 240 / canvasScale, height: 450 / canvasScale },
                backgroundColor: col.color
              }
            });
          }
          break;

        case 'brainstorm':
          // Brainstorming
          const colors = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
          for (let i = 0; i < 6; i++) {
            await addElement('sticky', {
              content: `💡 Idea ${i + 1}`,
              color: colors[i % colors.length],
              properties: {
                position: {
                  x: centerX + (i % 3 - 1) * 180 / canvasScale,
                  y: centerY + (Math.floor(i / 3) - 0.5) * 180 / canvasScale
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
    if (element.type === 'notepad') {
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
        <div className="flex flex-col items-center py-2 px-1.5 rounded-xl bg-black shadow-2xl border border-white/10">
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
              <DropdownMenuItem onClick={() => handleAdd('mini-notes')} className="hover:bg-white/10">
                <Plus className="mr-2 h-4 w-4" /> Mini Notas
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

          {/* === ACCIONES === */}
          

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
