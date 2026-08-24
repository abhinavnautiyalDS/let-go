export default function HowItWorksPage() {
  const steps = [
    { tag: 'OBSERVE', text: 'Enter the room. Observe. Breathe. You don\'t have to do anything.' },
    { tag: 'INVITATION', text: 'A gentle invitation appears. You choose to begin.' },
    { tag: 'FOCUS', text: 'The camera moves closer. The paper becomes the focus.' },
    { tag: 'WRITE', text: 'You write the name. It stays on the paper.' },
    { tag: 'BURN', text: 'You let go. The paper burns. The name is gone.' },
    { tag: 'RELEASE', text: 'The outside changes. So does you. You are lighter.' },
    { tag: 'PEACE', text: 'You are still here. Take a breath. You made it through everything that brought you here.' },
  ];

  return (
    <main className="how-it-works-page">
      <div className="page-scrim" />
      <h1 className="page-title">How it works</h1>
      <div className="journey-grid">
        {steps.map((step, i) => (
          <div key={i} className="journey-step">
            <span className="step-tag">{step.tag}</span>
            <p>{step.text}</p>
          </div>
        ))}
      </div>
    </main>
  );
}