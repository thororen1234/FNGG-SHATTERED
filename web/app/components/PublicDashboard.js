'use client';

import { useState } from 'react';
import { submitCode } from '../actions';

export default function PublicDashboard({ initialData }) {
  const [activeDay, setActiveDay] = useState(1);
  const [data, setData] = useState(initialData);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [submitRaw, setSubmitRaw] = useState('');

  const days = [1, 2, 3, 4, 5, 6];
  const activeCodes = data.days[String(activeDay)] || [];

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (!q) {
      setSearchResult(null);
      return;
    }

    let found = null;
    let foundDay = null;
    for (const [d, codes] of Object.entries(data.days)) {
      const match = codes.find(c => c.includes(q));
      if (match) {
        found = match;
        foundDay = d;
        break;
      }
    }

    if (found) {
      setSearchResult({ found: true, text: `✓ Found in Day ${foundDay}: ${found}` });
    } else {
      setSearchResult({ found: false, text: '✗ Code not found in any published day.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('code', submitRaw);
    formData.append('day', activeDay);

    const res = await submitCode(formData);
    if (res.success) {
      alert(res.autoApproved ? 'Code auto-approved and published!' : 'Submitted for review. Thanks!');
      setSubmitRaw('');
      if (res.autoApproved) {
        window.location.reload();
      }
    } else {
      alert(res.error);
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(activeCodes.join('\n'));
      alert('All codes copied!');
    } catch (err) {
      alert('Failed to copy');
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) { }
  };

  return (
    <div id="view-public">
      <section className="panel" style={{ marginBottom: '2rem' }}>
        <h1 className="hero-title">Fragment Codes</h1>
        <p style={{ color: 'var(--text-muted)' }}>Updated as soon as we get new codes for the day.</p>

        <div className="grid-2" style={{ marginTop: '1.5rem', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{activeCodes.length}</div>
            <div className="eyebrow">day {activeDay} lines</div>
          </div>
        </div>
      </section>

      <nav style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {days.map(d => {
          const count = (data.days[String(d)] || []).length;
          const isActive = activeDay === d;
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className="button"
              style={{
                borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                backgroundColor: isActive ? 'rgba(234,88,12,0.1)' : 'var(--bg-panel)',
                color: isActive ? 'var(--primary)' : 'var(--text)'
              }}
            >
              <span>Day {d}</span>
              <strong style={{ marginLeft: '0.5rem' }}>{count}</strong>
            </button>
          );
        })}
      </nav>

      <section className="panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="eyebrow">Day {activeDay}</span>
            <h2>Current map</h2>
          </div>
        </div>
        <div style={{
          backgroundColor: 'var(--bg)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius)',
          padding: '2rem',
          textAlign: 'center',
          overflow: 'hidden'
        }}>
          <img
            src={`/api/maps/day-${activeDay}.png`}
            alt={`Map for day ${activeDay}`}
            style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span style={{ display: 'none', color: 'var(--text-muted)' }}>No map uploaded for day {activeDay} yet.</span>
        </div>
      </section>

      <div className="grid-2" style={{ marginBottom: '2rem' }}>
        <form className="panel" onSubmit={handleSearch}>
          <div style={{ marginBottom: '1rem' }}>
            <span className="eyebrow">Search</span>
            <h2>Check a code</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="Paste full or partial code"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="button button-primary">Search</button>
          </div>
          {searchResult && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius)',
              backgroundColor: searchResult.found ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: searchResult.found ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.875rem'
            }}>
              {searchResult.text}
            </div>
          )}
        </form>

        <form className="panel" onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <span className="eyebrow">Request</span>
            <h2>Submit for day {activeDay}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="input"
              placeholder="XXXX-XXXX-XXXX"
              maxLength="14"
              value={submitRaw}
              onChange={e => setSubmitRaw(e.target.value.toUpperCase())}
            />
            <button type="submit" className="button button-primary">Submit</button>
          </div>
        </form>
      </div>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="eyebrow">Day {activeDay}</span>
            <h2>Published lines</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a href={`/api/raw?day=${activeDay}`} target="_blank" rel="noreferrer" className="button">API raw</a>
            <button className="button button-primary" onClick={copyAll} disabled={activeCodes.length === 0}>Copy All</button>
          </div>
        </div>

        {activeCodes.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No codes published for this day yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeCodes.map(code => (
              <div key={code} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-mono)'
              }}>
                <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{code}</span>
                <button
                  className="button"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                  onClick={() => copyCode(code)}
                >
                  copy
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <p>Software endpoint: <code style={{ color: 'var(--primary)' }}>/api/raw?day={activeDay}</code></p>
      </footer>
    </div>
  );
}
