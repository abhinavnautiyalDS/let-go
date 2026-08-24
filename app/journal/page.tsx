'use client';

import { useState } from 'react';

export default function JournalPage() {
  const [entry, setEntry] = useState('');

  return (
    <main className="journal-page">
      <div className="page-scrim" />
      <h1 className="page-title">JOURNAL</h1>
      <p className="journal-prompt">Messages for you. A final reminder.</p>
      <textarea
        className="journal-textarea"
        placeholder="Write your reflections here..."
        value={entry}
        onChange={(e) => setEntry(e.target.value)}
      />
      <button className="journal-save" onClick={() => alert('Journal saved locally.')}>
        SAVE
      </button>
    </main>
  );
}