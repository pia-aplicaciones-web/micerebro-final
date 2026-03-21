/**
 * Helper para subir archivos a Firebase Storage directamente desde el cliente
 * Usa el SDK de Firebase con autenticación del usuario para respetar las reglas de seguridad
 */

import { ref, uploadBytes, getDownloadURL, type FirebaseStorage } from 'firebase/storage';

export interface UploadResponse {
  success: boolean;
  url: string;
  path: string;
  fileName: string;
  size: number;
  type: string;
  error?: string;
}

/**
 * Comprime una imagen a máximo 100KB y 72 DPI sin afectar significativamente la visibilidad
 * @param file - El archivo de imagen original
 * @param maxSizeKB - Tamaño máximo en KB (default: 100)
 * @returns Promise<File> - Archivo comprimido con resolución de 72 DPI
 */
export async function compressImage(file: File, maxSizeKB: number = 100): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calcular dimensiones máximas (mantener aspect ratio)
        const maxDimension = 1920; // Máximo de ancho o alto
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height / width) * maxDimension;
            width = maxDimension;
          } else {
            width = (width / height) * maxDimension;
            height = maxDimension;
          }
        }
        
        // Configurar canvas con resolución efectiva de 72 DPI
        // 72 DPI significa que 1 pulgada = 72 píxeles
        // Para web, esto se traduce en mantener dimensiones razonables
        // Redimensionar si la imagen es muy grande para mantener calidad a 72 DPI efectivo
        const targetDPI = 72;
        const maxWidthInches = 10; // Máximo 10 pulgadas de ancho
        const maxHeightInches = 10; // Máximo 10 pulgadas de alto
        const maxWidthPixels = maxWidthInches * targetDPI; // 720px
        const maxHeightPixels = maxHeightInches * targetDPI; // 720px
        
        // Redimensionar si excede los límites de 72 DPI
        if (width > maxWidthPixels || height > maxHeightPixels) {
          const aspectRatio = width / height;
          if (width > height) {
            width = maxWidthPixels;
            height = width / aspectRatio;
          } else {
            height = maxHeightPixels;
            width = height * aspectRatio;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }

        // Configurar calidad de imagen para mantener buena calidad a 72 DPI
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // REGLA: Imágenes PNG siempre se suben con fondo blanco
        if (file.type === 'image/png') {
          // Dibujar fondo blanco para imágenes PNG con transparencia
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Comprimir con calidad ajustable hasta alcanzar máximo 100KB
        let quality = 0.9;
        let compressedBlob: Blob | null = null;
        
        // Intentar diferentes calidades hasta alcanzar el tamaño objetivo
        const tryCompress = (q: number): void => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Error al comprimir la imagen'));
                return;
              }
              
              const sizeKB = blob.size / 1024;
              
              // Si el tamaño es aceptable o la calidad es muy baja, usar este blob
              if (sizeKB <= maxSizeKB || q <= 0.1) {
                compressedBlob = blob;
                const compressedFile = new File(
                  [blob],
                  file.name,
                  { type: 'image/jpeg', lastModified: Date.now() }
                );
                // Verificar que el archivo final NO exceda 100KB
                if (sizeKB > maxSizeKB) {
                  console.warn(`⚠️ Imagen comprimida pero aún excede ${maxSizeKB}KB: ${sizeKB.toFixed(2)}KB`);
                }
                console.log(`✅ Imagen comprimida a 72 DPI efectivo: ${(file.size / 1024).toFixed(2)}KB → ${(sizeKB).toFixed(2)}KB (${width}x${height}px)`);
                resolve(compressedFile);
              } else {
                // Reducir calidad y volver a intentar
                tryCompress(Math.max(0.1, q - 0.1));
              }
            },
            'image/jpeg',
            q
          );
        };
        
        tryCompress(quality);
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };
      
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Sube un archivo a Firebase Storage directamente desde el cliente autenticado
 * @param file - El archivo a subir
 * @param userId - El ID del usuario autenticado
 * @param storage - Instancia de FirebaseStorage (obtenida de useStorage hook o null)
 * @returns La respuesta con la URL del archivo subido
 */
export async function uploadFile(
  file: File, 
  userId: string, 
  storage: FirebaseStorage | null
): Promise<UploadResponse> {
  // Validar el tipo de archivo
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      url: '',
      path: '',
      fileName: '',
      size: 0,
      type: file.type,
      error: 'Tipo de archivo no permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP, SVG)',
    };
  }

  // Validar el tamaño del archivo (máximo 20MB - se comprimirá a 100KB y 72 DPI)
  const maxSize = 20 * 1024 * 1024; // 20MB
  if (file.size > maxSize) {
    return {
      success: false,
      url: '',
      path: '',
      fileName: '',
      size: file.size,
      type: file.type,
      error: 'El archivo es demasiado grande. El tamaño máximo es 20MB',
    };
  }

  // Validar que storage esté disponible
  if (!storage) {
    return {
      success: false,
      url: '',
      path: '',
      fileName: '',
      size: file.size,
      type: file.type,
      error: 'Firebase Storage no está disponible. Verifica tu conexión.',
    };
  }

  try {
    console.log('📤 uploadFile: Iniciando subida directa a Firebase Storage:', { 
      fileName: file.name, 
      size: file.size, 
      type: file.type, 
      userId 
    });

    // Comprimir imagen si es necesario (máximo 100KB y 72 DPI efectivo)
    // PERMITE archivos de hasta 20MB, pero SIEMPRE comprime a 100KB y 72 DPI
    let fileToUpload = file;
    if (file.type.startsWith('image/') && !file.type.includes('svg')) {
      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      console.log(`📦 Comprimiendo imagen (${originalSizeMB}MB) a máximo 100KB y 72 DPI efectivo...`);
      try {
        fileToUpload = await compressImage(file, 100);
        const finalSizeKB = fileToUpload.size / 1024;
        
        // VERIFICACIÓN CRÍTICA: El archivo NUNCA debe exceder 100KB después de compresión
        if (finalSizeKB > 100) {
          console.error(`❌ ERROR: Archivo comprimido excede 100KB: ${finalSizeKB.toFixed(2)}KB`);
          // Intentar compresión más agresiva con calidad más baja
          fileToUpload = await compressImage(file, 100);
          const retrySizeKB = fileToUpload.size / 1024;
          if (retrySizeKB > 100) {
            return {
              success: false,
              url: '',
              path: '',
              fileName: '',
              size: fileToUpload.size,
              type: file.type,
              error: `No se pudo comprimir la imagen a menos de 100KB. Tamaño final: ${retrySizeKB.toFixed(2)}KB`,
            };
          }
        }
        
        console.log(`✅ Imagen comprimida a 72 DPI efectivo: ${originalSizeMB}MB → ${finalSizeKB.toFixed(2)}KB`);
      } catch (compressError) {
        console.error('❌ Error al comprimir imagen:', compressError);
        // SIEMPRE rechazar si no se puede comprimir (archivos grandes deben comprimirse)
        return {
          success: false,
          url: '',
          path: '',
          fileName: '',
          size: file.size,
          type: file.type,
          error: `Error al comprimir imagen. No se pudo procesar el archivo de ${(file.size / (1024 * 1024)).toFixed(2)}MB.`,
        };
      }
    } else if (file.type.startsWith('image/') && file.type.includes('svg')) {
      // SVG no se comprime, pero verificar tamaño
      if (file.size > 5 * 1024 * 1024) { // 5MB máximo para SVG
        return {
          success: false,
          url: '',
          path: '',
          fileName: '',
          size: file.size,
          type: file.type,
          error: `El archivo SVG (${(file.size / (1024 * 1024)).toFixed(2)}MB) excede el límite máximo de 5MB permitido.`,
        };
      }
    } else {
      // Para archivos no imagen que exceden 100KB
      return {
        success: false,
        url: '',
        path: '',
        fileName: '',
        size: file.size,
        type: file.type,
        error: `Solo se permiten archivos de imagen. El archivo (${(file.size / 1024).toFixed(2)}KB) no es una imagen válida.`,
      };
    }

    // Generar un nombre único para el archivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    // Para PNG con fondo blanco, usar extensión .jpg ya que se convierte a JPEG
    const fileExtension = fileToUpload.type === 'image/png' ? 'jpg' : (fileToUpload.name.split('.').pop() || 'jpg');
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const storagePath = `users/${userId}/images/${fileName}`;

    // Crear referencia al archivo en Storage
    const storageRef = ref(storage, storagePath);
    
    // Crear metadatos personalizados
    const metadata = {
      contentType: fileToUpload.type,
      customMetadata: {
        originalName: file.name,
        originalSize: file.size.toString(),
        compressedSize: fileToUpload.size.toString(),
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      },
    };

    // Subir el archivo directamente desde el cliente (con autenticación)
    console.log('📤 uploadFile: Subiendo bytes a Storage...');
    const snapshot = await uploadBytes(storageRef, fileToUpload, metadata);

    console.log('📤 uploadFile: Archivo subido, obteniendo URL de descarga...');
    // Obtener la URL de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('✅ uploadFile: Subida exitosa:', { url: downloadURL, path: storagePath });
    
    return {
      success: true,
      url: downloadURL,
      path: storagePath,
      fileName: fileName,
      size: fileToUpload.size, // Tamaño del archivo subido (comprimido)
      type: fileToUpload.type,
    };
  } catch (error: any) {
    console.error('❌ uploadFile: Error al subir:', error);
    
    // Mensajes de error más específicos
    let errorMessage = 'Error al subir el archivo.';
    if (error.code === 'storage/unauthorized') {
      errorMessage = 'No tienes permisos para subir archivos. Verifica que estés autenticado correctamente.';
    } else if (error.code === 'storage/quota-exceeded') {
      errorMessage = 'Se ha excedido la cuota de almacenamiento.';
    } else if (error.code === 'storage/unauthenticated') {
      errorMessage = 'Debes estar autenticado para subir archivos.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      url: '',
      path: '',
      fileName: '',
      size: file.size,
      type: file.type,
      error: errorMessage,
    };
  }
}
