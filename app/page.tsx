import SceneBackground from '@/app/components/SceneBackground';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="home-page">
      <div className="home-bg">
        <SceneBackground />
      </div>

      <div className="home-content">
        <h1 className="hero-title">LET GO</h1>
        <p className="hero-subtitle">How it works in 3 steps</p>
        <p className="hero-tagline">
          release a memory, person<br />
          or feeling you're ready<br />
          to stop carrying.
        </p>

        <div className="steps-container">
          <div className="step">
            <span className="step-number">1</span>
            <h3>Write</h3>
            <p>The name you're ready to let go of.</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <h3>Burn</h3>
            <p>Watch the paper burn and the name disappear.</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <h3>Release</h3>
            <p>Leave it behind and move forward lighter.</p>
          </div>
        </div>

        <Link href="/ritual" className="begin-hero">
          BEGIN
        </Link>
      </div>
    </main>
  );
}