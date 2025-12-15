// Archivo de compatibilidad - reexporta desde los nuevos lugares
// TODO: Migrar gradualmente todos los archivos a usar los nuevos imports

export {
  signInWithGoogle,
  signInAsGuest,
  signInWithEmail,
  createUserWithEmail,
  signOut,
} from '@/lib/auth';

