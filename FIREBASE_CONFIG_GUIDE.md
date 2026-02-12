# 🔥 Guía Completa de Configuración de Firebase - Mi Cerebro App

## 📋 Información General del Proyecto Firebase

### 🏷️ **Detalles del Proyecto**
- **Nombre del proyecto:** MicerebroApp
- **ID del proyecto:** `micerebroapp`
- **Número del proyecto:** 967156176052
- **Nombre público (config pública):** project-967156176052
- **Correo de asistencia:** mpiafinlay@gmail.com
- **Tipo:** Proyecto de Firebase con Firestore, Auth y Storage
- **Ubicación:** `nam5` (us-central)
- **Entorno:** Sin especificar
- **Estado:** ✅ Configurado y funcionando

### 🌐 **URLs y Dominios**
- **Auth Domain:** `micerebroapp.firebaseapp.com`
- **Storage Bucket:** `micerebroapp.firebasestorage.app`
- **Hosting:** `micerebroapp.web.app` (opcional, usando Vercel)
- **Console Firebase:** https://console.firebase.google.com/project/micerebroapp/overview

## 🔑 **Credenciales de Firebase**

### 📱 **Configuración Principal (NO compartir)**
```javascript
// src/lib/firebase.js
export const firebaseConfig = {
  apiKey: "AIzaSyCbnZ8uKlOc8PBvTql2N2PkIDxc2BXWFCg",
  authDomain: "micerebroapp.firebaseapp.com",
  projectId: "micerebroapp",
  storageBucket: "micerebroapp.firebasestorage.app",
  messagingSenderId: "967156176052",
  appId: "1:967156176052:web:2a7da145935daecdd6f3e1"
};
```

### 🔐 **Variables de Entorno (Recomendado para producción)**
```env
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCbnZ8uKlOc8PBvTql2N2PkIDxc2BXWFCg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=micerebroapp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=micerebroapp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=micerebroapp.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=967156176052
NEXT_PUBLIC_FIREBASE_APP_ID=1:967156176052:web:2a7da145935daecdd6f3e1
```

## 🗄️ **Base de Datos - Firestore**

### 📊 **Configuración de Firestore**
- **Base de datos:** `datacerebro`
- **Ubicación:** `nam5` (us-central)
- **Modo:** Nativo (Firestore)
- **Reglas de seguridad:** Habilitadas

### 🏗️ **Estructura de la Base de Datos**

```
Firestore Database: datacerebro
├── users/{userId}/
│   ├── canvasBoards/{boardId}/
│   │   ├── canvasElements/{elementId}/
│   │   ├── name: string
│   │   ├── userId: string
│   │   ├── createdAt: timestamp
│   │   ├── updatedAt: timestamp
│   │   └── [otros campos del tablero]
│   └── MicerebroElements/{elementId}/
│       └── [elementos adicionales del usuario]
```

### 📝 **Campos Típicos de un Tablero**
```javascript
{
  id: "boardId",
  name: "Mi Primer Tablero",
  userId: "userId",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  // otros campos específicos del tablero
}
```

## 🔒 **Reglas de Seguridad (Firestore Rules)**

### 📄 **Contenido Actual de `firestore.rules`**
```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Reglas para documentos de usuario
    match /users/{userId} {
      // Los usuarios (incluyendo anónimos) solo pueden leer y escribir en su propio documento
      // Permitir crear si no existe (para ensureUserDocument)
      // IMPORTANTE: request.auth != null incluye usuarios anónimos
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId &&
                       request.resource.data.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;

      // Reglas para tableros del usuario (subcolección canvasBoards)
      match /canvasBoards/{boardId} {
        // Los usuarios (incluyendo anónimos) solo pueden leer y escribir en sus propios tableros
        allow read, create: if request.auth != null && request.auth.uid == userId;
        allow update, delete: if request.auth != null && request.auth.uid == userId;

        // Reglas para elementos del tablero (subcolección canvasElements)
        match /canvasElements/{elementId} {
          // Los usuarios (incluyendo anónimos) solo pueden leer y escribir elementos de sus propios tableros
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }

      // Reglas para elementos del usuario (subcolección MicerebroElements)
      match /MicerebroElements/{elementId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

### 🛡️ **Explicación de las Reglas**
- **Usuarios autenticados:** Pueden acceder solo a sus propios datos
- **Usuarios anónimos:** Permitidos (incluidos en `request.auth != null`)
- **Jerarquía de permisos:** Usuario → Tableros → Elementos
- **Operaciones permitidas:** CRUD completo en datos propios

## 🔐 **Autenticación (Firebase Auth)**

### ✅ **Proveedores Configurados**
- **Google Sign-In:** ✅ Habilitado
- **Email/Password:** ✅ Habilitado
- **Usuarios anónimos:** ✅ Habilitado
- **Persistencia:** Sesión del navegador (`browserSessionPersistence`)

### 📱 **Configuración de Autenticación**

#### Google Sign-In
```javascript
// src/firebase/auth.ts
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account',
});
```

#### Detección de Dispositivo para Auth
```javascript
function shouldUsePopup(): boolean {
  // Móvil o problemas con sessionStorage → Usar popup
  // Desktop con sessionStorage OK → Usar redirect
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  let sessionStorageAvailable = false;
  try {
    sessionStorage.setItem('__test__', 'test');
    sessionStorage.removeItem('__test__');
    sessionStorageAvailable = true;
  } catch (e) {
    sessionStorageAvailable = false;
  }
  return isMobile || !sessionStorageAvailable;
}
```

### 👤 **Gestión de Usuarios**

#### Creación Automática de Documentos
```javascript
// src/lib/firestore.js - ensureUserDocument()
export async function ensureUserDocument(user) {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDocument('users', user.uid, {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Invitado',
    });
  }
}
```

## 🗂️ **Firebase Storage**

### 📁 **Configuración de Storage**
- **Bucket:** `micerebroapp.firebasestorage.app`
- **Reglas:** `storage.rules`

### 📋 **Reglas de Storage (`storage.rules`)**
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Permitir lectura pública para archivos subidos
      allow read;
      // Permitir escritura solo para usuarios autenticados
      allow write: if request.auth != null;
    }
  }
}
```

## 🚀 **Inicialización de Firebase**

### ⚙️ **Configuración de Inicialización**
```javascript
// src/lib/firebase.js
let app = null;
let auth = null;
let firestore = null;
let storage = null;
let initPromise = null;

// Inicialización lazy (solo cuando se necesita)
export const initFirebase = async () => {
  if (typeof window === 'undefined') {
    return { app: null, auth: null, firestore: null, storage: null };
  }

  if (app && auth && firestore && storage) {
    return { app, auth, firestore, storage };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log('✅ Firebase App inicializado');
    } else {
      app = getApp();
      console.log('✅ Firebase App ya existente, reutilizando');
    }

    auth = getAuth(app);
    await setPersistence(auth, browserSessionPersistence);
    console.log('✅ Firebase Auth inicializado con persistencia de sesión');

    firestore = getFirestore(app, 'datacerebro');
    storage = getStorage(app);
    console.log('✅ Firebase Firestore y Storage inicializados');

    return { app, auth, firestore, storage };
  })();

  return initPromise;
};
```

## 🛠️ **Comandos de Firebase CLI**

### 📦 **Instalación y Configuración**
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Ver proyectos
firebase projects:list

# Usar proyecto específico
firebase use micerebroapp
```

### 🚀 **Deploy y Gestión**
```bash
# Deploy de hosting (si se usa Firebase Hosting)
firebase deploy --only hosting

# Deploy solo de reglas
firebase deploy --only firestore:rules

# Deploy solo de índices
firebase deploy --only firestore:indexes
```

### 📊 **Monitoreo y Debugging**
```bash
# Ver estado del proyecto
firebase projects:list

# Ver funciones (si las hay)
firebase functions:list

# Ver logs de hosting
firebase hosting:channel:list
```

## 📊 **Índices de Firestore**

### 📄 **Archivo `firestore.indexes.json`**
```json
{
  "indexes": [],
  "fieldOverrides": []
}
```
*Nota: Actualmente no hay índices personalizados configurados*

## 🔧 **Integración con Next.js**

### 📁 **Archivos de Configuración**
```
src/
├── firebase/
│   ├── config.ts          # Reexporta configuración
│   ├── auth.ts            # Funciones de autenticación
│   ├── client-provider.tsx # Provider de React
│   ├── error-emitter.ts   # Manejo de errores
│   ├── errors.ts          # Definiciones de errores
│   └── provider.tsx       # Provider principal
├── lib/
│   ├── firebase.js        # Configuración principal
│   └── firestore.js       # CRUD operations
└── components/
    └── providers.jsx      # Context providers
```

### ⚡ **Hooks y Contextos**
- **AuthContext:** Gestión de estado de autenticación
- **useAuth:** Hook personalizado para autenticación
- **FirebaseProvider:** Provider de Firebase para la app

## 🚨 **Problemas Comunes y Soluciones**

### ❌ **Error: "Firebase App named '[DEFAULT]' already exists"**
**Solución:** Verificar inicialización múltiple
```javascript
// Usar getApps() para verificar si ya existe
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}
```

### ❌ **Error: "Missing or insufficient permissions"**
**Solución:** Verificar reglas de Firestore
- Asegurarse de que `request.auth != null`
- Verificar que `request.auth.uid == userId`
- Revisar jerarquía de documentos

### ❌ **Error: "Session storage not available"**
**Solución:** Usar popup en lugar de redirect
```javascript
// Detectar problemas con sessionStorage
function shouldUsePopup() {
  try {
    sessionStorage.setItem('test', 'test');
    sessionStorage.removeItem('test');
    return false; // OK, usar redirect
  } catch (e) {
    return true; // Problemas, usar popup
  }
}
```

### ❌ **Error: "Function returned undefined, expected Promise or value"**
**Solución:** Asegurar que las funciones devuelvan valores
```javascript
// ❌ Malo
async function getData() {
  const doc = await getDoc(docRef);
  // Olvidó return
}

// ✅ Bueno
async function getData() {
  const doc = await getDoc(docRef);
  return doc.exists() ? doc.data() : null;
}
```

## 📈 **Monitoreo y Métricas**

### 🔍 **Console Firebase**
- **Authentication:** Ver usuarios activos
- **Firestore:** Ver uso de base de datos
- **Storage:** Ver archivos almacenados
- **Functions:** Ver logs y métricas (si aplica)

### 📊 **Límites y Cuotas**
- **Firestore:** 1GB gratis, luego $0.18/GB
- **Auth:** 10,000 usuarios gratis
- **Storage:** 5GB gratis, luego $0.026/GB
- **Hosting:** 10GB gratis (si se usa)

## 🔄 **Migración y Backup**

### 💾 **Exportar Datos**
```bash
# Exportar colección específica
firebase firestore:export --collection-ids=users

# Exportar todo
firebase firestore:export
```

### 📥 **Importar Datos**
```bash
# Importar desde backup
firebase firestore:import
```

## 📝 **Mejores Prácticas**

### 🏗️ **Estructura de Datos**
- Usar subcolecciones para datos relacionados
- Incluir timestamps `createdAt` y `updatedAt`
- Usar IDs generados por Firebase para evitar colisiones

### 🔒 **Seguridad**
- Nunca exponer claves API en código cliente
- Usar variables de entorno para configuración sensible
- Mantener reglas de seguridad actualizadas

### ⚡ **Performance**
- Usar índices apropiados para consultas complejas
- Implementar paginación para listas grandes
- Usar `serverTimestamp()` para timestamps consistentes

### 🐛 **Debugging**
- Habilitar logging detallado en desarrollo
- Usar Firebase Console para monitoreo
- Implementar manejo de errores robusto

## 📞 **Soporte y Recursos**

### 🔗 **Enlaces Útiles**
- **Firebase Console:** https://console.firebase.google.com/project/micerebroapp
- **Documentación:** https://firebase.google.com/docs
- **Stack Overflow:** https://stackoverflow.com/questions/tagged/firebase
- **GitHub Issues:** https://github.com/firebase/firebase-js-sdk/issues

### 📧 **Contactos de Soporte**
- **Firebase Support:** https://firebase.google.com/support
- **Community:** https://firebase.google.com/community

---

## 🎯 **Checklist de Verificación de Firebase**

### Configuración Inicial
- [x] Proyecto creado en Firebase Console
- [x] Firestore habilitado
- [x] Authentication configurada
- [x] Storage configurado (opcional)

### Reglas de Seguridad
- [x] `firestore.rules` actualizadas
- [x] `storage.rules` configuradas
- [x] Reglas probadas y funcionales

### Código de Aplicación
- [x] Configuración importada correctamente
- [x] Inicialización lazy implementada
- [x] Autenticación funcionando
- [x] CRUD operations probadas

### Producción
- [x] Variables de entorno configuradas
- [x] Reglas de seguridad activas
- [x] Monitoreo habilitado
- [x] Backups configurados

**Estado actual:** ✅ Firebase completamente configurado y funcionando
**Última verificación:** $(date)
**Proyecto:** `micerebroapp` - Producción activa
