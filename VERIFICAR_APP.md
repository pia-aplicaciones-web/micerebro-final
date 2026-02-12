# Verificar que los cambios se ven en la app

Si **no ves** en https://micerebroapp.vercel.app los cambios (Copiar/Pegar, Minimizar en headers, fix header congelado), sigue estos pasos.

---

## 1. Dónde ver cada cambio en la interfaz

### Copiar / Pegar cuadernos
- Entra a un **tablero** (board).
- Arriba verás la **barra flotante** del menú (Tableros, Dictar, **Cuadernos**, Notas, To-do…).
- Haz clic en **Cuadernos**.
- En el desplegable:
  - **Primera opción:** **Pegar** (icono de portapapeles).
  - Más abajo, **Elementos Abiertos** → cada línea tiene dos iconos pequeños: **Copiar** (doble cuadrado) y **Minimizar** (menos).

Si no ves esa barra, arrástrala desde el asa izquierda (icono de rayas) para que no quede fuera de pantalla.

### Minimizar en el header de cada cuaderno
- Abre un cuaderno (Cuaderno, Block, Apuntes, Libreta, Mini o iPhone).
- En la **barra superior del cuaderno** (donde está el título y los botones), busca el icono **menos** (−): es **Minimizar**. Al lado suele estar Maximizar (□) o “Restaurar tamaño”.

### Fix header congelado
- No es un botón: es un **comportamiento**.
- Si un elemento quedaba “congelado” (no se podía hacer clic en el header), el código ahora intenta desbloquearlo al perder foco o al cambiar de pestaña. Si sigue pasando, el bug sigue abierto.

---

## 2. Comprobar que el dominio muestra el deploy nuevo

### Opción A – Probar la URL del último deploy
Abre esta URL (del último deploy de producción):

**https://micerebroapp-pias-projects-709add6a.vercel.app**

- Si **aquí sí** ves Pegar en Cuadernos y Minimizar en los cuadernos → el código nuevo está desplegado; el problema es que **micerebroapp.vercel.app** no está usando ese deploy.
- Si **aquí tampoco** ves los cambios → el deploy no incluye el código nuevo (revisar repo y Vercel).

### Opción B – Revisar en Vercel Dashboard
1. Entra a [vercel.com](https://vercel.com) → tu equipo → proyecto **micerebroapp**.
2. Pestaña **Deployments**: mira el **último deployment de Production**. El commit debería ser algo como:  
   `feat: botón Minimizar en header...` o `feat: botón Copiar/Pegar...`.
3. Pestaña **Settings** → **Domains**: comprueba que **micerebroapp.vercel.app** esté y que esté asignado a **Production** (no a una URL fija antigua).
4. Si el dominio está en otro proyecto, hay que añadir **micerebroapp.vercel.app** a este proyecto (micerebroapp) y asignarlo a Production.

### Opción C – Forzar recarga
- **Ctrl+Shift+R** (Windows/Linux) o **Cmd+Shift+R** (Mac).
- O probar en **ventana de incógnito** o otro navegador.

---

## 3. Si micerebroapp.vercel.app sigue mostrando la versión vieja

Entonces ese dominio **no** está sirviendo el mismo deploy que:

**https://micerebroapp-pias-projects-709add6a.vercel.app**

En Vercel:

1. **Settings** → **Domains**.
2. Si **micerebroapp.vercel.app** está asignado a un deployment concreto (URL antigua), cámbialo a **Production**.
3. O elimina el dominio y vuelve a añadirlo eligiendo **Production**.

Así, la próxima vez que hagas `vercel --prod` (o un push a la rama conectada), ese deploy será Production y **micerebroapp.vercel.app** mostrará la versión nueva con Copiar/Pegar, Minimizar en headers y fix de header congelado.
