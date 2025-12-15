'use client';

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { FirebaseClientProvider } from "@/firebase/client-provider";

/**
 * Providers Component
 * 
 * Orden lógico de providers:
 * 1. FirebaseClientProvider - Base de datos y autenticación (Firebase)
 * 2. AuthProvider - Contexto de autenticación (usa useAuth)
 * 3. NextThemesProvider - Tema visual (dark/light mode)
 * 4. TooltipProvider - Componentes UI (tooltips)
 */
export function Providers({ children }) {
  return (
    <FirebaseClientProvider>
      <AuthProvider>
        <NextThemesProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
        </NextThemesProvider>
      </AuthProvider>
    </FirebaseClientProvider>
  );
}

