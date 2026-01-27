import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { userAgent } from 'next/server';

export function middleware(request: NextRequest) {
  const { device } = userAgent(request);
  const isMobile = device.type === 'mobile'; // 'mobile', 'tablet', 'console', 'smarttv', 'wearable', 'embedded', or undefined

  if (isMobile && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/movil/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'], // Aplicar este middleware solo a la ruta raíz
};