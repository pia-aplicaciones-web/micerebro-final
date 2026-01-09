# 🚀 Guía de Configuración de Vercel - Mi Cerebro App

## 📋 Problemas Encontrados y Soluciones

### ❌ **Problema #1: Nombre de Proyecto Incorrecto**
**Error:** `Project names can be up to 100 characters long and must be lowercase. They can include letters, digits, and the following characters: '.', '_', '-'. However, they cannot contain the sequence '---'.`

**Causa:** En `vercel.json` estaba configurado `"name": "canvasmind-app"` pero el proyecto real en Vercel se llamaba `micerebroapp`.

**Solución:**
```json
// vercel.json - ANTES
{
  "name": "canvasmind-app",
  // ...
}

// vercel.json - DESPUÉS
{
  "name": "micerebroapp",
  // ...
}
```

### ❌ **Problema #2: Scope/Equipo Incorrecto**
**Error:** `No projects found under [usuario-personal]`

**Causa:** Vercel CLI estaba autenticado en el scope personal, pero el proyecto `micerebroapp` está bajo el equipo `pias-projects-709add6a`.

**Solución:**
```bash
# Verificar usuario actual
vercel whoami
# Output: mpiafinlay-3119

# Ver equipos disponibles
vercel teams list
# Output: pias-projects-709add6a     Pia's projects

# Cambiar al equipo correcto
vercel switch pias-projects-709add6a

# Verificar proyectos disponibles
vercel projects list
# Ahora aparece: micerebroapp
```

### ❌ **Problema #3: Deploy se colgaba/timeout**
**Causa:** Configuración local de Vercel corrupta o conflictos.

**Solución:**
```bash
# Limpiar configuración local
rm -rf .vercel

# Reconectar proyecto
vercel link --yes
```

## ✅ **Flujo de Deploy Correcto**

### 1. **Preparación del Proyecto**
```bash
# Verificar que estamos en el directorio correcto
pwd
# Output: /Users/[usuario]/Desktop/canvasmind_backup (1)/Copia de MicerebroAPP19Dic

# Verificar configuración de Vercel
cat vercel.json
# Debe tener: "name": "micerebroapp"
```

### 2. **Verificar Autenticación y Scope**
```bash
# Verificar usuario
vercel whoami
# Output: mpiafinlay-3119

# Verificar equipo activo
vercel teams list
# Debe mostrar: pias-projects-709add6a (Pia's projects) como activo

# Si no está activo, cambiar:
vercel switch pias-projects-709add6a
```

### 3. **Build Local (Opcional pero Recomendado)**
```bash
# Verificar que el build funciona localmente
npm run build

# Si hay errores de ESLint, ignorar (no afectan el deploy)
```

### 4. **Deploy a Producción**
```bash
# Comando correcto para deploy
vercel --prod --yes

# Output esperado:
# Deploying pias-projects-709add6a/micerebroapp
# https://micerebroapp-[hash]-pias-projects-709add6a.vercel.app
# Production: https://micerebroapp-[hash]-pias-projects-709add6a.vercel.app [2s]
# ✓ Ready
```

### 5. **Configurar Dominio Custom**
```bash
# Asignar dominio custom al deployment
vercel alias https://micerebroapp-[hash]-pias-projects-709add6a.vercel.app micerebroapp.vercel.app

# Verificar configuración
vercel alias ls
# Debe mostrar: micerebroapp.vercel.app apuntando al deployment correcto
```

### 6. **Verificación Final**
```bash
# Verificar que el dominio responde
curl -s -o /dev/null -w "%{http_code}" https://micerebroapp.vercel.app/
# Output esperado: 200
```

## 🔧 **Configuración Actual de vercel.json**

```json
{
  "version": 2,
  "name": "micerebroapp",
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

## 📊 **Información del Proyecto**

- **Nombre del proyecto:** `micerebroapp`
- **Equipo/Scope:** `pias-projects-709add6a` (Pia's projects)
- **Usuario:** `mpiafinlay-3119`
- **Framework:** Next.js 15.2.6
- **Dominio custom:** `https://micerebroapp.vercel.app/`

## 🚨 **Comandos de Emergencia**

### Si el deploy falla:
```bash
# Limpiar todo y empezar de cero
rm -rf .vercel .next
npm run clean:all
npm install

# Reconectar
vercel logout
vercel login
vercel switch pias-projects-709add6a
```

### Si hay conflictos de nombre:
```bash
# Ver todos los proyectos
vercel projects list

# Ver deployments
vercel ls micerebroapp

# Forzar redeploy
vercel redeploy [deployment-url]
```

## 📝 **Lecciones Aprendidas**

1. **Siempre verificar el scope/equipo** antes de hacer deploy
2. **El nombre en vercel.json debe coincidir EXACTAMENTE** con el nombre del proyecto en Vercel
3. **Limpiar .vercel** si hay problemas de configuración local
4. **Usar --yes** para evitar prompts interactivos
5. **Verificar dominio custom** después de cada deploy
6. **Build local primero** para detectar errores antes del deploy

## 🔗 **URLs Importantes**

- **Dashboard Vercel:** https://vercel.com/pias-projects-709add6a/micerebroapp
- **Aplicación:** https://micerebroapp.vercel.app/
- **Repositorio:** https://github.com/pia-aplicaciones-web/micerebro-final.git

---

## 🎯 **Checklist de Deploy**

- [ ] `vercel whoami` → `mpiafinlay-3119`
- [ ] `vercel teams list` → `pias-projects-709add6a` activo
- [ ] `vercel projects list` → `micerebroapp` visible
- [ ] `npm run build` → Sin errores críticos
- [ ] `vercel --prod --yes` → Deploy exitoso
- [ ] `vercel alias [url] micerebroapp.vercel.app` → Alias configurado
- [ ] `curl https://micerebroapp.vercel.app/` → HTTP 200

**Fecha de última actualización:** $(date)
**Último deploy exitoso:** `micerebroapp-5etb71ga2-pias-projects-709add6a.vercel.app`
**Estado:** ✅ Configuración correcta y funcionando
