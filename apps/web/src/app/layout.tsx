import React from 'react';

export const metadata = {
  title: 'DocFlow PT • Hotelequip.pt',
  description: 'Gestão Documental, Fiscal e Conciliação Bancária',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#030712', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}
