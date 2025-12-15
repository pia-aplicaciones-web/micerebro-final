// Archivo de compatibilidad - reexporta desde los nuevos lugares
// TODO: Migrar gradualmente todos los archivos a usar los nuevos imports

export { 
  FirebaseContext, 
  useFirebaseContext,
  useAuth,
  useFirestore,
  useStorage,
  useFirebaseApp,
  useUser,
  FirebaseProvider,
  type FirebaseContextState,
  type UserHookResult,
} from './provider';

