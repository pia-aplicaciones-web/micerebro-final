# Revisión Firebase – Mi Cerebro App

## ✅ Corregido en esta revisión

1. **Firestore: misma base de datos en todos los sitios**
   - En `src/lib/firebase.js` ya se usaba la base de datos **`datacerebro`** (`getFirestore(app, 'datacerebro')`).
   - En `src/firebase/client-provider.tsx` se usaba la base de datos **por defecto** (`getFirestore(app)`).
   - **Cambio:** En `client-provider.tsx` se usa también `getFirestore(app, 'datacerebro')` para que, si en algún momento se usa ese provider, Firestore apunte a la misma base que el resto de la app.

2. **signOut sin init**
   - En `src/lib/auth.js`, `signOut()` podía llamar a `getFirebaseAuth()` antes de que Firebase estuviera inicializado (por ejemplo, si se cerraba sesión muy pronto).
   - **Cambio:** Se llama a `await initFirebase()` antes de `getFirebaseAuth()` en cliente, para asegurar que Auth exista antes de cerrar sesión.

---

## ⚠️ Puntos a tener en cuenta

### Dos archivos de providers

- **`src/components/providers.tsx`** – Solo `AuthProvider` (usa `initFirebase` de `lib/firebase.js`).
- **`src/components/providers.jsx`** – `FirebaseClientProvider` + `AuthProvider`.

El layout importa `@/components/providers`; según la resolución de módulos puede cargarse `.tsx` o `.jsx`. Conviene dejar **un solo** archivo de providers (por ejemplo solo `providers.tsx`) y eliminar o deprecar el otro para no tener dos árboles de providers distintos.

### Inicialización de Firebase

- Toda la app que usa Firestore/Auth depende de **`lib/firebase.js`**: `initFirebase()`, `getFirebaseFirestore()`, `getFirebaseAuth()`.
- La base de datos usada es **`datacerebro`** (debe existir en Firebase Console con ese nombre).
- El orden recomendado: montar primero `AuthProvider` (que hace `initFirebase()` y escucha auth) y luego acceder a tableros/datos, para no llamar a `getFirebaseFirestore()` antes de que `initFirebase()` haya terminado.

### Credenciales

- La configuración de Firebase está en **`src/lib/firebase.js`** (valores en código).
- Para entornos distintos (dev/prod) se puede pasar a variables de entorno `NEXT_PUBLIC_FIREBASE_*` y leerlas en `firebase.js`; en la consola de Firebase conviene restringir la API key por dominio.

### Errores de permisos

- `FirebaseErrorListener` y `firebase/errors.ts` muestran errores de permisos de Firestore. Si ves “Error de Permisos de Firestore”, hay que revisar las **reglas de seguridad** del proyecto en Firebase Console para la base de datos **datacerebro**.

---

## Resumen

- **Firestore:** Una sola base de datos, **`datacerebro`**, usada en `lib/firebase.js` y en `client-provider.tsx`.
- **Auth:** `signOut` ahora asegura `initFirebase()` antes de usar Auth.
- **Providers:** Hay dos archivos de providers; recomendación: unificar en uno y usar siempre la misma cadena de providers.
