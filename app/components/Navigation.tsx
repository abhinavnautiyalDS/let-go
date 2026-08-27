'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const [isMuted, setIsMuted] = useState(false);

  const toggleSound = () => setIsMuted(!isMuted);

  return (
    <nav className="global-nav">
      <Link href="/" className="nav-brand">LET GO</Link>
      <div className="nav-links">
        <Link href="/how-it-works">HOW IT WORKS</Link>
        <Link href="/about">ABOUT</Link>
        <Link href="/journal">JOURNAL</Link>
        <button onClick={toggleSound} className="sound-toggle" aria-label="Toggle sound">
          {isMuted ? '🔇' : '🔊'}
        </button>
      </div>
    </nav>
  );
}