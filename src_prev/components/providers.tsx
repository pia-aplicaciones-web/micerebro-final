"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";

/**
 * Providers Component
 * 
 * Orden lógico de providers:
 * 1. AuthProvider - Autenticación y Firebase (nuevo sistema)
 * 2. NextThemesProvider - Tema visual (dark/light mode)
 * 3. TooltipProvider - Componentes UI (tooltips)
 */
export function Providers({ children }) {
  return (
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
  );
}
