import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Agente IA de Jurisprud?ncia (BR)',
  description: 'Pesquisa jurisprud?ncia, temas e decis?es vinculantes em tribunais brasileiros.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px' }}>{children}</main>
      </body>
    </html>
  );
}
