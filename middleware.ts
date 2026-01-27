import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');
  const isMobile = Boolean(userAgent?.match(
    /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
  ));

  if (isMobile && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/movil/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'], // Aplicar este middleware solo a la ruta raíz
};