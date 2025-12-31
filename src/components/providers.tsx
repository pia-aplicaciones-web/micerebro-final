"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { SafetyProvider } from "@/context/SafetyContext";

/**
 * Providers Component
 *
 * Orden lógico de providers:
 * 1. AuthProvider - Autenticación y Firebase (nuevo sistema)
 * 2. SafetyProvider - Controles de seguridad y prevención de reversiones
 * 3. NextThemesProvider - Tema visual (dark/light mode)
 * 4. TooltipProvider - Componentes UI (tooltips)
 */
export function Providers({ children }) {
  return (
    <AuthProvider>
      <SafetyProvider>
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
      </SafetyProvider>
    </AuthProvider>
  );
}
