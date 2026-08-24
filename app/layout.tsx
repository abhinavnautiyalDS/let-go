import type { Metadata } from 'next';
import './globals.css';           // ✅ Correct

import ClientLayout from '@/app/components/ClientLayout';

export const metadata: Metadata = {
  title: 'LET GO',
  description: 'A quiet ritual for letting go',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}