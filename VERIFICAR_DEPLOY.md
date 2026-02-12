# Cómo verificar que los cambios están en producción

## ⚠️ Los cambios están en una URL pero NO en micerebroapp.vercel.app

Si ves la app actualizada (Minimizar, Copiar/Pegar, etc.) en:

**https://micerebroapp-pias-projects-709add6a.vercel.app/**

pero **NO** en **https://micerebroapp.vercel.app/** → el dominio corto está apuntando a **otro proyecto** o a un deploy antiguo.

**Qué hacer en Vercel (obligatorio):**

1. Entra en **[vercel.com](https://vercel.com)** e inicia sesión.
2. Abre el proyecto donde **sí** ves los cambios (el que tiene la URL `micerebroapp-pias-projects-709add6a.vercel.app`).  
   - Suele estar en: **Dashboard** → **pias-projects-709add6a** (o tu equipo) → **micerebroapp**.
3. Ve a **Settings** (arriba) → **Domains** (menú izquierdo).
4. En **Domains**:
   - Si **micerebroapp.vercel.app** **no está** en la lista → **Add** → escribe `micerebroapp.vercel.app` → **Add**.  
   - Si **micerebroapp.vercel.app** **sí está** pero en **otro proyecto** → en ese otro proyecto quita el dominio y luego en **este** proyecto añádelo (Add).
5. Guarda y espera 1–2 minutos. Abre **https://micerebroapp.vercel.app/** en **ventana de incógnito** para comprobar.

**Mientras tanto:** puedes usar como enlace principal **https://micerebroapp-pias-projects-709add6a.vercel.app/** — es la misma app con todos los cambios.

---

## 1. Indicador en la app

En la esquina **inferior derecha** de la app (cuando está desplegada en Vercel) aparece un texto pequeño tipo:

**`Build: c985526`**

- Es el **commit** con el que se construyó esta versión.
- Compara con tu último commit en local:
  ```bash
  git log --oneline -1
  ```
- Si no ves ese texto, o el hash no coincide, el deploy no es el último.

## 2. Revisar en el panel de Vercel

1. Entra en [vercel.com](https://vercel.com) → tu proyecto **micerebroapp** (o el nombre que tenga).
2. Pestaña **Deployments**:
   - El primer deployment de la lista debería ser el último push a `main`.
   - Comprueba que el **commit** (ej. `c985526`) y el **branch** (`main`) son los correctos.
3. Si el deployment más reciente está en **Building** o **Error**, los cambios no estarán en producción hasta que termine o lo corrijas.
4. **Production** (dominio principal) debe estar asignado al deployment que quieres. En **Settings → Domains** puedes ver qué dominio es “Production”.

## 3. Si el deploy es viejo o no se actualiza

- **Redeploy manual**: En **Deployments** → los tres puntos del último deployment → **Redeploy** (sin marcar “Use existing Build Cache” si quieres un build limpio).
- **Comprobar conexión con Git**: **Settings → Git** → confirmar que el repo es `pia-aplicaciones-web/micerebro-final` y la rama de producción es `main`.
- **Push desde la carpeta correcta**: Asegúrate de hacer `git push` desde el mismo repositorio que tiene conectado Vercel (tu carpeta **MicerebroAPP_CLEAN** con `origin` apuntando a ese repo).

## 4. Caché del navegador

Si el commit en Vercel es el correcto pero sigues viendo la app antigua:

- Prueba en **ventana de incógnito** o **otro navegador**.
- O **vaciar caché y recargar** (Ctrl+Shift+R o Cmd+Shift+R).

## 5. Si micerebroapp.vercel.app NO muestra cambios (sigue versión antigua)

El dominio **https://micerebroapp.vercel.app/** debe estar asignado al **mismo proyecto** y al **último deployment**. Si ves la app antigua (sin botón Minimizar, sin Copiar/Pegar, etc.):

1. **Vercel Dashboard** → entra al proyecto (micerebroapp).
2. **Deployments**: el **primer deploy** de la lista debe ser el último (commit reciente, ej. `3c4fabd`). Si el más reciente está en **Ready**:
   - Haz clic en los **tres puntos (⋮)** de ese deployment.
   - Elige **"Promote to Production"** (o "Assign to Production").
3. **Settings → Domains**:
   - Comprueba que **micerebroapp.vercel.app** está en la lista.
   - Si no está, **Add** y escribe `micerebroapp.vercel.app` (Vercel te pedirá verificar el dominio).
   - Asegúrate de que el dominio no está asignado a **otro proyecto** de Vercel (si tienes varios).
4. **Settings → Git**:
   - **Production Branch** debe ser `main`.
   - Repo: `pia-aplicaciones-web/micerebro-final` (o el que uses).
5. Después de **Promote to Production**, espera 1–2 minutos y abre **https://micerebroapp.vercel.app/** en **ventana de incógnito** (o con caché vacía). Deberías ver el texto **"Build: xxxxxxx"** en la esquina inferior derecha; si el hash coincide con tu último commit, la versión es la correcta.

## 6. Resumen rápido

| Qué comprobar              | Dónde                          |
|---------------------------|---------------------------------|
| Commit en producción      | Esquina inferior derecha: `Build: xxxxxxx` |
| Último commit en tu repo  | `git log --oneline -1`          |
| Deployments y estado      | Vercel → Deployments            |
| Repo y rama en Vercel      | Vercel → Settings → Git         |
| Dominio producción        | Vercel → Settings → Domains     |
| Promover último deploy    | Deployments → ⋮ → Promote to Production |
