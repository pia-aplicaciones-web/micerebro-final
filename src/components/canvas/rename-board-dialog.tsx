"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RenameBoardDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  currentBoardName: string;
  onSave: (newName: string) => void;
};

export default function RenameBoardDialog({ 
    isOpen, 
    onOpenChange, 
    currentBoardName,
    onSave
}: RenameBoardDialogProps) {
  const [boardName, setBoardName] = useState(currentBoardName);

  useEffect(() => {
    if (isOpen) {
        setBoardName(currentBoardName);
    }
  }, [isOpen, currentBoardName]);

  const handleSave = () => {
    if (boardName.trim()) {
      onSave(boardName);
    }
    onOpenChange(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) handleSave();
        else onOpenChange(true);
    }}>
      <DialogContent onInteractOutside={handleSave}>
        <DialogHeader>
          <DialogTitle>Renombrar Tablero</DialogTitle>
          <DialogDescription>
            El tablero se guardará automáticamente cuando cierres este diálogo o presiones Enter.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="boardName" className="text-right">
              Nombre
            </Label>
            <Input
              id="boardName"
              name="boardName"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="col-span-3"
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
