# 🔄 Migración a Nueva Cuenta Google Cloud / Firebase

**Cuenta destino para Cloud/Billing:** piafinlay77@gmail.com  

---

## 🎯 Dos opciones

| Escenario | Qué hacer |
|----------|-----------|
| **A) Mantener Firebase, cambiar solo Cloud/Billing** | Tu proyecto Firebase sigue igual. Solo cambias qué cuenta paga/gestiona Google Cloud. **→ Ir a opción A** |
| **B) Crear todo desde cero** | Nueva cuenta = nuevo proyecto Firebase. Pierdes datos. **→ Ir a opción B** |

---

# Opción A: Mantener Firebase, usar piafinlay77@gmail.com para Cloud

## ⚠️ Si tu proyecto está SUSPENDIDO por problemas de facturación

El mensaje *"Se suspendió tu proyecto por problema con la cuenta de facturación"* indica que la cuenta `01886C-CB6EAD-E1E460` tiene problemas. **Solución:** vincular una cuenta de facturación nueva/activa.

### Pasos para desbloquear el proyecto

1. **Crear cuenta de facturación nueva** (con piafinlay77@gmail.com):
   - [console.cloud.google.com/billing](https://console.cloud.google.com/billing)
   - Inicia sesión con **piafinlay77@gmail.com**
   - **Crear cuenta** → Añade método de pago (tarjeta válida)
   - Anota el ID o nombre de la nueva cuenta

2. **Vincular la nueva cuenta al proyecto micerebroapp:**
   - Desde [Firebase Console](https://console.firebase.google.com/project/micerebroapp/usage) → **Uso y facturación** → **Detalles**
   - O [Google Cloud Billing](https://console.cloud.google.com/billing?project=micerebroapp)
   - Menú **Facturación** → **Mis cuentas** → Seleccionar proyecto **micerebroapp**
   - **Cambiar cuenta de facturación** → Elige la cuenta de piafinlay77@gmail.com
   - Confirmar

3. **Comprobar el plan Blaze (Firebase):**
   - [Firebase Console](https://console.firebase.google.com) → Proyecto micerebroapp
   - **Configuración** ⚙️ → **Uso y facturación** → Asegurar que el plan Blaze está activo con la nueva cuenta

**Nota:** Si no tienes acceso (la cuenta antigua está cerrada), tendrás que usar la **Opción B** (crear proyecto nuevo). Google no permite que terceros cambien la facturación sin permisos de propietario.

**Contactar soporte Google:** Si eres propietario pero no ves la opción, [soporte de facturación de Google Cloud](https://cloud.google.com/billing/docs/how-to/get-support).

### Alternativa: Usar gcloud desde terminal (si la consola web falla)

Si la consola de Google Cloud no te deja cambiar la facturación, puedes usar la terminal. **Ya tienes gcloud instalado** en tu Mac.

#### Paso 1: Autenticarte
```bash
gcloud auth login
```
Se abrirá el navegador. Inicia sesión con **piafinlay77@gmail.com**.

#### Paso 2: Crear cuenta de facturación nueva (solo desde web)
La cuenta de facturación **sí debe crearse** desde [console.cloud.google.com/billing](https://console.cloud.google.com/billing) con piafinlay77@gmail.com. Añade método de pago (tarjeta). No se puede hacer por terminal.

#### Paso 3: Ver el ID de tu cuenta de facturación
```bash
gcloud billing accounts list
```
Copia el **ACCOUNT_ID** (ej: `01XXXX-XXXXXX-XXXXXX`) de la cuenta activa de piafinlay77@gmail.com.

#### Paso 4: Vincular el proyecto a esa cuenta
```bash
gcloud billing projects link micerebroapp --billing-account=TU_ACCOUNT_ID
```
Sustituye `TU_ACCOUNT_ID` por el ID del paso 3.

#### Paso 5: Comprobar
```bash
gcloud billing projects describe micerebroapp
```

---

Si tu proyecto Firebase (micerebroapp) sigue activo y solo necesitas que **piafinlay77@gmail.com** gestione la facturación:

### 1. Añadir piafinlay77@gmail.com al proyecto

1. Entra en [Google Cloud Console](https://console.cloud.google.com) con la cuenta que tiene el proyecto
2. Selecciona el proyecto **micerebroapp**
3. **IAM y administración** → **Administrar recursos** (o IAM)
4. **Conceder acceso** → Añadir:
   - **Correo:** piafinlay77@gmail.com
   - **Rol:** **Propietario** (o **Administrador de facturación** si solo quieres que gestione cobros)
5. Guardar

### 2. Vincular la cuenta de facturación

1. Inicia sesión en [Cloud Console](https://console.cloud.google.com) con **piafinlay77@gmail.com**
2. Menú → **Facturación**
3. Si no existe, crea una **cuenta de facturación** (tarjeta para el plan Blaze)
4. Vuelve al proyecto **micerebroapp**
5. **Facturación** → **Vinculación de cuentas de facturación**
6. Asocia la cuenta de facturación de piafinlay77@gmail.com al proyecto

### 3. (Opcional) Quitar la cuenta antigua

Si ya no quieres que la cuenta anterior tenga acceso:

1. **IAM** → Busca la cuenta antigua
2. Quitar rol / Eliminar del proyecto

**Resultado:** El proyecto Firebase sigue siendo el mismo. No cambias config en el código ni en `.env.local`. Solo cambia quién administra y paga Google Cloud.

---

## ➕ Añadir otra cuenta al proyecto (micerebroapp)

Si ya estás con **piafinlay77@gmail.com** como propietario y quieres que **otra cuenta** (otro correo) también tenga acceso:

1. Abre [Firebase Console - micerebroapp](https://console.firebase.google.com/project/micerebroapp/settings/iam)
2. O: **Configuración del proyecto** ⚙️ → **Usuarios y permisos**
3. **Añadir usuario** → Escribe el correo de la otra cuenta
4. Elige el rol:
   - **Propietario** = control total
   - **Editor** = puede editar recursos
   - **Visor** = solo ver
5. **Guardar**

**Alternativa (Google Cloud IAM):**  
[https://console.cloud.google.com/iam-admin/iam?project=micerebroapp](https://console.cloud.google.com/iam-admin/iam?project=micerebroapp)  
→ **Conceder acceso** → Correo + Rol → Guardar

> No puedo hacerlo por ti: requiere iniciar sesión en la consola con tu cuenta piafinlay77@gmail.com (ya vinculada al proyecto).

---

# Opción B: Crear proyecto Firebase nuevo (desde cero)

Si la cuenta anterior está cerrada o quieres empezar de cero:

## 📋 Pasos de Migración

### 1. Crear Proyecto Firebase en la Nueva Cuenta

1. Inicia sesión en [Firebase Console](https://console.firebase.google.com) con **piafinlay77@gmail.com**
2. **Crear proyecto** o **Añadir proyecto**
3. Nombre sugerido: `micerebroapp` (o el que prefieras)
4. **Desactivar** Google Analytics si no lo necesitas (ahorra recursos)
5. Crear el proyecto

---

### 2. Habilitar Servicios Firebase

#### Authentication
1. En el menú izquierdo: **Build** → **Authentication**
2. **Comenzar** → Habilitar los proveedores:
   - ✅ **Correo electrónico/Contraseña**
   - ✅ **Google** (añadir dominio si hace falta)
   - ✅ **Anónimo** (para usuarios invitados)

#### Firestore Database
1. **Build** → **Firestore Database**
2. **Crear base de datos**
3. Modo: **Producción** (o Pruebas temporalmente)
4. Ubicación: `nam5` (us-central) o la más cercana
5. Crear base de datos **`datacerebro`** (nombre secundario):
   - En Firestore → pestaña **Base de datos**
   - Crear base de datos secundaria → nombre: **datacerebro**
   - Misma ubicación que la principal

#### Storage
1. **Build** → **Storage**
2. **Comenzar** → Modo de producción
3. Reglas: se configurarán desde `storage.rules`

---

### 3. Obtener la Configuración de Firebase

1. **Configuración del proyecto** (icono ⚙️) → **Configuración general**
2. En **Tus apps** → Añadir app Web (icono `</>`)
3. Nombre: `Mi Cerebro App`
4. **No activar** Firebase Hosting (usas Vercel)
5. **Registrar app** → Copia el objeto `firebaseConfig`:

```javascript
{
  apiKey: "AIza...",
  authDomain: "TU-PROJECT.firebaseapp.com",
  projectId: "TU-PROJECT-ID",
  storageBucket: "TU-PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
}
```

---

### 4. Crear Archivo `.env.local`

En la raíz del proyecto, crea `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=TU_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=TU_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=TU_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=TU_PROJECT.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

Reemplaza con los valores reales del paso 3. **No subas `.env.local` a Git.**

---

### 5. Desplegar Reglas de Firestore y Storage

#### Vincular proyecto Firebase
```bash
# Instalar Firebase CLI si no lo tienes: npm install -g firebase-tools
firebase login
firebase use TU_PROJECT_ID   # O crear .firebaserc con {"projects":{"default":"TU_PROJECT_ID"}}
```

#### Firestore Rules
El archivo `firestore.rules` ya está en el proyecto:

```bash
firebase deploy --only firestore
```

**Importante:** Si es un proyecto nuevo, Firebase crea una base de datos "(default)". La app usa `datacerebro`. Crea la base de datos secundaria en Firestore Console → Base de datos → Crear base de datos → nombre: `datacerebro`.

#### Storage Rules
```bash
firebase deploy --only storage
```

#### Configurar firebase.json
Edita `firebase.json` y cambia el `projectId` si usas `.firebaserc`:

```json
{
  "firestore": {
    "database": "datacerebro",
    ...
  }
}
```

O crea `.firebaserc`:
```json
{
  "projects": {
    "default": "TU_PROJECT_ID"
  }
}
```

---

### 6. Configurar Vercel (Producción)

1. [Vercel Dashboard](https://vercel.com) → Tu proyecto
2. **Settings** → **Environment Variables**
3. Añade cada variable con `NEXT_PUBLIC_FIREBASE_*`
4. Selecciona **Production**, **Preview** y **Development**
5. **Save** → Redesplegar el proyecto

---

### 7. Autorizar Dominios en Authentication

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Añade:
   - `localhost` (desarrollo)
   - `micerebroapp.vercel.app`
   - Cualquier dominio de preview de Vercel si lo usas

---

### 8. Importar Datos (Opcional)

Si tenías datos en la cuenta anterior y puedes exportarlos:

1. Firestore: **Exportar** desde la consola antigua (si aún tienes acceso)
2. **Importar** en el nuevo proyecto con `gcloud firestore import`

Si no tienes acceso a los datos antiguos, los usuarios tendrán que crear tableros nuevos.

---

## ⚠️ Notas Importantes

- **Base de datos Firestore:** El código usa la base de datos `datacerebro`. Debe existir en el nuevo proyecto.
- **Reglas:** Las de `firestore.rules` y `storage.rules` se aplican al crear el proyecto. Verificar que coincidan.
- **Google AI (Gemini):** Si usas IA, crea una API Key en [Google AI Studio](https://aistudio.google.com/app/apikey) con la nueva cuenta.
- **Billing:** Plan Blaze recomendado para evitar cuota excedida (ver `OPTIMIZACIONES_FIRESTORE.md`).

---

## ✅ Checklist de Verificación

- [ ] Proyecto Firebase creado con piafinlay77@gmail.com
- [ ] Auth: Email/Password, Google, Anónimo habilitados
- [ ] Firestore: base de datos `datacerebro` creada
- [ ] Storage habilitado
- [ ] `.env.local` con todas las variables
- [ ] `firebase deploy --only firestore`
- [ ] `firebase deploy --only storage`
- [ ] Variables en Vercel
- [ ] Dominios autorizados en Auth
- [ ] `npm run dev` funciona localmente
- [ ] Deploy en Vercel exitoso

---

## 🆘 Soporte

Si algo falla:
1. Revisa la consola del navegador (F12)
2. En Firebase Console → **Usage and billing** para ver cuotas
3. Verifica que las variables de entorno estén en Vercel (sin espacios extra)
