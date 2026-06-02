'use client';

import { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { submitCode } from '../actions';

export default function PublicDashboard({ initialData }) {
  const router = useRouter();
  const [activeDay, setActiveDay] = useState(1);
  const [isRawView, setIsRawView] = useState(false);
  const data = initialData;

  const TOTAL_PIECES = 1296;
  const [sliderValue, setSliderValue] = useState(TOTAL_PIECES + 1);
  const [mappings, setMappings] = useState(null);

  useEffect(() => {
    fetch(`/api/mappings/day-${activeDay}.json`)
      .then(res => res.json())
      .then(data => setMappings(data))
      .catch(err => setMappings(null));
  }, [activeDay]);

  useEffect(() => {
    const saved = localStorage.getItem('fngg_active_day');
    if (saved) {
      setTimeout(() => setActiveDay(Number(saved)), 0);
    }
  }, []);

  const handleDayChange = (d) => {
    setActiveDay(d);
    localStorage.setItem('fngg_active_day', d);
    setSliderValue(TOTAL_PIECES + 1);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [submitRaw, setSubmitRaw] = useState('');

  const days = [1, 2, 3, 4, 5, 6];
  const activeCodes = [...(data.days[String(activeDay)] || [])].sort();

  const hashStr = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return hash;
  };
  const shuffledCodes = [...activeCodes].sort((a, b) => hashStr(a) - hashStr(b));

  const isLocked = data?.settings?.lockedDays?.includes(activeDay);

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
        router.refresh();
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

  const cellMap = useMemo(() => {
    const map = {};
    if (mappings) {
      Object.entries(mappings).forEach(([code, coords]) => {
        map[`${coords[0]},${coords[1]}`] = code;
      });
    }
    return map;
  }, [mappings]);

  const cells = useMemo(() => {
    const elements = [];
    if (!mappings) return elements;
    for (let r = 0; r < 27; r++) {
      for (let c = 0; c < 48; c++) {
        const code = cellMap[`${c},${r}`];
        const isMissing = code && code.startsWith('missing');
        elements.push(
          <div
            key={`${c},${r}`}
            id={code ? `cell-${code}` : `cell-empty-${c}-${r}`}
            className={`shattered-board-cell ${isMissing ? 'missing-cell' : ''}`}
            data-tooltip={(!isMissing && code) ? `Fragment ${code}\nRow ${r + 1}, Column ${c + 1}` : `Code wasn't found\nRow ${r + 1}, Column ${c + 1}`}
            style={{
              backgroundImage: code ? `url(/api/images/day-${activeDay}/${code}.webp)` : 'none'
            }}
          />
        );
      }
    }
    return elements;
  }, [mappings, activeDay, cellMap]);

  const orderedCellIds = useMemo(() => {
    const knownIds = shuffledCodes.map(code => `cell-${code}`);
    const missingIds = [];
    if (mappings) {
      Object.keys(mappings).forEach(code => {
        if (code.startsWith('missing-')) {
          missingIds.push(`cell-${code}`);
        }
      });
    }
    return [...knownIds, ...missingIds];
  }, [shuffledCodes, mappings, cellMap]);

  useLayoutEffect(() => {
    const visibleSet = new Set(orderedCellIds.slice(0, sliderValue));
    if (mappings) {
      for (let r = 0; r < 27; r++) {
        for (let c = 0; c < 48; c++) {
          const code = cellMap[`${c},${r}`];
          const id = code ? `cell-${code}` : `cell-empty-${c}-${r}`;
          const el = document.getElementById(id);
          if (el) {
            if (visibleSet.has(id)) el.classList.add('filled');
            else el.classList.remove('filled');
          }
        }
      }
    }
  }, [sliderValue, orderedCellIds, mappings, cellMap]);

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
          const isDayLocked = data?.settings?.lockedDays?.includes(d);
          return (
            <button
              key={d}
              onClick={() => handleDayChange(d)}
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
          textAlign: 'center'
        }}>
          {activeCodes.length > 0 && (
            <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span>0</span>
                <span
                  style={{ fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={() => setSliderValue(activeCodes.length)}
                  title="Click to snap to known pieces"
                >
                  {sliderValue > TOTAL_PIECES ? 'Full Map Preview' : (
                    <>
                      {sliderValue} / {activeCodes.length} pieces
                      {sliderValue > activeCodes.length && ` (+${sliderValue - activeCodes.length} missing added)`}
                    </>
                  )}
                </span>
                <span>Full Map</span>
              </div>
              <input
                type="range"
                min="0"
                max={TOTAL_PIECES + 1}
                value={sliderValue}
                onChange={(e) => setSliderValue(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          )}

          <div style={{ position: 'relative', width: '100%', margin: '0 auto', maxWidth: '100%' }}>
            <div
              id="shattered-board-grid"
              className="shattered-board-grid"
              data-day={activeDay}
              data-cols="48"
              data-rows="27"
              style={{ display: (mappings && sliderValue <= TOTAL_PIECES && activeCodes.length > 0) ? 'grid' : 'none' }}
            >
              {cells}
            </div>

            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16 / 9',
              margin: '0 auto',
              display: (!mappings || sliderValue > TOTAL_PIECES || activeCodes.length === 0) ? 'block' : 'none'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/maps/day-${activeDay}.png`}
                alt={`Map for day ${activeDay}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  borderRadius: 'var(--radius)'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div style={{
                display: 'none',
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius)'
              }}>
                No map uploaded for day {activeDay} yet.
              </div>
            </div>
          </div>
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
              placeholder={isLocked ? "Submissions are locked" : "XXXX-XXXX-XXXX"}
              maxLength="14"
              value={submitRaw}
              onChange={e => setSubmitRaw(e.target.value.toUpperCase())}
              disabled={isLocked}
            />
            <button type="submit" className="button button-primary" disabled={isLocked}>
              Submit
            </button>
          </div>
        </form>
      </div>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="eyebrow">Day {activeDay}</span>
            <h2>Published lines</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className={`button ${isRawView ? 'button-primary' : ''}`} onClick={() => setIsRawView(!isRawView)}>Raw</button>
            <a href={`/api/raw?day=${activeDay}`} target="_blank" rel="noreferrer" className="button">API raw</a>
            <a href="/api/raw?day=all" target="_blank" rel="noreferrer" className="button">API raw (All)</a>
            <button className="button button-primary" onClick={copyAll} disabled={activeCodes.length === 0}>Copy All</button>
          </div>
        </div>

        {activeCodes.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No codes published for this day yet.</div>
        ) : isRawView ? (
          <textarea
            readOnly
            className="input"
            style={{ width: '100%', height: '300px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: '1.5' }}
            value={activeCodes.join('\n')}
            onFocus={(e) => e.target.select()}
          />
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
