# 🔐 AUTORIZAR DOMINIO GOOGLE OAUTH EN FIREBASE

## ✅ CONFIGURACIÓN ACTUALIZADA:
- ✅ Proyecto Vercel: `micerebroapp`
- ✅ Proyecto Firebase: `micerebroapp`
- ✅ URL: `https://micerebroapp.vercel.app`

## ❌ ERROR ACTUAL:
```
Firebase: Error (auth/requests-from-referer-https://micerebroapp.vercel.app-are-blocked.).
```

## ✅ SOLUCIÓN FINAL - PASOS A SEGUIR:

### 1. Ir a Firebase Console
Ve a: https://console.firebase.google.com/

### 2. Seleccionar Proyecto
Elige el proyecto: **`micerebroapp`**

### 3. Ir a Authentication
En el menú lateral izquierdo, haz clic en **Authentication**

### 4. Ir a Settings
Haz clic en la pestaña **Settings** (⚙️)

### 5. Ir a Authorized Domains
Haz clic en la pestaña **Authorized domains**

### 6. Agregar Dominio
- Haz clic en **Add domain**
- Escribe exactamente: `micerebroapp.vercel.app`
- Haz clic en **Add**

### 7. Verificar Lista
Deberías ver estos dominios autorizados:
- `localhost`
- `micerebroapp.vercel.app` ← **Este es el que acabas de agregar**

## 🔍 VERIFICACIÓN:

Después de agregar el dominio:

1. Ve a: https://micerebroapp.vercel.app/
2. Haz clic en **"Iniciar con Google"**
3. ¡Debería funcionar sin errores!

## 🚨 IMPORTANTE:

- El dominio debe ser **exactamente** `micerebroapp.vercel.app`
- Sin espacios, sin www, sin https://
- Firebase puede tardar 1-2 minutos en aplicar los cambios
- Si no funciona inmediatamente, refresca la página y prueba de nuevo

---

## 🎯 ¿LISTO PARA PROBAR?

Una vez que autorices el dominio en Firebase Console, el login con Google funcionará perfectamente. ¿Vas a hacerlo ahora?
