
import '../styles/globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/providers';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata = {
  title: 'Mi cerebro - Tu lienzo de ideas infinitas',
  description: 'Mi cerebro - Tu lienzo de ideas infinitas. Crea, organiza y comparte tus ideas en un canvas infinito.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-419" suppressHydrationWarning>
      <head>
          {/* Favicon principal de la web app */}
          <link rel="icon" href="/favicon.ico" />
          <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Raleway:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
       </head>
      <body className='font-body antialiased' style={{ margin: 0, padding: 0 }} spellCheck={true}>
          <ErrorBoundary>
            <Providers>
              {children}
            </Providers>
          </ErrorBoundary>
          <Toaster />
          {/* Indicador de build (solo en Vercel): ver qué commit está en producción */}
          {typeof process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA === 'string' && process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
            <div
              aria-hidden
              className="fixed bottom-1 right-1 text-[10px] text-muted-foreground/60 font-mono select-none pointer-events-none z-[9999]"
              title={`Commit: ${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
            >
              Build: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
            </div>
          )}
      </body>
    </html>
  );
}
