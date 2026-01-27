'use client';

import React, { forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  SheetContent,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookCopy, LayoutDashboard, Mic, MicOff, Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ElementType, CanvasElement, Board, WithId, NotepadContent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import CreateBoardDialog from '@/components/canvas/create-board-dialog'; // Reutilizar el diálogo existente

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
  onUploadImage: () => void;
  onAddImageFromUrl: () => void;
  onCropImage: () => void;
  onAddImageFromUrlWithCrop: () => void;
  onPanToggle: () => void;
  onRenameBoard: () => void;
  onDeleteBoard: () => void;
  onDeleteAllUserImages: () => void;
  isListening: boolean;
  onToggleDictation: () => void;
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
}

const SidebarButton = forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof Button> & {
    label: string;
    icon?: React.ElementType;
    isActive?: boolean;
  }
>(({ label, icon: Icon, className, isActive, children, ...props }, ref) => {
  const isDictationActive = className?.includes('bg-red-500');
  return (
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
  );
});

SidebarButton.displayName = 'SidebarButton';

const MobileMenu = forwardRef<HTMLDivElement, MobileMenuProps>(({
  isOpen,
  onClose,
  elements,
  boards,
  boardId,
  user,
  onUploadImage,
  onAddImageFromUrl,
  onCropImage,
  onAddImageFromUrlWithCrop,
  onPanToggle,
  onRenameBoard,
  onDeleteBoard,
  onDeleteAllUserImages,
  isListening,
  onToggleDictation,
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
}, ref) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isCreateBoardOpen, setIsCreateBoardOpen] = React.useState(false);

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

  const elementsOnCanvas = React.useMemo(
    () => (Array.isArray(elements) ? elements : []).filter((el) => ['notepad', 'yellow-notepad', 'notes', 'mini'].includes(el.type) && el.hidden !== true),
    [elements]
  );
  
  const hiddenElements = React.useMemo(
    () => (Array.isArray(elements) ? elements : []).filter((el) => el.hidden === true),
    [elements]
  );

  return (
    <SheetContent side="right" className="p-4 w-full md:w-80 bg-white bg-opacity-80 backdrop-blur-sm flex flex-col items-start space-y-4">
      <CreateBoardDialog isOpen={isCreateBoardOpen} onOpenChange={setIsCreateBoardOpen} />

      {/* Botón Dictar */}
      <SidebarButton
        icon={isListening ? MicOff : Mic}
        label={isListening ? 'Detener' : 'Dictar'}
        title={isListening ? 'Detener dictado por voz' : 'Iniciar dictado por voz'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleDictation();
        }}
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          'w-full justify-center',
          isListening && 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 animate-pulse'
        )}
      />

      {/* Cuaderno */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full flex justify-between items-center text-black hover:bg-[#ADD8E6] active:bg-white">
            <div className="flex items-center gap-2">
              <BookCopy className="w-4 h-4" />
              <span>Cuaderno</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="left" align="start" className="w-56">
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
          {elementsOnCanvas.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Elementos Abiertos ({elementsOnCanvas.length})</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {elementsOnCanvas.map((element) => {
                  let title = 'Sin título';
                  switch (element.type) {
                    case 'notepad':
                    case 'yellow-notepad':
                      const notepadContent = element.content as NotepadContent;
                      title = notepadContent?.title || 'Cuaderno';
                      break;
                    case 'notes':
                      title = 'Apuntes';
                      break;
                    default:
                      title = 'Elemento';
                  }
                  return (
                    <DropdownMenuItem key={element.id} onClick={() => onLocateElement(element.id)}>
                      <span>{title}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {hiddenElements.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <span>Cerrados ({hiddenElements.length})</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {hiddenElements.map((element) => {
                  let title = 'Sin título';
                  switch (element.type) {
                    case 'notepad':
                    case 'yellow-notepad':
                      const notepadContent = element.content as NotepadContent;
                      title = notepadContent?.title || 'Cuaderno';
                      break;
                    case 'notes':
                      title = 'Apuntes';
                      break;
                    default:
                      title = 'Elemento';
                  }
                  return (
                    <DropdownMenuItem key={element.id} onClick={() => onOpenNotepad(element.id)}>
                      <span>{title}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tableros */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full flex justify-between items-center text-black hover:bg-[#ADD8E6] active:bg-white">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Tablero</span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="left" align="start" className="w-56">
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
    </SheetContent>
  );
});

MobileMenu.displayName = 'MobileMenu';

export default MobileMenu;
