'use client';

import React, { useState, forwardRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookCopy,
  StickyNote,
  Wrench,
  ImageIcon,
  MoreHorizontal,
  Plus,
  LogOut,
  Upload,
  Link as LinkIcon,
  EyeOff,
  Highlighter,
  Menu,
  X as CloseIcon,
  Frame,
  LayoutDashboard,
  List,
  MapPin,
  MessageCircle,
  ChevronDown,
  Mic,
  MicOff
} from 'lucide-react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { ElementType, CanvasElement, Board, WithId, NotepadContent, TodoContent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type AuthUser = {
  uid?: string;
  displayName?: string | null;
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  elements: WithId<CanvasElement>[];
  boards: WithId<Board>[];
  boardId: string;
  user: AuthUser | null;
  onOpenNotepad: (id: string) => void;
  onLocateElement: (id: string) => void;
  addElement: (type: ElementType, content?: any) => Promise<any>;
  onOpenRenameBoardDialog: () => void;
  onDeleteBoard: () => void;
  onUploadImage: () => void;
  onAddImageFromUrl: () => void;
  onCropImage: () => void;
  onAddImageFromUrlWithCrop: () => void;
  onExportBoardToPng: () => void;
  onDeleteAllUserImages: () => void;
  isListening?: boolean;
  onToggleDictation?: () => void;
}

const stickyNoteColors = [
  { name: 'yellow', label: 'Amarillo', className: 'bg-yellow-200' },
  { name: 'pink', label: 'Rosa', className: 'bg-pink-200' },
  { name: 'blue', label: 'Azul', className: 'bg-blue-200' },
  { name: 'green', label: 'Verde', className: 'bg-green-200' },
  { name: 'orange', label: 'Naranja', className: 'bg-orange-200' },
  { name: 'purple', label: 'Morado', className: 'bg-purple-200' },
];

const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  elements,
  boards,
  boardId,
  user,
  isListening = false,
  onToggleDictation,
  onOpenNotepad,
  onLocateElement,
  addElement,
  onOpenRenameBoardDialog,
  onDeleteBoard,
  onUploadImage,
  onAddImageFromUrl,
  onCropImage,
  onAddImageFromUrlWithCrop,
  onExportBoardToPng,
  onDeleteAllUserImages,
}) => {
  const { toast } = useToast();
  const router = useRouter();
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleAddElement = useCallback(async (type: ElementType, props?: any) => {
    try {
      await addElement(type, props);
      toast({
        title: 'Elemento creado',
        description: `Se ha creado un nuevo ${type}.`,
      });
      onClose(); // Cerrar menú después de agregar elemento
    } catch (error: any) {
      console.error(`Error al crear elemento ${type}:`, error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || `No se pudo crear el elemento ${type}.`,
      });
    }
  }, [addElement, onClose, toast]);

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await firebaseSignOut(auth);
        toast({ title: 'Sesión cerrada correctamente' });
        router.push('/');
      } else {
        toast({ variant: 'destructive', title: 'Error al cerrar sesión: autenticación no disponible' });
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast({ variant: 'destructive', title: 'Error al cerrar sesión' });
    }
  };

  const menuItems = useMemo(() => [
    {
      label: isListening ? 'Detener' : 'Dictar',
      icon: isListening ? MicOff : Mic,
      onClick: () => {
        if (onToggleDictation) {
          onToggleDictation();
        }
        onClose();
      },
      className: isListening ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : '',
    },
    {
      label: 'Tableros',
      icon: LayoutDashboard,
      subMenu: [
        { label: 'Nuevo Tablero', onClick: () => router.push('/') },
        {
          label: 'Abrir Tablero...',
          subMenu: boards.map((boardItem) => ({
            label: boardItem.name || 'Sin nombre',
            onClick: () => router.push(`/board/${boardItem.id}`),
          })),
        },
      ],
    },
    {
      label: 'Cuadernos',
      icon: BookCopy,
      subMenu: [
        { label: 'Agregar Cuaderno', onClick: () => handleAddElement('notepad') },
        { label: 'Nuevo Block', onClick: () => handleAddElement('yellow-notepad') },
        { label: 'Agregar Apuntes', onClick: () => handleAddElement('mini-notes') },
        { label: 'Nuevo cuaderno dictar', onClick: () => handleAddElement('dictado') },
        { label: 'Libreta', onClick: () => handleAddElement('libreta') },
        { label: 'Mini', onClick: () => handleAddElement('mini') },
        {
          label: 'Elementos Abiertos',
          subMenu: elements.filter(el => ['notepad', 'yellow-notepad', 'mini-notes', 'mini', 'libreta', 'dictado'].includes(el.type) && el.hidden !== true).map(element => {
            let title = 'Sin título';
            const elementType = element.type as ElementType;
            switch (elementType) {
              case 'notepad':
                const notepadContent = element.content as NotepadContent;
                title = notepadContent?.title || 'Cuaderno';
                break;
              case 'yellow-notepad':
                title = 'Cuaderno Amarillo';
                break;
              case 'mini-notes':
                title = 'Apuntes';
                break;
              case 'libreta':
                const libretaContent = element.content as NotepadContent; // Assuming NotepadContent for now
                title = libretaContent?.title || 'Libreta';
                break;
              case 'mini':
                title = 'Mini';
                break;
              case 'dictado':
                const dictadoContentOpen = element.content as any;
                title = dictadoContentOpen?.title || 'Dictado';
                break;
              default:
                title = 'Elemento';
            }
            return { label: title, onClick: () => onLocateElement(element.id) };
          }),
        },
        {
          label: 'Cerrados',
          subMenu: elements.filter(el => ['notepad', 'yellow-notepad', 'mini-notes', 'mini', 'libreta', 'todo', 'dictado'].includes(el.type) && el.hidden === true).map(element => {
            let title = 'Sin título';
            const elementType = element.type as ElementType;
            switch (elementType) {
              case 'notepad':
              case 'yellow-notepad':
                const notepadContent = element.content as NotepadContent;
                title = notepadContent?.title || 'Cuaderno';
                break;
              case 'mini-notes':
                title = 'Apuntes';
                break;
              case 'libreta':
                const libretaContent = element.content as NotepadContent; // Assuming NotepadContent for now
                title = libretaContent?.title || 'Libreta';
                break;
              case 'mini':
                title = 'Mini';
                break;
              case 'dictado':
                const dictadoContent = element.content as any;
                title = dictadoContent?.title || 'Dictado';
                break;
              case 'todo':
                const todoContent = element.content as TodoContent;
                title = todoContent?.title || 'Lista de tareas';
                break;
              default:
                title = 'Elemento';
            }
            return { label: title, onClick: () => onOpenNotepad(element.id), icon: EyeOff };
          }),
        },
      ],
    },
    {
      label: 'Notas Adhesivas',
      icon: StickyNote,
      subMenu: [
        ...stickyNoteColors.map(color => ({
          label: color.label,
          onClick: () => handleAddElement('sticky', { color: color.name }),
          icon: () => <div className={cn('w-4 h-4 rounded-sm mr-2 border border-slate-300', color.className)} />
        })),
        { label: 'Nota Minimalista V1', onClick: () => handleAddElement('sticky', { color: 'rose', properties: { variant: 'v1' } }) },
        { label: 'Nota Post-it V2', onClick: () => handleAddElement('sticky', { color: 'lavender', properties: { variant: 'v2' } }) },
        { label: 'Nota Card V3', onClick: () => handleAddElement('sticky', { color: 'mint', properties: { variant: 'v3' } }) },
      ]
    },
    {
      label: 'Lista de Tareas',
      icon: List,
      onClick: () => handleAddElement('todo'),
    },
    {
      label: 'Contenedor',
      icon: Frame,
      onClick: () => handleAddElement('container'),
    },
    {
      label: 'Localizar',
      icon: MapPin,
      subMenu: [
        { label: 'Nuevo Localizador', onClick: () => handleAddElement('locator') },
        {
          label: 'Localizadores',
          subMenu: elements.filter(el => (el.type as string) === 'locator').map(loc => {
            const label = (typeof loc.content === 'object' && loc.content && (loc.content as any).label) ? (loc.content as any).label : 'Localizador';
            return { label: label, onClick: () => onLocateElement(loc.id), icon: MapPin };
          }),
        },
      ],
    },
    {
      label: 'Imagen',
      icon: ImageIcon,
      subMenu: [
        { label: 'Desde URL', onClick: onAddImageFromUrl },
        { label: 'Subir', onClick: onUploadImage },
        { label: 'Marco de foto', onClick: () => handleAddElement('image-frame') },
        { label: 'Subir + Crop', onClick: onCropImage },
        { label: 'Desde URL + Crop', onClick: onAddImageFromUrlWithCrop },
      ],
    },
    {
      label: 'Texto',
      icon: MessageCircle,
      subMenu: [
        { label: 'Texto', onClick: () => handleAddElement('text', { properties: { backgroundColor: '#ffffff' } }) },
        { label: 'Texto destacado', icon: Highlighter, onClick: () => handleAddElement('highlight-text') },
        { label: 'Añadir texto', onClick: () => handleAddElement('comment-small') },
        { label: 'Comentario R', onClick: () => handleAddElement('comment-r') },
      ],
    },
    {
      label: 'Más opciones',
      icon: MoreHorizontal,
      subMenu: [
        { label: 'Renombrar Tablero', onClick: () => { onOpenRenameBoardDialog(); onClose(); } },
        {
          label: 'Eliminar Tablero',
          onClick: () => {
            onClose();
            console.log('TODO: Integrar AlertDialog aquí');
            onDeleteBoard();
          },
        },
        { label: 'Eliminar todas mis imágenes', onClick: () => { onDeleteAllUserImages(); onClose(); } },
        { label: 'Exportar a PNG: alta resolución', onClick: () => { onExportBoardToPng(); onClose(); } },
        { label: 'Cerrar Sesión', onClick: handleSignOut },
      ],
    },
  ].filter(item => {
    const excludedLabels = ["GUIA DE FOTOS", "MI PLAN", "COLUMNA"];
    return !excludedLabels.includes(item.label);
  }), [boards, elements, handleAddElement, onLocateElement, onOpenNotepad, onOpenRenameBoardDialog, onDeleteBoard, onUploadImage, onAddImageFromUrl, onCropImage, onAddImageFromUrlWithCrop, onExportBoardToPng, onDeleteAllUserImages, handleSignOut, router, onClose, isListening, onToggleDictation]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="left"
        className={cn(
          "w-1/2 h-full bg-white flex flex-col p-4"
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Menú</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <CloseIcon className="h-6 w-6" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item, index) => (
              <li key={index}>
                {item.subMenu ? (
                  <div>
                    <button
                      className="w-full flex items-center justify-between gap-2 p-2 hover:bg-gray-100 rounded text-left text-sm"
                      onClick={() => toggleSubMenu(item.label)}
                    >
                      <span className="flex items-center gap-2">
                        {item.icon && <item.icon className="w-4 h-4" />}
                        {item.label}
                      </span>
                      <ChevronDown className={cn("w-4 h-4 text-black transition-transform", openSubMenus[item.label] && "rotate-180")} />
                    </button>
                    {openSubMenus[item.label] && (
                      <ul className="pl-6 mt-2 space-y-1">
                        {item.subMenu.map((subItem, subIndex) => (
                          <li key={subIndex}>
                            {subItem.subMenu ? (
                              <div>
                                <button
                                  className="w-full flex items-center justify-between gap-2 p-2 hover:bg-gray-100 rounded text-left text-sm"
                                  onClick={() => toggleSubMenu(`${item.label}-${subItem.label}`)}
                                >
                                  <span className="flex items-center gap-2">
                                    {subItem.icon && <subItem.icon className="mr-2 h-4 w-4" />}
                                    <span>{subItem.label}</span>
                                  </span>
                                  <ChevronDown className={cn("w-4 h-4 text-black transition-transform", openSubMenus[`${item.label}-${subItem.label}`] && "rotate-180")} />
                                </button>
                                {openSubMenus[`${item.label}-${subItem.label}`] && (
                                  <ul className="pl-6 mt-2 space-y-1">
                                    {subItem.subMenu.map((nestedItem, nestedIndex) => (
                                      <li key={nestedIndex}>
                                        <Button
                                          variant="ghost"
                                          className="w-full justify-start text-sm"
                                          onClick={nestedItem.onClick}
                                        >
                                          {nestedItem.icon && <nestedItem.icon className="mr-2 h-4 w-4" />}
                                          <span>{nestedItem.label}</span>
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={subItem.onClick}
                              >
                                {subItem.icon && <subItem.icon className="mr-2 h-4 w-4" />}
                                <span>{subItem.label}</span>
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    className={cn("w-full flex items-center gap-2 p-2 hover:bg-gray-100 rounded text-left text-sm", (item as any).className)}
                    onClick={item.onClick}
                  >
                    {item.icon && <item.icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
};

export default MobileMenu;
