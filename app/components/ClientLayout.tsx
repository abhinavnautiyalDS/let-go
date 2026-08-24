'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = !pathname?.startsWith('/ritual');

  return (
    <>
      {showNav && <Navigation />}
      {children}
    </>
  );
}