import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Writer's Forge - Asistente Literario & Motor de Coherencia",
  description: "Entorno de escritura enfocado con organización modular, fichas de universo dinámicas y motor de coherencia temporal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
