'use client';

import React, { useState, useCallback, useEffect } from 'react';
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

const MENU_BG = '#555556';
const MENU_WIDTH = 56;

interface MiniToolsSidebarProps {
  elements: WithId<CanvasElement>[];
  boards: WithId<Board>[];
  boardId: string;
  user: { uid?: string } | null;
  addElement: (type: ElementType, props?: any) => Promise<string>;
  onLocateElement: (id: string) => void;
  onAddImageFromUrl: () => void;
  isListening: boolean;
  onToggleDictation: () => void;
  onSaveSelectionBeforeMic?: () => void;
  onExportBoardToPng: () => void;
  onCreateMiniBoard?: () => Promise<string | null>;
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
      <TooltipContent side="right" className="bg-gray-100 text-black text-xs">
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
  onAddImageFromUrl,
  isListening,
  onToggleDictation,
  onSaveSelectionBeforeMic,
  onExportBoardToPng,
  onCreateMiniBoard,
}: MiniToolsSidebarProps) {
  const router = useRouter();
  const [savedLinks, setSavedLinks] = useState<SavedLink[]>([]);
  const [openAddLinkDialog, setOpenAddLinkDialog] = useState(false);
  const [isToolsPanelOpen, setIsToolsPanelOpen] = useState(false);
  const [rndPos, setRndPos] = useState({ x: 8, y: 100 });

  useEffect(() => {
    setSavedLinks(getSavedLinks());
  }, []);
  const refreshLinks = useCallback(() => setSavedLinks(getSavedLinks()), []);

  const allLocators = (elements || []).filter((el) => el.type === 'locator');

  const handleAddElement = useCallback(
    (type: ElementType, props?: any) => {
      addElement(type, props);
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

  return (
    <>
      <Rnd
        default={{ x: rndPos.x, y: rndPos.y, width: MENU_WIDTH, height: 420 }}
        minWidth={MENU_WIDTH}
        maxWidth={MENU_WIDTH}
        minHeight={200}
        bounds="window"
        dragHandleClassName="drag-handle-mini"
        onDragStop={(_, d) => setRndPos({ x: d.x, y: d.y })}
        className="z-[10003]"
      >
        <div
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

            {/* Link */}
            <MiniSidebarButton icon={LinkIcon} label="Link" title="Páginas guardadas" hasDropdown>
              <DropdownMenuItem onClick={() => setOpenAddLinkDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar página
              </DropdownMenuItem>
              {savedLinks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {savedLinks.map((link) => (
                    <DropdownMenuItem key={link.id} onClick={() => window.open(link.url, '_blank')}>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      {link.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </MiniSidebarButton>

            {/* Cuadernos - solo notepad */}
            <MiniSidebarButton icon={BookCopy} label="Cuadernos" title="Agregar cuaderno" hasDropdown>
              <DropdownMenuItem onClick={() => handleAddElement('notepad')}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Cuaderno
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
              <DropdownMenuItem onClick={() => handleAddElement('weekly-planner')}>
                <CalendarRange className="mr-2 h-4 w-4" />
                Planner semanal
              </DropdownMenuItem>
            </MiniSidebarButton>

            {/* Tools */}
            <MiniSidebarButton
              icon={PenTool}
              label="Tools"
              title="Herramientas de formato"
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
            </MiniSidebarButton>
          </div>
        </div>
      </Rnd>

      <AddLinkDialog open={openAddLinkDialog} onOpenChange={setOpenAddLinkDialog} onSaved={refreshLinks} />
      <CreateBoardDialog
        isOpen={isCreateBoardOpen}
        onOpenChange={setIsCreateBoardOpen}
        onCreated={(id) => router.push(`/board/${id}/`)}
      />

      {isToolsPanelOpen && (
        <MiniToolsPanel
          onClose={() => setIsToolsPanelOpen(false)}
          onAddImageFromUrl={onAddImageFromUrl}
        />
      )}
    </>
  );
}
