# 🔐 AUTORIZAR DOMINIO GOOGLE OAUTH EN FIREBASE

## ❌ ERROR ACTUAL:
```
Firebase: Error (auth/requests-from-referer-https://micerebroapp.vercel.app-are-blocked.).
```

El dominio `micerebroapp.vercel.app` no está autorizado para operaciones OAuth de Google.

## ✅ SOLUCIÓN - PASOS A SEGUIR:

### 1. Ir a Firebase Console
Ve a: https://console.firebase.google.com/

### 2. Seleccionar Proyecto
Elige el proyecto: **micerebroapp**

### 3. Ir a Authentication
En el menú lateral izquierdo, haz clic en **Authentication**

### 4. Ir a Settings
Haz clic en la pestaña **Settings** (engranaje)

### 5. Ir a Authorized Domains
Haz clic en la pestaña **Authorized domains**

### 6. Agregar Dominio
- Haz clic en **Add domain**
- Escribe: `micerebroapp.vercel.app`
- Haz clic en **Add**

### 7. Verificar
Deberías ver `micerebroapp.vercel.app` en la lista de dominios autorizados.

## 🔍 VERIFICACIÓN:

Después de agregar el dominio:

1. Ve a: https://micerebroapp.vercel.app/
2. Haz clic en "Iniciar con Google"
3. Debería funcionar sin errores

## 📋 DOMINIOS QUE DEBEN ESTAR AUTORIZADOS:

- `localhost` (para desarrollo local)
- `micerebroapp.vercel.app` (para producción)
- Cualquier otro dominio donde uses la app

## 🚨 IMPORTANTE:

- El dominio debe ser **exactamente** `micerebroapp.vercel.app`
- Asegúrate de que no haya espacios ni caracteres extra
- Firebase puede tardar unos minutos en aplicar los cambios

---

## 🔥 DESPUÉS DE AUTORIZAR EL DOMINIO:

Una vez que hayas agregado el dominio, el login con Google debería funcionar correctamente.

¿Necesitas ayuda con algún paso específico?
