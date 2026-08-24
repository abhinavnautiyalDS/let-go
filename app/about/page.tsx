export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="page-scrim" />
      <h1 className="page-title">ABOUT LET GO</h1>
      <h2 className="about-subtitle">This experience is made for quiet moments.</h2>
      <p className="about-description">
        LET GO is an interactive experience created for moments when holding on
        feels heavier than letting go. It doesn't promise to erase memories.
        It simply gives you a quiet moment to acknowledge them.
      </p>
      <div className="about-tags">
        <span>Private</span>
        <span>Ad-free</span>
        <span>Made with care</span>
        <span>No pressure</span>
        <span>No sign up</span>
      </div>
      <p className="about-closing">
        Some things are not meant to stay.<br />
        Thank you for letting them go.
      </p>
    </main>
  );
}