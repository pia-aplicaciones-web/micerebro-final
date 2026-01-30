# Comandos de terminal: Git, npm y Vercel

Referencia rápida de comandos para desarrollo local y despliegue en Vercel.

---

## Git

### Estado y consulta
```bash
git status              # Ver archivos modificados, staged, sin seguimiento
git log                 # Historial de commits
git log --oneline       # Historial resumido (una línea por commit)
git log -5              # Últimos 5 commits
git diff                # Cambios no staged (working vs index)
git diff --staged       # Cambios staged (index vs último commit)
git show <commit>       # Ver un commit concreto
```

### Añadir y commit
```bash
git add .                # Añadir todos los cambios
git add archivo.tsx      # Añadir un archivo
git add src/             # Añadir una carpeta
git commit -m "mensaje"   # Commit con mensaje
git commit -am "mensaje" # Add de archivos ya trackeados + commit
```

### Ramas
```bash
git branch              # Listar ramas locales
git branch -a           # Listar todas (locales + remotas)
git branch nombre       # Crear rama (sin cambiar)
git checkout nombre     # Cambiar a rama
git checkout -b nombre  # Crear rama y cambiar a ella
git switch nombre       # Cambiar de rama (alternativa a checkout)
git switch -c nombre    # Crear rama y cambiar
git merge otra-rama     # Fusionar otra-rama en la rama actual
git branch -d nombre   # Borrar rama local (si ya fusionada)
git branch -D nombre   # Borrar rama local forzado
```

### Sincronizar con remoto
```bash
git pull                # Traer y fusionar (rama actual)
git pull origin main    # Traer main del remoto
git push                # Subir rama actual
git push origin main    # Subir rama main
git push -u origin main # Subir y establecer upstream (primera vez)
git fetch               # Traer cambios del remoto sin fusionar
git fetch --all         # Traer de todos los remotos
```

### Remotos
```bash
git remote -v           # Listar remotos (url)
git remote add nombre url   # Añadir remoto
git remote remove nombre    # Quitar remoto
git remote set-url origin url  # Cambiar URL de origin
```

### Deshacer y limpiar
```bash
git restore archivo     # Descartar cambios en working (no staged)
git restore --staged archivo   # Quitar del stage (unstage)
git reset --soft HEAD~1 # Deshacer último commit, mantener cambios staged
git reset --mixed HEAD~1 # Deshacer último commit, cambios en working
git reset --hard HEAD~1  # Deshacer último commit y descartar cambios (cuidado)
git stash               # Guardar cambios temporalmente
git stash list          # Ver stashes
git stash pop           # Aplicar y borrar último stash
git stash apply         # Aplicar último stash (sin borrarlo)
git stash drop          # Borrar último stash
git clean -fd           # Borrar archivos no trackeados (carpetas -d)
```

### Clonar e inicializar
```bash
git clone url            # Clonar repositorio
git clone url carpeta   # Clonar en carpeta concreta
git init                # Inicializar repo en carpeta actual
```

### Etiquetas
```bash
git tag                 # Listar etiquetas
git tag v1.0.0          # Crear etiqueta
git push origin v1.0.0  # Subir etiqueta al remoto
git push origin --tags  # Subir todas las etiquetas
```

---

## npm

### Instalación
```bash
npm install
npm install --legacy-peer-deps   # Si hay conflictos de peer dependencies (Vercel usa esto)
```

### Desarrollo
```bash
npm run dev           # Servidor dev en http://localhost:3003
npm run dev:clean     # Borra .next y arranca dev en puerto 3001
```

### Build
```bash
npm run build         # Build de producción
npm run build:clean   # Borra .next y hace build
```

### Producción local
```bash
npm run start         # Sirve el build (ejecutar después de npm run build)
```

### Linting y tipos
```bash
npm run lint          # Revisar código
npm run lint:fix      # Corregir automáticamente
npm run typecheck     # Verificar tipos TypeScript (tsc --noEmit)
```

### Limpieza
```bash
npm run clean         # Borrar carpeta .next
npm run clean:all     # Borrar .next y node_modules
```

### Scripts de deploy (npm)
```bash
npm run deploy:vercel           # Deploy a producción (vercel --prod)
npm run deploy:vercel:preview   # Deploy de preview (vercel)
```

---

## Vercel CLI

### Instalación y login
```bash
npm i -g vercel      # Instalar Vercel CLI globalmente
vercel login        # Iniciar sesión en Vercel
vercel whoami       # Ver usuario actual
```

### Deploy
```bash
vercel                    # Deploy de preview (rama actual)
vercel --prod             # Deploy a producción
npx vercel --prod         # Sin instalar globalmente
```

### Proyecto
```bash
vercel link               # Vincular carpeta actual a un proyecto Vercel
vercel project ls         # Listar proyectos
vercel env ls             # Listar variables de entorno
vercel env add NOMBRE     # Añadir variable de entorno
```

### Inspección y logs
```bash
vercel inspect <url-deploy>        # Ver detalles de un deploy
vercel inspect <url> --logs        # Ver logs del build
vercel logs <url-o-dominio>        # Logs en tiempo real
```

### Dominios y alias
```bash
vercel domains ls                  # Listar dominios
vercel alias set <deploy-url> <dominio>   # Asignar alias (ej. micerebroapp.vercel.app)
```

### Otros
```bash
vercel ls                 # Listar últimos deploys
vercel rollback           # Volver al deploy anterior
vercel remove <nombre>    # Eliminar un proyecto
```

---

## Flujo típico

### Subir cambios y desplegar a producción
```bash
git add .
git commit -m "mensaje"
git push origin main
npx vercel --prod
```

### Probar build antes de desplegar
```bash
npm run build
# Si pasa, desplegar:
npx vercel --prod
```

### Preview antes de producción
```bash
vercel              # Crea una URL de preview
# Revisar la URL; si está bien:
vercel --prod
```
