import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { userAgent } from 'next/server';

export function middleware(request: NextRequest) {
  const { device } = userAgent(request);
  const isMobile = device.type === 'mobile';
  const url = request.nextUrl.clone();

  // Redirigir a usuarios móviles a la ruta móvil genérica si no están ya en una ruta móvil
  if (isMobile && url.pathname === '/') {
    url.pathname = '/movil/auto-load-board';
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  // Establecer un encabezado personalizado para el tipo de dispositivo
  response.headers.set('x-device-type', isMobile ? 'mobile' : 'desktop');

  return response;
}

export const config = {
  // Aplicar a todas las rutas excepto las de la API, estáticas, imágenes y favicon.ico
  matcher: ['/'],
};