"use client";

import React, { useState } from "react";
import { signInWithGoogle } from "@/lib/auth";
import { BrainCircuit, Loader2, Mail } from "lucide-react";
import LoginDialog from "./login-dialog";

export function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      console.error("Error login Google:", err);
      setError("No se pudo conectar con Google. Revisa tu conexión.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans text-slate-900" style={{ backgroundColor: '#75e8ce' }}>
      
      {/* Fondo decorativo */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
           style={{ 
             backgroundImage: 'radial-gradient(#2c3e50 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
           }}>
      </div>

      <div className="z-10 w-full max-w-md px-6">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="h-16 w-16 bg-[#16b5a8] rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-[#16b5a8]/20">
            <BrainCircuit className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
            CanvasMind
          </h1>
          <p className="text-slate-500 text-lg">
            Tu segundo cerebro. Infinito. Visual.
          </p>
        </div>

        {/* Tarjeta Login */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="space-y-4">
            
            {/* Botón Google */}
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium h-12 rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#16b5a8]" />
              ) : (
                <>
                  <span className="font-bold text-blue-600">G</span>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400">O usa email</span>
              </div>
            </div>

            {/* Botón Entrar (abre modal de login) */}
            <button
              onClick={() => setShowLoginDialog(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#16b5a8] hover:bg-[#139c91] text-white font-medium h-12 rounded-lg transition-all duration-200 shadow-md shadow-[#16b5a8]/20 disabled:opacity-50"
            >
              <Mail className="h-5 w-5" />
              <span>Entrar</span>
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Login Dialog */}
      <LoginDialog 
        isOpen={showLoginDialog} 
        onClose={() => setShowLoginDialog(false)} 
      />
    </div>
  );
}
