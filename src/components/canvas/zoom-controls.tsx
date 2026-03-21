
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Focus, Home, ChevronsUp, ChevronsDown, ChevronDown, Undo, Redo } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CanvasElement, WithId } from "@/lib/types";
import { cn } from "@/lib/utils";

type ZoomControlsProps = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  scale: number;
  centerOnElements: () => void;
  goToHome: () => void;
  selectedElement: WithId<CanvasElement> | null;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onMoveBackward: (id: string) => void;
  isMobile: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
};

export default function ZoomControls({
  zoomIn,
  zoomOut,
  resetZoom,
  scale,
  centerOnElements,
  goToHome,
  selectedElement,
  onBringToFront,
  onSendToBack,
  onMoveBackward,
  isMobile,
  onUndo,
  canUndo = false,
  onRedo,
  canRedo = false,
}: ZoomControlsProps) {
  const WithTooltip = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <Tooltip>
      <TooltipTrigger asChild>{children as any}</TooltipTrigger>
      <TooltipContent side="top" className="bg-white/95 text-slate-700 border border-slate-200 shadow-sm text-[11px] px-2 py-1">
        {label}
      </TooltipContent>
    </Tooltip>
  );

  const controls = (
    <>
      {onUndo && (
        <>
          <WithTooltip label="Deshacer">
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              className="h-8 w-8"
              disabled={!canUndo}
              title="Deshacer"
            >
              <Undo className="h-4 w-4" />
              <span className="sr-only">Deshacer</span>
            </Button>
          </WithTooltip>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}
      {onRedo && (
        <>
          <WithTooltip label="Rehacer">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              className="h-8 w-8"
              disabled={!canRedo}
              title="Rehacer"
            >
              <Redo className="h-4 w-4" />
              <span className="sr-only">Rehacer</span>
            </Button>
          </WithTooltip>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}
      <WithTooltip label="Alejar">
        <Button variant="ghost" size="icon" onClick={zoomOut} className="h-8 w-8">
          <ZoomOut className="h-4 w-4" />
          <span className="sr-only">Alejar</span>
        </Button>
      </WithTooltip>
      <WithTooltip label="Restablecer zoom">
        <button
          onClick={resetZoom}
          className="flex h-8 w-12 items-center justify-center rounded-sm text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          {Math.round(scale * 100)}%
        </button>
      </WithTooltip>
      <WithTooltip label="Acercar">
        <Button variant="ghost" size="icon" onClick={zoomIn} className="h-8 w-8">
          <ZoomIn className="h-4 w-4" />
          <span className="sr-only">Acercar</span>
        </Button>
      </WithTooltip>
      <Separator orientation="vertical" className="h-6" />
      <WithTooltip label="Centrar contenido">
        <Button variant="ghost" size="icon" onClick={centerOnElements} className="h-8 w-8">
          <Focus className="h-4 w-4" />
          <span className="sr-only">Centrar en Contenido</span>
        </Button>
      </WithTooltip>
      <WithTooltip label="Ir al inicio">
        <Button variant="ghost" size="icon" onClick={goToHome} className="h-8 w-8">
          <Home className="h-4 w-4" />
          <span className="sr-only">Ir al Inicio</span>
        </Button>
      </WithTooltip>
      
      {selectedElement && (selectedElement.type as any) !== 'frame' && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />
          <WithTooltip label="Traer al frente">
            <Button variant="ghost" size="icon" onClick={() => onBringToFront(selectedElement.id)} className="h-8 w-8" title="Traer al frente">
              <ChevronsUp className="h-4 w-4" />
              <span className="sr-only">Traer al frente</span>
            </Button>
          </WithTooltip>
          <WithTooltip label="Enviar hacia atrás">
            <Button variant="ghost" size="icon" onClick={() => onMoveBackward(selectedElement.id)} className="h-8 w-8" title="Enviar hacia atrás">
              <ChevronDown className="h-4 w-4" />
              <span className="sr-only">Enviar hacia atrás</span>
            </Button>
          </WithTooltip>
          <WithTooltip label="Enviar al fondo">
            <Button variant="ghost" size="icon" onClick={() => onSendToBack(selectedElement.id)} className="h-8 w-8" title="Enviar al fondo">
              <ChevronsDown className="h-4 w-4" />
              <span className="sr-only">Enviar al fondo</span>
            </Button>
          </WithTooltip>
        </>
      )}
    </>
  )

  return (
    <div className={cn(
        "absolute z-[10002] flex items-center gap-1 rounded-lg border bg-background p-1 shadow-md",
        isMobile ? "bottom-4 left-1/2 -translate-x-1/2" : "bottom-4 right-4"
    )}>
      {controls}
    </div>
  );
}
