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
  matcher: '/', // Aplicar este middleware a la ruta raíz y cualquier subruta si es necesario
};