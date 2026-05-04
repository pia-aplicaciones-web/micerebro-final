'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Rnd } from 'react-rnd';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Mic,
  MicOff,
  Link as LinkIcon,
  BookCopy,
  Package,
  PenTool,
  MoreHorizontal,
  MapPin,
  ChevronRight,
  Plus,
  GripVertical,
  ClipboardPaste,
  StickyNote,
  ListTodo,
  CalendarRange,
  Timer,
  Frame,
  ImageIcon,
  Trash2,
  LogOut,
  FileText,
  Languages,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getSavedLinks } from '@/lib/saved-links';
import type { SavedLink } from '@/lib/saved-links';
import { AddLinkDialog } from './add-link-dialog';
import CreateBoardDialog from './create-board-dialog';
import MiniToolsPanel from './mini-tools-panel';
import { cn } from '@/lib/utils';
import type { ElementType, CanvasElement, Board, WithId } from '@/lib/types';
import { signOut } from '@/lib/auth';

const MENU_BG = '#555556';
const MENU_WIDTH = 56;

interface MiniToolsSidebarProps {
  elements: WithId<CanvasElement>[];
  boards: WithId<Board>[];
  boardId: string;
  user: { uid?: string } | null;
  addElement: (type: ElementType, props?: any) => Promise<string>;
  onLocateElement: (id: string) => void;
  onOpenElement?: (id: string) => void;
  selectedElementId?: string | null;
  onDeleteElement?: (id: string) => void;
  onAddImageFromUrl: () => void;
  isListening: boolean;
  onToggleDictation: () => void;
  onSaveSelectionBeforeMic?: () => void;
  onExportBoardToPng: () => void;
  onCreateMiniBoard?: () => Promise<string | null>;
  onOpenUrlDocDialog?: () => void;
  onToggleMainMenuVisibility?: () => void;
  isMainMenuVisible?: boolean;
}

function MiniSidebarButton({
  icon: Icon,
  label,
  title,
  isActive,
  hasDropdown,
  onClick,
  onMouseDown,
  children,
  className,
}: {
  icon: React.ElementType;
  label: string;
  title: string;
  isActive?: boolean;
  hasDropdown?: boolean;
  onClick?: (e?: React.MouseEvent) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  className?: string;
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={onMouseDown}
      title={title}
      className={cn(
        'flex flex-col items-center justify-center w-full py-3 gap-0.5 rounded-md transition-colors',
        'hover:bg-white/15 text-white',
        isActive && 'bg-white/20',
        className
      )}
      style={{ minHeight: 52 }}
    >
      <div className="relative flex items-center justify-center">
        <Icon className="size-5 text-white" />
        {hasDropdown && <ChevronRight className="absolute -right-1 top-1/2 -translate-y-1/2 size-3 opacity-80" />}
      </div>
      <span className="text-[10px] font-medium text-white/95 leading-tight">{label}</span>
    </button>
  );

  const content = children ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{btn}</DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start" sideOffset={6} className="min-w-[160px]">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" className="bg-white/95 text-slate-700 border border-slate-200 shadow-sm text-[11px] px-2 py-1">
        {title}
      </TooltipContent>
    </Tooltip>
  );

  return content;
}

export default function MiniToolsSidebar({
  elements,
  boards,
  boardId,
  user,
  addElement,
  onLocateElement,
  onOpenElement,
  selectedElementId,
  onDeleteElement,
  onAddImageFromUrl,
  isListening,
  onToggleDictation,
  onSaveSelectionBeforeMic,
  onExportBoardToPng,
  onCreateMiniBoard,
  onOpenUrlDocDialog,
  onToggleMainMenuVisibility,
  isMainMenuVisible,
}: MiniToolsSidebarProps) {
  const router = useRouter();
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [openAddLinkDialog, setOpenAddLinkDialog] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [rndPos, setRndPos] = useState({ x: 8, y: 100 });
  const menuRef = useRef<HTMLDivElement>(null);

  const clampToViewport = useCallback((x: number, y: number) => {
    if (typeof window === 'undefined') return { x, y };
    const rect = menuRef.current?.getBoundingClientRect();
    const width = rect?.width || MENU_WIDTH;
    const height = rect?.height || 420;
    const maxX = Math.max(0, window.innerWidth - width);
    const maxY = Math.max(0, window.innerHeight - height);
    return {
      x: Math.min(maxX, Math.max(0, x)),
      y: Math.min(maxY, Math.max(0, y)),
    };
  }, []);

  useEffect(() => {
    setSavedLinks(getSavedLinks(boardId));
  }, [boardId]);
  const refreshLinks = useCallback(() => setSavedLinks(getSavedLinks(boardId)), [boardId]);

  const allLocators = (elements || []).filter((el) => el.type === 'locator');
  const openMisImagenes = (elements || []).filter((el) => el.type === 'mis-imagenes' && (el as any).minimized !== true);
  const closedMisImagenes = (elements || []).filter((el) => el.type === 'mis-imagenes' && (el as any).minimized === true);

  const handleAddElement = useCallback(
    (type: ElementType, props?: any) => {
      addElement(type, props);
    },
    [addElement]
  );

  const handleAddNotebookElement = useCallback(
    (type: ElementType, props?: any) => {
      addElement(type, { ...(props || {}), zIndex: 0 });
    },
    [addElement]
  );

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.startsWith('http') || text.startsWith('https'))) {
        const id = await addElement('image', { content: { url: text }, properties: { size: { width: 300, height: 200 } } });
        if (id) onLocateElement(id);
      }
    } catch {
      /* no clipboard */
    }
  }, [addElement, onLocateElement]);

  useEffect(() => {
    const next = clampToViewport(rndPos.x, rndPos.y);
    if (next.x !== rndPos.x || next.y !== rndPos.y) {
      setRndPos(next);
    }
  }, [clampToViewport, rndPos.x, rndPos.y]);

  return (
    <>
      <Rnd
        default={{ x: rndPos.x, y: rndPos.y, width: MENU_WIDTH, height: 420 }}
        position={{ x: rndPos.x, y: rndPos.y }}
        minWidth={MENU_WIDTH}
        maxWidth={MENU_WIDTH}
        minHeight={200}
        bounds="window"
        dragHandleClassName="drag-handle-mini"
        onDrag={(_, d) => setRndPos({ x: d.x, y: d.y })}
        onDragStop={(_, d) => setRndPos(clampToViewport(d.x, d.y))}
        className="z-[10003]"
        style={{ position: 'fixed' }}
      >
        <div
          ref={menuRef}
          className="flex flex-col rounded-lg shadow-lg border border-white/10 overflow-hidden"
          style={{ backgroundColor: MENU_BG, width: MENU_WIDTH }}
        >
          <div className="drag-handle-mini cursor-grab active:cursor-grabbing p-2 flex justify-center border-b border-white/10">
            <GripVertical className="size-4 text-white/70 rotate-90" />
          </div>
          <div className="flex flex-col py-1">
            {/* Tableros */}
            <MiniSidebarButton icon={LayoutDashboard} label="Tableros" title="Gestionar tableros" hasDropdown>
              <DropdownMenuItem onClick={() => setIsCreateBoardOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Tablero
              </DropdownMenuItem>
              {onCreateMiniBoard && (
                <DropdownMenuItem
                  onClick={async () => {
                    const id = await onCreateMiniBoard();
                    if (id) router.push(`/board/${id}/`);
                  }}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  + Tablero Mini
                </DropdownMenuItem>
              )}
              {boards.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>Abrir Tablero...</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {boards.map((b) => (
                        <DropdownMenuItem key={b.id} onClick={() => router.push(`/board/${b.id}/`)}>
                          {b.name || 'Sin nombre'}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </>
              )}
            </MiniSidebarButton>

            {/* Dictar */}
            <MiniSidebarButton
              icon={isListening ? MicOff : Mic}
              label={isListening ? 'Detener' : 'Dictar'}
              title={isListening ? 'Detener dictado' : 'Dictado por voz'}
              isActive={isListening}
              className={isListening ? '!bg-red-500/80 hover:!bg-red-500' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                onSaveSelectionBeforeMic?.();
              }}
              onClick={() => onToggleDictation()}
            />

            <MiniSidebarButton icon={Languages} label="EN" title="estudio Ingles — menú" hasDropdown>
              <DropdownMenuItem onClick={() => handleAddElement('english-flashcards')}>
                <Languages className="mr-2 h-4 w-4" />
                Tarjetas EN (libre)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('irregular-verbs')}>
                <ListTodo className="mr-2 h-4 w-4" />
                Verbos irregulares
              </DropdownMenuItem>
            </MiniSidebarButton>

            {/* Link */}
            <MiniSidebarButton icon={LinkIcon} label="Link" title="Páginas guardadas" hasDropdown>
              <DropdownMenuItem onClick={() => setOpenAddLinkDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar página
              </DropdownMenuItem>
              {savedLinks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {savedLinks.map((link) => {
                    const url = link.url || '';
                    const lower = url.toLowerCase();
                    let badgeColor = 'bg-yellow-100 text-yellow-800 border-yellow-200';
                    let badgeLabel = 'DOC';

                    if (/\.(doc|docx)$/.test(lower)) {
                      badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                      badgeLabel = 'Word';
                    } else if (/\.(xls|xlsx|csv)$/.test(lower)) {
                      badgeColor = 'bg-green-100 text-green-800 border-green-200';
                      badgeLabel = 'Excel';
                    } else if (lower.endsWith('.pdf')) {
                      badgeColor = 'bg-red-100 text-red-800 border-red-200';
                      badgeLabel = 'PDF';
                    }

                    return (
                      <DropdownMenuItem key={link.id} onClick={() => window.open(link.url, '_blank')}>
                        {/* Icono de hoja de cuaderno simulada */}
                        <FileText className="mr-2 h-4 w-4 text-white" />
                        <span className="flex-1 truncate">{link.name}</span>
                        <span
                          className={`ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${badgeColor}`}
                        >
                          {badgeLabel}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </MiniSidebarButton>

            {/* Cuadernos - solo notepad */}
            <MiniSidebarButton icon={BookCopy} label="Cuadernos" title="Agregar cuaderno" hasDropdown>
              <DropdownMenuItem onClick={() => handleAddNotebookElement('notepad')}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cuaderno
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNotebookElement('dictado')}>
                <Plus className="mr-2 h-4 w-4" />
                iPhone
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNotebookElement('block-dibujo')}>
                <Plus className="mr-2 h-4 w-4" />
                Block de Dibujo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddNotebookElement('block-dibujo-2')}>
                <Plus className="mr-2 h-4 w-4" />
                Dibujar
              </DropdownMenuItem>
            </MiniSidebarButton>

            {/* Materiales */}
            <MiniSidebarButton icon={Package} label="Materiales" title="Notas, listas, planner" hasDropdown>
              <DropdownMenuItem onClick={() => handleAddElement('sticky')}>
                <StickyNote className="mr-2 h-4 w-4" />
                Notas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('todo')}>
                <ListTodo className="mr-2 h-4 w-4" />
                Listas de tareas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('timer-lista')}>
                <Timer className="mr-2 h-4 w-4" />
                Timer Lista
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('weekly-planner')}>
                <CalendarRange className="mr-2 h-4 w-4" />
                Planner semanal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddElement('image-frame')}>
                <Frame className="mr-2 h-4 w-4" />
                Marco de foto
              </DropdownMenuItem>
              {onOpenUrlDocDialog && (
                <DropdownMenuItem onClick={onOpenUrlDocDialog}>
                  <FileText className="mr-2 h-4 w-4" />
                  + URL docs
                </DropdownMenuItem>
              )}
            </MiniSidebarButton>

            {/* ToolsSidebar */}
            <MiniSidebarButton
              icon={PenTool}
              label="ToolsSidebar"
              title="ToolsSidebar"
              isActive={isToolsPanelOpen}
              onClick={() => setIsToolsPanelOpen((p) => !p)}
            />

            {/* Localizar */}
            <MiniSidebarButton icon={MapPin} label="Localizar" title="Gestionar localizadores" hasDropdown>
              <DropdownMenuItem onClick={() => handleAddElement('locator')}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Localizador
              </DropdownMenuItem>
              {allLocators.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {allLocators.map((loc) => {
                    const label =
                      typeof loc.content === 'object' && loc.content && (loc.content as any).label
                        ? (loc.content as any).label
                        : 'Localizador';
                    return (
                      <DropdownMenuItem key={loc.id} onClick={() => onLocateElement(loc.id)}>
                        <MapPin className="mr-2 h-4 w-4" />
                        {label}
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </MiniSidebarButton>

            {/* Más */}
            <MiniSidebarButton icon={MoreHorizontal} label="Más" title="Más opciones" hasDropdown>
              <DropdownMenuItem onClick={handlePaste}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                Pegar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportBoardToPng}>
                Exportar PNG
              </DropdownMenuItem>
              {onToggleMainMenuVisibility && (
                <DropdownMenuItem onClick={onToggleMainMenuVisibility}>
                  {isMainMenuVisible === false ? 'Mostrar menú principal' : 'Ocultar menú principal'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => {
                  if (selectedElementId && onDeleteElement) {
                    onDeleteElement(selectedElementId);
                  }
                }}
                disabled={!selectedElementId || !onDeleteElement}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar seleccionado
              </DropdownMenuItem>
              {user?.uid && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await signOut();
                        router.push('/');
                      } catch (error) {
                        console.error('Error al cerrar sesión desde Tablero Mini:', error);
                      }
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </>
              )}
            </MiniSidebarButton>
          </div>
        </div>
      </Rnd>

      <AddLinkDialog
        open={openAddLinkDialog}
        onOpenChange={setOpenAddLinkDialog}
        onSaved={refreshLinks}
        boardId={boardId}
      />
      <CreateBoardDialog
        isOpen={isCreateBoardOpen}
        onOpenChange={setIsCreateBoardOpen}
        onCreated={(id) => router.push(`/board/${id}/`)}
      />

      {isToolsPanelOpen && (
        <MiniToolsPanel
          onClose={() => setIsToolsPanelOpen(false)}
        />
      )}
    </>
  );
}