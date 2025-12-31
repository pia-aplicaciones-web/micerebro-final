#!/usr/bin/env node

/**
 * Script para inicializar datos en Firestore
 * Ejecutar con: node scripts/seed-firestore.js
 */

const admin = require('firebase-admin');

// Configuración de Firebase Admin
const serviceAccount = {
  type: "service_account",
  project_id: "datacerebro",
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://datacerebro.firebaseio.com'
  });
}

const db = admin.firestore();

async function seedFirestore() {
  console.log('🌱 Iniciando seed de Firestore...');

  try {
    // Datos del usuario invitado
    const userData = {
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
      displayName: "Invitado",
      email: null,
      uid: "0HNCbSTfdlQN2q7vI9Fbq1flgnm1"
    };

    // Datos del tablero
    const boardData = {
      id: "1MjfoyyRNobXbFvKtVXP",
      name: "Mi Primer Tablero",
      description: "Tablero de ejemplo para usuario invitado",
      ownerId: "0HNCbSTfdlQN2q7vI9Fbq1flgnm1",
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
      isPublic: false,
      password: null
    };

    // Datos del elemento
    const elementData = {
      id: "welcome-element",
      type: "text",
      content: "¡Bienvenido a Mi Cerebro!",
      position: { x: 100, y: 100 },
      size: { width: 300, height: 100 },
      style: {
        fontSize: "24px",
        color: "#000000",
        backgroundColor: "#ffffff"
      },
      createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z')),
      updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-12-09T17:45:46.000Z'))
    };

    // Crear documento de usuario
    console.log('📝 Creando documento de usuario...');
    await db.collection('users').doc('0HNCbSTfdlQN2q7vI9Fbq1flgnm1').set(userData);

    // Crear tablero
    console.log('🎨 Creando tablero...');
    await db.collection('users').doc('0HNCbSTfdlQN2q7vI9Fbq1flgnm1')
      .collection('canvasBoards').doc('1MjfoyyRNobXbFvKtVXP').set(boardData);

    // Crear elemento
    console.log('🧩 Creando elemento...');
    await db.collection('users').doc('0HNCbSTfdlQN2q7vI9Fbq1flgnm1')
      .collection('canvasBoards').doc('1MjfoyyRNobXbFvKtVXP')
      .collection('canvasElements').doc('welcome-element').set(elementData);

    console.log('✅ Seed completado exitosamente!');
    console.log('📍 Estructura creada:');
    console.log('   users/0HNCbSTfdlQN2q7vI9Fbq1flgnm1/');
    console.log('   ├── canvasBoards/1MjfoyyRNobXbFvKtVXP/');
    console.log('   └── canvasElements/welcome-element/');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar seed
seedFirestore().then(() => {
  console.log('🎉 Proceso completado!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
