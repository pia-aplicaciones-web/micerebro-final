'use client';

import { useAuthContext } from '@/context/AuthContext';
import { signOut } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const { user } = useAuthContext();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 bg-black rounded-full flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 36 36" fill="none">
            <defs>
              <linearGradient id="headerLogo" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00ffaa" />
                <stop offset="50%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#0066ff" />
              </linearGradient>
            </defs>
            <path d="M6 18C6 14 8 12 12 12C14 12 16 13 18 14C20 15 22 16 24 16C26 16 28 15 30 14C32 13 34 14 34 18C34 22 32 24 30 24C28 24 26 23 24 22C22 21 20 20 18 20C16 20 14 21 12 22C10 23 8 22 6 18Z" fill="url(#headerLogo)"/>
          </svg>
        </div>
        <h1 className="font-semibold text-slate-900">Mi cerebro</h1>
      </div>
      
      {user && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">{user.email || 'Usuario'}</span>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Salir
          </Button>
        </div>
      )}
    </nav>
  );
}

