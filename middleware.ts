import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { userAgent } from 'next/server';

export function middleware(request: NextRequest) {
  const { device } = userAgent(request);
  const isMobile = device.type === 'mobile';
  const response = NextResponse.next();

  // Establecer un encabezado personalizado para el tipo de dispositivo
  response.headers.set('x-device-type', isMobile ? 'mobile' : 'desktop');

  return response;
}

export const config = {
  // Aplicar a todas las rutas excepto las de la API, estáticas, imágenes y favicon.ico
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|movil).*)'],
};