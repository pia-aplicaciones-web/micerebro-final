// Script para crear datos iniciales usando Firebase Admin SDK
// Requiere credenciales de Firebase Admin (service account)

const admin = require('firebase-admin');

// Configuración sin credenciales específicas (usará las del entorno)
const serviceAccount = {
  type: "service_account",
  project_id: "micerebroapp",
  // Las credenciales deben estar configuradas en variables de entorno o archivo
};

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'micerebroapp'
  });
}

const db = admin.firestore();

async function createCollection() {
  try {
    console.log('🚀 Creando colección users...');

    // Crear documento de usuario
    await db.collection('users').doc('0HNCbSTfdlQN2q7vI9Fbq1flgnm1').set({
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
      displayName: 'Invitado',
      email: null,
      emailVerified: false,
      photoURL: null,
      providerId: 'anonymous',
      uid: '0HNCbSTfdlQN2q7vI9Fbq1flgnm1',
      lastLoginAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z'))
    });

    console.log('✅ Usuario creado');

    // Crear tablero
    await db.collection('users').doc('0HNCbSTfdlQN2q7vI9Fbq1flgnm1')
      .collection('canvasBoards').doc('1MjfoyyRNobXbFvKtVXP').set({
        id: '1MjfoyyRNobXbFvKtVXP',
        name: 'Mi Primer Tablero',
        description: 'Tablero de ejemplo para usuario invitado',
        ownerId: '0HNCbSTfdlQN2q7vI9Fbq1flgnm1',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
        isPublic: false,
        password: null
      });

    console.log('✅ Tablero creado');

    // Crear elemento
    await db.collection('users').doc('0HNCbSTfdlQN2q7vI9Fbq1flgnm1')
      .collection('canvasBoards').doc('1MjfoyyRNobXbFvKtVXP')
      .collection('canvasElements').doc('welcome-element').set({
        id: 'welcome-element',
        type: 'text',
        content: '¡Bienvenido a Mi Cerebro!\n\nTu lienzo de ideas infinitas.\n\nEmpieza creando elementos y organizando tus pensamientos.',
        x: 100,
        y: 100,
        width: 400,
        height: 150,
        rotation: 0,
        zIndex: 1,
        color: '#1f2937',
        backgroundColor: '#ffffff',
        hidden: false,
        userId: '0HNCbSTfdlQN2q7vI9Fbq1flgnm1',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z'))
      });

    console.log('✅ Elemento creado');
    console.log('🎉 ¡Colección completa creada exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('💡 Si hay error de credenciales, configura las variables de entorno:');
    console.log('   FIREBASE_PRIVATE_KEY_ID');
    console.log('   FIREBASE_PRIVATE_KEY');
    console.log('   FIREBASE_CLIENT_EMAIL');
    console.log('   FIREBASE_CLIENT_ID');
  }
}

createCollection();
