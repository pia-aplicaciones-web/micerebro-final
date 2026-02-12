# Datos correctos verificados – Mi Cerebro App

Documento de referencia para contrastar con Vercel, Firebase y Git.  
*(Generado a partir del estado actual del repositorio.)*

---

## 1. Vercel (deploy)

| Dato | Valor correcto |
|------|----------------|
| **Proyecto en Vercel (nombre)** | `micerebroapp` |
| **Project ID (Vercel)** | `prj_U0gAuRXPW6QTtqkd9kKe4u2W9vEo` |
| **Team/Org ID (Vercel)** | `team_tJ4gtVdkT7Y9cZn16I8vXrZg` |
| **URL donde SÍ están los cambios** | https://micerebroapp-pias-projects-709add6a.vercel.app/ |
| **URL que debe mostrar lo mismo** | https://micerebroapp.vercel.app/ |
| **Dónde se guarda el enlace** | Carpeta `.vercel/project.json` (no subir a Git) |

**Qué comprobar en Vercel:**  
En el proyecto que tiene la URL `micerebroapp-pias-projects-709add6a.vercel.app`, en **Settings → Domains** debe estar **micerebroapp.vercel.app**. Si ese dominio está en otro proyecto, hay que quitarlo de ahí y añadirlo a este.

---

## 2. Git (repositorio)

| Dato | Valor correcto |
|------|----------------|
| **Remote `origin`** | https://github.com/pia-aplicaciones-web/micerebro-final.git |
| **Rama de producción** | `main` |
| **Último commit (referencia)** | `3c4fabd` — fix: añadir useCallback al import de React en tools-sidebar |

**Comprobar en local:**  
`git remote -v` y `git log --oneline -1`.

---

## 3. Firebase

| Dato | Valor correcto |
|------|----------------|
| **Nombre del proyecto** | MicerebroApp |
| **ID del proyecto** | `micerebroapp` |
| **Número del proyecto** | 967156176052 |
| **Auth Domain** | micerebroapp.firebaseapp.com |
| **Storage Bucket** | micerebroapp.firebasestorage.app |
| **Base de datos Firestore** | `datacerebro` |
| **Console** | https://console.firebase.google.com/project/micerebroapp/overview |

**En el código:** `src/lib/firebase.js` (firebaseConfig).  
**Documentación:** `FIREBASE_CONFIG_GUIDE.md`, `.firebaserc` (default: micerebroapp).

---

## 4. App (package.json)

| Dato | Valor correcto |
|------|----------------|
| **name** | micerebroapp |
| **version** | 0.1.1 |
| **engines.node** | 22.x |

---

## 5. Resumen rápido

- **Deploy con cambios:** https://micerebroapp-pias-projects-709add6a.vercel.app/
- **Dominio deseado:** https://micerebroapp.vercel.app/ → debe apuntar al **mismo** proyecto Vercel que la URL anterior.
- **Repo:** pia-aplicaciones-web/micerebro-final, rama `main`.
- **Firebase:** proyecto `micerebroapp`, base de datos `datacerebro`.

Cuando **micerebroapp.vercel.app** esté en **Domains** del proyecto Vercel que tiene `projectId: prj_U0gAuRXPW6QTtqkd9kKe4u2W9vEo`, ambas URLs servirán la misma versión.
