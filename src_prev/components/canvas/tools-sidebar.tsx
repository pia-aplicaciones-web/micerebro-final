// @ts-nocheck
'use client';

import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { Rnd } from 'react-rnd';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LayoutGrid,
  BookCopy,
  RectangleHorizontal,
  StickyNote,
  List,
  Wrench,
  ImageIcon,
  FileText,
  Link,
  Tag,
  MoreHorizontal,
  Mic,
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
  LayoutTemplate,
  MapPin,
  Search,
  Images,
  ChevronDown,
  MessageCircle,
  Palette,
  Wand2,
  Bell,
  Calendar,
  Box,
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
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ElementType, CanvasElement, Board, WithId, CommentContent, NotepadContent } from '@/lib/types';
import { THEME_COLORS } from '@/lib/types';
import { useAuth } from '@/firebase/provider';
import { signOut } from '@/firebase/auth';
import { useToast } from '@/hooks/use-toast';
import CreateBoardDialog from './create-board-dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import AITextEditor from './ai-text-editor';

const stickyNoteColors = [
  { name: 'yellow', label: 'Amarillo', className: 'bg-yellow-200' },
  { name: 'pink', label: 'Rosa', className: 'bg-pink-200' },
  { name: 'blue', label: 'Azul', className: 'bg-blue-200' },
  { name: 'green', label: 'Verde', className: 'bg-green-200' },
  { name: 'orange', label: 'Naranja', className: 'bg-orange-200' },
  { name: 'purple', label: 'Morado', className: 'bg-purple-200' },
];

const SidebarButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & {
    label: string;
    icon?: React.ElementType;
    isActive?: boolean;
  }
>(({ label, icon: Icon, className, isActive, children, ...props }, ref) => {
  // Detectar si es el botón de dictado activo (tiene bg-red-500 en className)
  const isDictationActive = className?.includes('bg-red-500');
  
  return (
    <Button
      ref={ref}
      variant="ghost"
      className={cn(
        'flex flex-col items-center justify-center h-auto py-2 px-2 w-full text-[11px] gap-1',
        'hover:bg-white/20 focus-visible:bg-white/20',
        'text-white border border-white',
        isActive && 'bg-white/30 text-white hover:bg-white/40',
        !isDictationActive && 'text-white',
        className
      )}
      style={{
        backgroundColor: isDictationActive ? undefined : (isActive ? 'rgba(255, 255, 255, 0.3)' : 'transparent'),
        color: isDictationActive ? undefined : '#FFFFFF',
        border: '1px solid #FFFFFF',
      }}
      {...props}
    >
      {children || (Icon && <Icon className={cn('size-[18px]', isDictationActive ? 'text-white' : 'text-white')} style={isDictationActive ? undefined : { color: '#FFFFFF' }} />)}
      <span className={cn('mt-0.5 text-center leading-tight text-[9px]', isDictationActive ? 'text-white' : 'text-white')} style={isDictationActive ? undefined : { color: '#FFFFFF', fontSize: '9px' }}>
        {label}
      </span>
    </Button>
  );
});
SidebarButton.displayName = 'SidebarButton';

// Componente de menú de localizadores con búsqueda
const LocatorsMenu = ({ comments, onLocateElement }: { comments: WithId<CanvasElement>[], onLocateElement: (id: string) => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredComments = useMemo(() => {
    if (!searchTerm) return comments;
    return comments.filter((comment) => {
      const content = comment.content as CommentContent;
      const label = content?.label || content?.title || content?.text || '';
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [comments, searchTerm]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarButton icon={MapPin} label="Localizadores" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={5} className="w-64">
        {comments.length > 0 ? (
          <>
            <div className="px-2 py-1.5 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar localizador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filteredComments.length > 0 ? (
                filteredComments.map((comment) => {
                  const content = comment.content as any;
                  const label = content?.label || 'Localizador';
                  return (
                    <DropdownMenuItem
                      key={comment.id}
                      onClick={() => onLocateElement(comment.id)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      <span className="truncate">{label}</span>
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground">No se encontraron localizadores</span>
                </DropdownMenuItem>
              )}
            </div>
          </>
        ) : (
          <DropdownMenuItem disabled>
            <span className="text-muted-foreground">No hay localizadores</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type ToolsSidebarProps = {
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
  onAddComment?: () => void;
  onOpenGlobalSearch?: () => void;
  addElement: (type: ElementType, props?: any) => Promise<string>;
  clearCanvas: () => void;
  onExportBoardToPng: () => void;
  onFormatToggle: () => void;
  isFormatToolbarOpen: boolean;
  isPanningActive?: boolean;
  updateElement?: (id: string, updates: Partial<CanvasElement>) => Promise<void> | void;
  selectedElementIds?: string[];
};

export default function ToolsSidebar(props: ToolsSidebarProps) {
  const {
    elements,
    boards,
    onUploadImage,
    onAddImageFromUrl,
    onPanToggle,
    isListening = false,
    onToggleDictation,
    onRenameBoard,
    onDeleteBoard,
    onOpenNotepad,
    onLocateElement,
    addElement,
    clearCanvas,
    onExportBoardToPng,
    onFormatToggle,
    isFormatToolbarOpen,
    isPanningActive = false,
    updateElement,
    selectedElementIds = [],
  } = props;

  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [rndPosition, setRndPosition] = useState({ x: 20, y: 80 });
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showTextEditorDialog, setShowTextEditorDialog] = useState(false);
  const [showRemindersDialog, setShowRemindersDialog] = useState(false);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    try {
      const savedPosition = localStorage.getItem('toolsSidebarPosition');
      if (savedPosition) {
        setRndPosition(JSON.parse(savedPosition));
      }
    } catch (e) {
      console.error('Failed to load sidebar position from localStorage', e);
    }
  }, []);

  const onDragStop = (e: any, d: { x: number; y: number }) => {
    const newPosition = { x: d.x, y: d.y };
    setRndPosition(newPosition);
    try {
      localStorage.setItem('toolsSidebarPosition', JSON.stringify(newPosition));
    } catch (error) {
      console.error('Failed to save sidebar position to localStorage', error);
    }
  };

  const allNotepads = useMemo(
    () => (Array.isArray(elements) ? elements : []).filter((el) => el.type === 'notepad' || el.type === 'notepad-simple'), // tipos obsoletos removidos
    [elements]
  );

  const notepadsOnCanvas = useMemo(
    () => (Array.isArray(allNotepads) ? allNotepads : []).filter((el) => el.hidden !== true),
    [allNotepads]
  );

  const hiddenNotepads = useMemo(
    () => (Array.isArray(allNotepads) ? allNotepads : []).filter((el) => el.hidden === true),
    [allNotepads]
  );

  const allComments = useMemo(
    () =>
      (Array.isArray(elements) ? elements : []).filter((el) => {
        if (el.type !== 'locator') return false;
        // Para localizadores, verificar que tengan un label válido
        const content = el.content as any;
        const label = content?.label;
        return typeof label === 'string' && label.trim().length > 0;
      }),
    [elements]
  );

  const handleAddElement = async (type: ElementType, props?: any) => {
    try {
      // Usar el addElement provisto (usa useElementManager con uid válido)
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

  const createMeetingTemplate = async () => {
    const { centerX, centerY } = getViewportCenter();
    await handleAddElement('text', {
      content: '<div style="font-size: 24px; font-weight: bold;">Reunión de Equipo</div>',
      properties: { position: { x: centerX - 200, y: centerY - 150 }, size: { width: 400, height: 60 } },
    });
    await handleAddElement('notepad-simple', {
      content: { title: 'Agenda', text: '<div>• Punto 1<br>• Punto 2<br>• Punto 3</div>' },
      properties: { position: { x: centerX - 250, y: centerY - 50 } },
    });
    await handleAddElement('todo', {
      content: { title: 'Acciones Pendientes', items: [] },
      properties: { position: { x: centerX + 50, y: centerY - 50 } },
    });
  };

  const createProjectTemplate = async () => {
    const { centerX, centerY } = getViewportCenter();
    await handleAddElement('text', {
      content: '<div style="font-size: 20px; font-weight: bold;">Nuevo Proyecto</div>',
      properties: { position: { x: centerX - 150, y: centerY - 200 } },
    });
    await handleAddElement('sticky', { content: 'OBJETIVOS', color: 'green', properties: { position: { x: centerX - 200, y: centerY - 100 } } });
    await handleAddElement('sticky', { content: 'CRONOGRAMA', color: 'blue', properties: { position: { x: centerX, y: centerY - 100 } } });
    await handleAddElement('sticky', { content: 'RECURSOS', color: 'yellow', properties: { position: { x: centerX + 100, y: centerY - 100 } } });
  };

  const createTasksTemplate = async () => {
    const { centerX, centerY } = getViewportCenter();
    await handleAddElement('todo', {
      content: { title: 'Mis Tareas', items: [] },
      properties: { position: { x: centerX - 150, y: centerY - 100 } },
    });
  };

  const createBrainstormTemplate = async () => {
    const { centerX, centerY } = getViewportCenter();
    const colors = ['yellow', 'pink', 'blue', 'green'];
    for (let i = 0; i < 6; i++) {
      await handleAddElement('sticky', {
        content: `Idea ${i + 1}`,
        color: colors[i % colors.length],
        properties: { position: { x: centerX + (i % 3 - 1) * 120, y: centerY + (Math.floor(i / 3) - 1) * 120 } },
      });
    }
  };

  const applyTemplate = async (templateType: string) => {
    const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 500;
    const centerY = typeof window !== 'undefined' ? window.innerHeight / 2 : 400;

    try {
      switch (templateType) {
        case 'weekly-complete':
          await addElement('weekly-planner', {
            properties: { position: { x: centerX - 400, y: centerY - 300 }, size: { width: 794, height: 567 } },
          });
          await addElement('todo', {
            content: { title: '📋 Tareas de la Semana', items: [] },
            properties: { position: { x: centerX + 420, y: centerY - 300 }, size: { width: 280, height: 250 } },
          });
          await addElement('sticky', {
            content: '💡 Ideas de la semana',
            color: 'yellow',
            properties: { position: { x: centerX + 420, y: centerY } },
          });
          break;

        case 'home-dashboard':
          await addElement('text', {
            content: '<div style="font-size: 28px; font-weight: bold; text-align: center;">🏠 Dashboard del Hogar</div>',
            properties: { position: { x: centerX - 200, y: centerY - 350 }, size: { width: 400, height: 50 }, backgroundColor: 'transparent' },
          });
          await addElement('todo', {
            content: {
              title: '🛒 Lista de Compras',
              items: [
                { id: '1', text: 'Leche', completed: false },
                { id: '2', text: 'Pan', completed: false },
                { id: '3', text: 'Frutas y verduras', completed: false },
              ],
            },
            properties: { position: { x: centerX - 450, y: centerY - 280 }, size: { width: 280, height: 300 }, backgroundColor: '#E8F5E9' },
          });
          await addElement('todo', {
            content: {
              title: '🧹 Limpieza Semanal',
              items: [
                { id: '1', text: 'Aspirar', completed: false },
                { id: '2', text: 'Limpiar baños', completed: false },
                { id: '3', text: 'Cambiar sábanas', completed: false },
              ],
            },
            properties: { position: { x: centerX - 140, y: centerY - 280 }, size: { width: 280, height: 300 }, backgroundColor: '#E3F2FD' },
          });
          await addElement('notepad-simple', {
            content: {
              title: '🍽️ Menú Semanal',
              text: '<b>Lunes:</b> Pollo<br><b>Martes:</b> Pasta<br><b>Miércoles:</b> Ensalada<br><b>Jueves:</b> Tacos<br><b>Viernes:</b> Pizza<br><b>Sábado:</b> Parrilla<br><b>Domingo:</b> Sopa',
            },
            properties: { position: { x: centerX + 170, y: centerY - 280 }, size: { width: 280, height: 300 } },
          });
          break;

        case 'vision-board': {
          await addElement('text', {
            content: '<div style="font-size: 32px; font-weight: bold; text-align: center; color: #6B21A8;">✨ Mi Visión 2025 ✨</div>',
            properties: { position: { x: centerX - 200, y: centerY - 350 }, size: { width: 400, height: 60 }, backgroundColor: 'transparent' },
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
              properties: { position: { x: centerX + cat.x, y: centerY + cat.y }, size: { width: 200, height: 200 } },
            });
          }
          break;
        }

        case 'sprint': {
          await addElement('text', {
            content: '<div style="font-size: 24px; font-weight: bold; color: white; padding: 8px 16px; border-radius: 8px; background: linear-gradient(135deg, #3F51B5, #7C4DFF);">🚀 Sprint Planning</div>',
            properties: { position: { x: centerX - 120, y: centerY - 350 }, size: { width: 240, height: 50 } },
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
              properties: { position: { x: centerX + col.x, y: centerY - 280 }, size: { width: 240, height: 450 }, backgroundColor: col.color },
            });
          }
          break;
        }

        case 'brainstorm': {
          const colors = ['yellow', 'pink', 'blue', 'green', 'orange', 'purple'];
          for (let i = 0; i < 6; i++) {
            await addElement('sticky', {
              content: `💡 Idea ${i + 1}`,
              color: colors[i % colors.length],
              properties: { position: { x: centerX + (i % 3 - 1) * 180, y: centerY + (Math.floor(i / 3) - 0.5) * 180 } },
            });
          }
          break;
        }

        default:
          break;
      }

      setShowTemplatesDialog(false);
      toast({ title: '✅ Plantilla creada', description: 'Los elementos se han añadido al tablero.' });
    } catch (error) {
      console.error('Error aplicando plantilla:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la plantilla.' });
    }
  };

  const applyThemeToSelected = async (themeKey: keyof typeof THEME_COLORS) => {
    if (!updateElement) {
      toast({ variant: 'destructive', title: 'Acción no disponible', description: 'No se puede actualizar elementos.' });
      return;
    }
    if (!selectedElementIds || selectedElementIds.length === 0) {
      toast({ variant: 'destructive', title: 'Sin selección', description: 'Selecciona uno o más elementos.' });
      return;
    }
    const theme = THEME_COLORS[themeKey];
    await Promise.all(
      selectedElementIds.map((id) =>
        Promise.resolve(updateElement(id, {
          properties: {
            themeColor: themeKey,
            backgroundColor: theme.bg,
            borderColor: theme.border,
          } as any,
        }))
      )
    );
    toast({ title: 'Tema aplicado', description: `${theme.name} aplicado a ${selectedElementIds.length} elemento(s).` });
    setShowThemesDialog(false);
  };

  const addTag = async () => {
    if (!updateElement) {
      toast({ variant: 'destructive', title: 'Acción no disponible', description: 'No se puede actualizar elementos.' });
      return;
    }
    const tag = newTag.trim();
    if (!tag) return;
    if (!selectedElementIds || selectedElementIds.length === 0) {
      toast({ variant: 'destructive', title: 'Sin selección', description: 'Selecciona uno o más elementos.' });
      return;
    }
    setNewTag('');
    await Promise.all(
      selectedElementIds.map((id) =>
        Promise.resolve(updateElement(id, {
          properties: (prev => {
            const props = (prev as any) || {};
            const existing = Array.isArray(props.tags) ? props.tags : [];
            const merged = Array.from(new Set([...existing, tag]));
            return { ...props, tags: merged };
          }) as any,
        }))
      )
    );
    toast({ title: 'Etiqueta agregada', description: `Etiqueta "${tag}" agregada a ${selectedElementIds.length} elemento(s).` });
  };

  const getSelectedElementContent = () => {
    if (!selectedElementIds || selectedElementIds.length !== 1) return '';
    const el = elements.find(e => e.id === selectedElementIds[0]);
    if (!el) return '';
    if (el.type === 'notepad' || el.type === 'notepad-simple') {
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
    if (!updateElement) {
      toast({ variant: 'destructive', title: 'Acción no disponible', description: 'No se puede actualizar elementos.' });
      return;
    }
    if (!selectedElementIds || selectedElementIds.length !== 1) {
      toast({ variant: 'destructive', title: 'Sin selección', description: 'Selecciona un elemento para editar.' });
      return;
    }
    const elId = selectedElementIds[0];
    const el = elements.find(e => e.id === elId);
    if (!el) return;
    if (el.type === 'notepad' || el.type === 'notepad-simple') {
      const content = el.content as any;
      const pages = Array.isArray(content?.pages) ? [...content.pages] : [''];
      const idx = content?.currentPage || 0;
      pages[idx] = newContent;
      await Promise.resolve(updateElement(elId, { content: { ...content, pages } }));
    } else if (el.type === 'text' || el.type === 'sticky') {
      await Promise.resolve(updateElement(elId, { content: newContent }));
    }
    setShowTextEditorDialog(false);
    toast({ title: 'Texto actualizado', description: 'El contenido ha sido procesado y guardado.' });
  };

  // Recordatorios
  const getElementsWithReminders = () => {
    return elements.filter((el) => (el.properties as any)?.dueDate);
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return 'Sin fecha';
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return 'Fecha inválida';
    return due.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const getReminderVariant = (dueDate?: string) => {
    if (!dueDate) return 'secondary';
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'destructive';
    if (diffDays <= 1) return 'destructive';
    if (diffDays <= 3) return 'default';
    return 'secondary';
  };

  const setReminderForSelected = async () => {
    if (!updateElement) {
      toast({ variant: 'destructive', title: 'Acción no disponible', description: 'No se puede actualizar elementos.' });
      return;
    }
    if (!selectedElementIds || selectedElementIds.length === 0) {
      toast({ variant: 'destructive', title: 'Sin selección', description: 'Selecciona uno o más elementos.' });
      return;
    }
    const raw = prompt('Fecha y hora (YYYY-MM-DD HH:mm):');
    if (!raw) return;
    const valid = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(raw);
    if (!valid) {
      toast({ variant: 'destructive', title: 'Formato inválido', description: 'Usa formato YYYY-MM-DD HH:mm.' });
      return;
    }
    const iso = new Date(raw.replace(' ', 'T')).toISOString();
    await Promise.all(
      selectedElementIds.map((id) => Promise.resolve(updateElement(id, { properties: { dueDate: iso } as any })))
    );
    toast({ title: 'Recordatorio establecido', description: `Fecha: ${raw}` });
    setShowRemindersDialog(false);
  };

  const clearReminder = async (elementId: string) => {
    if (!updateElement) return;
    await Promise.resolve(updateElement(elementId, { properties: { dueDate: undefined } as any }));
    toast({ title: 'Recordatorio eliminado', description: 'Se quitó la fecha límite.' });
  };

  const handleSignOut = async () => {
    if (auth) {
      try {
        await signOut(auth);
        toast({
          title: 'Sesión Cerrada',
          description: 'Has cerrado sesión correctamente.',
        });
        window.location.href = 'https://micerebro.vercel.app/?logout=true';
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo cerrar la sesión.',
        });
      }
    }
  };

  return (
    <>
      <CreateBoardDialog isOpen={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen} />
      <Rnd
        default={{
          x: rndPosition.x,
          y: rndPosition.y,
          width: 144,
          height: 'auto',
        }}
        minWidth={144}
        maxWidth={144}
        bounds="window"
        dragHandleClassName="drag-handle"
        onDragStop={onDragStop}
        className="z-[10001]"
      >
        <div 
          className="rounded-lg shadow-lg border border-white/30 p-2 flex flex-col gap-1"
          style={{ backgroundColor: '#0b8384' }}
        >
          <div className="drag-handle cursor-grab active:cursor-grabbing py-1 flex justify-center">
            <GripVertical className="size-5" style={{ color: '#FFFFFF' }} />
          </div>
          <div className="grid grid-cols-2 gap-1">

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={LayoutDashboard} label="Tableros" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={() => setIsCreateBoardOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Nuevo Tablero</span>
              </DropdownMenuItem>
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

          <SidebarButton
            icon={Mic}
            label={isListening ? 'Detener' : 'Dictar'}
            onClick={onToggleDictation}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              isListening && 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
            )}
          />

          <LocatorsMenu 
            comments={allComments}
            onLocateElement={onLocateElement}
          />

          <SidebarButton 
            icon={LayoutGrid} 
            label="Plantillas" 
            onClick={() => setShowTemplatesDialog(true)} 
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={BookCopy} label="Cuadernos" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={() => handleAddElement('notepad')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Agregar cuaderno</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('yellow-notepad')}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Nuevo cuaderno amarillo</span>
              </DropdownMenuItem>
              {notepadsOnCanvas.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Cuadernos en el lienzo ({notepadsOnCanvas.length})</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {notepadsOnCanvas.map((notepad) => {
                        const content = notepad.content as NotepadContent;
                        const title = content?.title || 'Sin título';
                        return (
                          <DropdownMenuItem key={notepad.id} onClick={() => onLocateElement(notepad.id)}>
                            <span>{title}</span>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
              {hiddenNotepads.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Cerrados ({hiddenNotepads.length})</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {hiddenNotepads.map((notepad) => {
                        const content = notepad.content as NotepadContent;
                        const title = content?.title || 'Sin título';
                        return (
                          <DropdownMenuItem key={notepad.id} onClick={() => onOpenNotepad(notepad.id)}>
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={StickyNote} label="Notas" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              {stickyNoteColors.map((color) => (
                <DropdownMenuItem key={color.name} onClick={() => handleAddElement('sticky', { color: color.name })}>
                  <div className={cn('w-4 h-4 rounded-sm mr-2 border border-slate-300', color.className)} />
                  <span className="capitalize">{color.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={MessageCircle} label="Burbuja" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              {[
                { key: 'yellow', label: 'Amarillo pastel', backgroundColor: '#fff9c4' },
                { key: 'white', label: 'Blanco', backgroundColor: '#ffffff' },
              ].map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() =>
                    handleAddElement('comment-bubble', {
                      properties: { backgroundColor: option.backgroundColor },
                      content: { text: '' },
                    })
                  }
                >
                  <div
                    className="w-4 h-4 rounded-sm border border-slate-300 mr-2"
                    style={{ backgroundColor: option.backgroundColor }}
                  />
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <SidebarButton icon={List} label="To-do" onClick={() => handleAddElement('todo')} />

          <SidebarButton icon={Wrench} label="Tools" onClick={onFormatToggle} isActive={isFormatToolbarOpen} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={ImageIcon} label="Imagen" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={onAddImageFromUrl}>
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>Desde URL</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onUploadImage}>
                <Upload className="mr-2 h-4 w-4" />
                <span>Subir</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <SidebarButton 
            icon={Images} 
            label="Moodboard" 
            onClick={() => handleAddElement('moodboard')} 
          />

          <SidebarButton
            icon={Box}
            label="Columna"
            onClick={() => handleAddElement('container')}
          />

          {/* TERCERA COLUMNA: MEJORAS ESPECIALES */}
          <div className="border-t border-gray-200 my-2 pt-2">
            <div className="text-xs text-gray-500 font-medium mb-2 px-2">🆕 Mejoras</div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={Calendar} label="Hábitos" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={() => handleAddElement('habit-tracker')}>
                <span className="text-lg mr-2">📅</span>
                <span>Habit Tracker</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('gratitude-journal')}>
                <span className="text-lg mr-2">🙏</span>
                <span>Diario Gratitud</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Bloque de mejoras/creación desactivado para evitar duplicación y errores */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarButton icon={MoreHorizontal} label="Más" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" sideOffset={5}>
              <DropdownMenuItem onClick={onFormatToggle}>
                <Wrench className="mr-2 h-4 w-4" />
                <span>Formato de Texto</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportBoardToPng}>
                <FileImage className="mr-2 h-4 w-4" />
                <span>Exportar a PNG: alta resolución</span>
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
        </div>
      </Rnd>

      {/* Diálogos de mejoras */}
      <Dialog open={showTemplatesDialog} onOpenChange={setShowTemplatesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5" />
              Plantillas Rápidas
            </DialogTitle>
            <DialogDescription>
              Crea estructuras predefinidas (21x17) para comenzar rápidamente
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
                {getElementsWithReminders().map(el => (
                  <div key={el.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex flex-col">
                      <span className="text-sm truncate">{(el.content as any)?.title || (el.content as any)?.label || el.type}</span>
                      <Badge variant={getReminderVariant((el.properties as any)?.dueDate)}>
                        {formatDueDate((el.properties as any)?.dueDate)}
                      </Badge>
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => clearReminder(el.id)}>
                      Quitar
                    </Button>
                  </div>
                ))}
                {getElementsWithReminders().length === 0 && (
                  <div className="text-sm text-muted-foreground">No hay recordatorios activos</div>
                )}
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
