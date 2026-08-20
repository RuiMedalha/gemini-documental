import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DocFlow PT • Arquivo Fiscal Inteligente',
  description: 'Leitor e Gestão de Faturas Portuguesas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
