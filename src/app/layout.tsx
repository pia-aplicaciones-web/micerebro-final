
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
    <html lang="es" suppressHydrationWarning>
       <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
       </head>
      <body className='font-body antialiased' style={{ margin: 0, padding: 0 }}>
          <ErrorBoundary>
            <Providers>
              {children}
            </Providers>
          </ErrorBoundary>
          <Toaster />
      </body>
    </html>
  );
}
