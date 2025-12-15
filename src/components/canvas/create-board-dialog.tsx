
"use client";

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/context/AuthContext";
import { getFirebaseFirestore } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

type CreateBoardDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

export default function CreateBoardDialog({ isOpen, onOpenChange }: CreateBoardDialogProps) {
  const [boardName, setBoardName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const firestore = getFirebaseFirestore();
  const { user } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateBoard = async () => {
    if (!firestore || !user || !boardName.trim()) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "El nombre del tablero no puede estar vacío."
        });
        return;
    }

    setIsCreating(true);
    const boardsCollection = collection(firestore, 'users', user.uid, 'canvasBoards');
    const dataToSend = {
        name: boardName,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    try {
        const newBoardRef = await addDoc(boardsCollection, dataToSend);
        toast({
            title: "Tablero Creado",
            description: `Se ha creado el tablero "${boardName}".`,
        });

        onOpenChange(false);
        setBoardName("");
        // The redirection is now handled by the main home page logic
        // router.push(`/board/${newBoardRef.id}`);
    } catch (error) {
        console.error("Error creating new board:", error);
        if (user) {
            errorEmitter.emit(
                'permission-error',
                new FirestorePermissionError({
                    path: boardsCollection.path,
                    operation: 'create',
                    requestResourceData: dataToSend
                }, user)
            );
        }
    } finally {
        setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear Nuevo Tablero</DialogTitle>
          <DialogDescription>
            Dale un nombre a tu nuevo lienzo de ideas.
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
              placeholder="Ej: Ideas para mi proyecto"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleCreateBoard} disabled={!boardName.trim() || isCreating}>
            {isCreating ? "Creando..." : "Crear Tablero"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
