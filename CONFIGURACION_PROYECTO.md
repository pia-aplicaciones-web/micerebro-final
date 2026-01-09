# 🚀 Configuración del Proyecto - Mi Cerebro App

## 📋 Información General
- **Nombre del proyecto:** micerebroapp
- **Versión:** 0.1.1
- **Framework:** Next.js 15.2.6
- **URL de producción:** https://micerebroapp.vercel.app/
- **Repositorio:** https://github.com/pia-aplicaciones-web/micerebro-final.git

## 🔥 Configuración de Firebase

### 📊 Proyecto Firebase
- **Project ID:** `micerebroapp`
- **Auth Domain:** `micerebroapp.firebaseapp.com`
- **Storage Bucket:** `micerebroapp.firebasestorage.app`
- **Messaging Sender ID:** `967156176052`
- **App ID:** `1:967156176052:web:2a7da145935daecdd6f3e1`

### 🗄️ Base de Datos Firestore
- **Nombre de la base de datos:** `datacerebro`
- **Ubicación:** `nam5` (us-central)
- **Reglas de seguridad:** `firestore.rules`
- **Índices:** `firestore.indexes.json`

### 🔐 Autenticación
- ✅ **Google Sign-In** (con soporte móvil/desktop)
- ✅ **Email/Password**
- ✅ **Usuarios anónimos** (invitados)
- ✅ **Persistencia de sesión** del navegador

### 📁 Estructura de la Base de Datos
```
users/{userId}/
├── canvasBoards/{boardId}/
│   └── canvasElements/{elementId}/
└── MicerebroElements/{elementId}/
```

### 🛡️ Reglas de Seguridad Firestore
- Solo usuarios autenticados pueden acceder a sus propios datos
- Soporte para usuarios anónimos
- Estructura jerárquica de permisos por usuario

## ⚡ Configuración de Vercel

### 🌐 Hosting
- **Site name:** `micerebroapp`
- **Framework:** Next.js
- **Build Command:** `npm run build`
- **Install Command:** `npm install --legacy-peer-deps`
- **Output Directory:** `.next`

### 🚀 Scripts de Deploy
```bash
# Desarrollo local
npm run dev              # Puerto 3001
npm run dev:clean        # Limpiar y ejecutar

# Build
npm run build           # Build normal
npm run build:clean     # Limpiar y build

# Deploy
npm run deploy:vercel          # Deploy a producción
npm run deploy:vercel:preview  # Deploy a preview
```

### 📦 Configuración de Build (vercel.json)
```json
{
  "version": 2,
  "name": "canvasmind-app",
  "buildCommand": "npm run build",
  "installCommand": "npm install --legacy-peer-deps",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "public": true,
  "functions": {
    "src/app/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization"
        }
      ]
    }
  ]
}
```

## 📚 Dependencias Principales

### Frontend
- **React:** 18.3.1
- **Next.js:** 15.2.6
- **TypeScript:** 5.x
- **Tailwind CSS:** 3.4.1
- **Framer Motion:** 12.23.24 (animaciones)

### UI Components
- **Radix UI:** Componentes primitivos accesibles
- **Lucide React:** Iconos
- **React Color:** Selector de colores
- **Tremor:** Componentes de datos

### Canvas/Drag & Drop
- **Konva:** 10.0.12 (canvas interactivo)
- **React Konva:** 19.2.1
- **@dnd-kit:** Sistema de drag & drop
- **React RND:** Componentes redimensionables

### Firebase
- **Firebase:** 11.10.0
- **Firestore:** Base de datos NoSQL
- **Firebase Auth:** Autenticación
- **Firebase Storage:** Almacenamiento de archivos

### Utilidades
- **html2canvas:** 1.4.1 (capturas de pantalla)
- **html-to-image:** 1.11.13
- **Fuse.js:** 7.1.0 (búsqueda difusa)
- **React Speech Recognition:** 4.0.1 (dictado)
- **@google/generative-ai:** 0.24.1 (IA)

## 🔧 Variables de Entorno

### Variables Requeridas
```env
# Firebase (ya configurado en código)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCbnZ8uKlOc8PBvTql2N2PkIDxc2BXWFCg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=micerebroapp.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=micerebroapp
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=micerebroapp.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=967156176052
NEXT_PUBLIC_FIREBASE_APP_ID=1:967156176052:web:2a7da145935daecdd6f3e1
```

## 🚀 Comandos de Deploy

### Deploy a Producción
```bash
# Opción 1: Usando npm scripts
npm run deploy:vercel

# Opción 2: Usando Vercel CLI directamente
vercel --prod --yes

# Opción 3: Si hay problemas de conexión
vercel link --yes
vercel --prod
```

### Deploy a Preview
```bash
npm run deploy:vercel:preview
```

## 📊 Estado del Proyecto

### ✅ Últimos Cambios (Commit: 3300cc0)
- **Fecha:** $(date)
- **Cambios:** Corrección de problemas de dimensionado en sticky notes y todo list
  - Sticky Notes: overflow-hidden para contener elementos
  - Todo List: Mejor ajuste de textarea multilínea

### 🔄 Integración Continua
- **GitHub:** https://github.com/pia-aplicaciones-web/micerebro-final.git
- **Vercel:** Deploy automático desde main branch
- **Firebase:** Configuración completa y funcional

## 📞 Contacto y Soporte

- **Proyecto:** Mi Cerebro App
- **Versión:** 0.1.1
- **Estado:** ✅ Producción
- **URL:** https://micerebroapp.vercel.app/

---

*Este archivo contiene toda la configuración necesaria para el proyecto Mi Cerebro App. Mantener actualizado con cualquier cambio importante.*
