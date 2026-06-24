'use client';

import { useState, useEffect, useMemo, useLayoutEffect } from 'react';

function getGridCoords(coords, puzzle) {
  if (Array.isArray(coords)) return [coords[0], coords[1]];
  if (puzzle === 'og' && typeof coords === 'object') {
    return [(coords.x - 720) / 240, (coords.y - 720) / 240];
  }
  return [0, 0];
}

export default function PublicDashboard({ initialData }) {
  const [activeDay, setActiveDay] = useState(1);
  const [activePuzzle, setActivePuzzle] = useState('shattered');
  const [isRawView, setIsRawView] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mapError, setMapError] = useState(false);
  const data = initialData || {};

  const [mappings, setMappings] = useState(null);

  const TOTAL_PIECES = mappings?.count || 1296;
  const puzzleData = data?.[activePuzzle] || { days: {}, lateFound: {} };

  const [sliderValue, setSliderValue] = useState(TOTAL_PIECES + 1);

  const gridSize = useMemo(() => {
    if (!mappings) {
      return { cols: 48, rows: 27 };
    }

    let maxCol = 0;
    let maxRow = 0;
    Object.entries(mappings).forEach(([code, coords]) => {
      if (code !== 'count') {
        const [x, y] = getGridCoords(coords, activePuzzle);
        if (typeof x === 'number') maxCol = Math.max(maxCol, x);
        if (typeof y === 'number') maxRow = Math.max(maxRow, y);
      }
    });

    return { cols: maxCol + 1 || 48, rows: maxRow + 1 || 27 };
  }, [mappings, activePuzzle]);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      const savedDay = localStorage.getItem('fngg_active_day');
      const savedPuzzle = localStorage.getItem('fngg_active_puzzle');

      const urlParams = new URLSearchParams(window.location.search);
      const pageParam = urlParams.get('page');

      if (pageParam && ['shattered', 'og'].includes(pageParam)) {
        setActivePuzzle(pageParam);
      } else if (savedPuzzle && ['shattered', 'og'].includes(savedPuzzle)) {
        setActivePuzzle(savedPuzzle);
      }
      if (savedDay) {
        const d = Number(savedDay);
        if (d !== 1) setActiveDay(d);
      }
    }, 0);
  }, []);

  useEffect(() => {
    document.title = activePuzzle === 'og' ? 'OG' : 'Shattered';
  }, [activePuzzle]);

  useEffect(() => {
    fetch(`/api/mappings/${activePuzzle}/day-${activeDay}.json`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(mappingData => {
        setMappings(mappingData);
        const count = mappingData.count || 1296;
        if (activePuzzle === 'og') {
          setSliderValue(count + 1);
        } else {
          const pData = data?.[activePuzzle] || { days: {} };
          const known = (pData.days?.[String(activeDay)] || []).length;
          if ([1, 2].includes(activeDay)) {
            setSliderValue(count + 1);
          } else {
            setSliderValue(known === count ? count + 1 : known);
          }
        }
      })
      .catch(err => {
        setMappings(null);
        setSliderValue(1297);
      });
  }, [activeDay, activePuzzle, data]);

  const handleDayChange = (d) => {
    setActiveDay(d);
    setMapError(false);
    localStorage.setItem('fngg_active_day', d);
  };

  const handlePuzzleChange = (p) => {
    setActivePuzzle(p);
    setActiveDay(1);
    setMapError(false);
    localStorage.setItem('fngg_active_puzzle', p);
    localStorage.setItem('fngg_active_day', '1');
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const days = activePuzzle === 'og' ? [1, 2, 3] : [1, 2, 3, 4, 5, 6];

  let activeCodes = [];
  if (activePuzzle === 'og') {
    activeCodes = mappings ? Object.keys(mappings).filter(k => k !== 'count').sort() : [];
  } else {
    activeCodes = [...(puzzleData.days?.[String(activeDay)] || [])].sort();
  }

  const hashStr = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
    }
    return hash;
  };
  const shuffledCodes = [...activeCodes].sort((a, b) => hashStr(a) - hashStr(b));

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim().toUpperCase();
    if (!q) {
      setSearchResult(null);
      return;
    }

    let found = null;
    let foundDay = null;
    for (const [d, codes] of Object.entries(puzzleData.days || {})) {
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

  const lateFoundArray = useMemo(
    () => {
      if (activePuzzle === 'og') return [];
      return puzzleData.lateFound?.[String(activeDay)] || [];
    },
    [puzzleData, activeDay, activePuzzle]
  );

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText([...activeCodes, ...lateFoundArray].join('\n'));
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
        if (code !== 'count') {
          const [x, y] = getGridCoords(coords, activePuzzle);
          map[`${x},${y}`] = code;
        }
      });
    }
    return map;
  }, [mappings, activePuzzle]);

  const cells = useMemo(() => {
    const elements = [];
    if (!mappings) return elements;
    for (let r = 0; r < gridSize.rows; r++) {
      for (let c = 0; c < gridSize.cols; c++) {
        const code = cellMap[`${c},${r}`];
        const isLateFound = code && lateFoundArray.includes(code) && !activeCodes.includes(code);
        const hasKnownPiece = code && activeCodes.includes(code);
        const shouldRenderImage = hasKnownPiece || isLateFound;

        elements.push(
          <div
            key={`${c},${r}`}
            id={code ? `cell-${code}` : `cell-empty-${c}-${r}`}
            className={`shattered-board-cell ${isLateFound ? 'late-found-cell' : ''} ${hasKnownPiece ? 'valid-fragment' : ''}`}
            data-tooltip={isLateFound ? `Fragment ${code}\nFound after puzzle\nRow ${r + 1}, Column ${c + 1}` : code ? `Fragment ${code}\nRow ${r + 1}, Column ${c + 1}` : undefined}
            style={{
              backgroundImage: shouldRenderImage ? `url(/api/images/${activePuzzle}/day-${activeDay}/${code}.webp)` : 'none'
            }}
          />
        );
      }
    }
    return elements;
  }, [mappings, activeDay, cellMap, activeCodes, lateFoundArray, gridSize, activePuzzle]);

  const orderedCellIds = useMemo(() => {
    const knownIds = shuffledCodes.map(code => `cell-${code}`);
    const lateFoundIds = [];
    if (mappings) {
      Object.keys(mappings).forEach(code => {
        if (lateFoundArray.includes(code) && !activeCodes.includes(code)) {
          lateFoundIds.push(`cell-${code}`);
        }
      });
    }
    return [...knownIds, ...lateFoundIds];
  }, [shuffledCodes, mappings, lateFoundArray, activeCodes]);

  useLayoutEffect(() => {
    const visibleSet = new Set(orderedCellIds.slice(0, sliderValue));
    if (mappings) {
      for (let r = 0; r < gridSize.rows; r++) {
        for (let c = 0; c < gridSize.cols; c++) {
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
  }, [sliderValue, orderedCellIds, mappings, cellMap, gridSize]);

  return (
    <div id="view-public" data-theme={activePuzzle}>
      <header className="appbar">
        <a href="/" className="brand">
          <span>{activePuzzle === 'og' ? 'OG PUZZLE' : 'SHATTERED'}</span>
        </a>
        <span className="appbar-badge">
          {activePuzzle === 'og' ? 'OG Season 9' : 'Chapter 7 · Season 3'}
        </span>
      </header>
      <div className="site-tagline">
        <span className="eyebrow">Community Event</span>
        <p className="tagline-text">
          {activePuzzle === 'og'
            ? 'FNGG OG was built around 3 teasers for Fortnite OG Season 9, where players gathered fragments to complete each of the 3 puzzles together as a community.'
            : 'FNGG Shattered was built around 6 teasers for Fortnite Chapter 7 Season 3, where players gathered fragments to complete each of the 6 puzzles together as a community.'}
        </p>
      </div>

      <section className="panel" style={{ marginBottom: '2rem' }}>
        <h1 className="hero-title">Fragment Codes</h1>
        <p style={{ color: 'var(--text-muted)' }}>The event is now over every code is listed below.</p>

        <div className="grid-2" style={{ marginTop: '1.5rem', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
              {mounted ? activeCodes.length + lateFoundArray.length : (puzzleData.days?.['1'] || []).length + (puzzleData.lateFound?.['1'] || []).length}
            </div>
            <div className="eyebrow">day {mounted ? activeDay : 1} lines</div>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {days.map(d => {
            const isActive = mounted ? (activeDay === d) : (d === 1);
            let count = 0;
            if (activePuzzle === 'og') {
              // OG does not have partial counts in data.json
              count = (d === activeDay && mappings) ? activeCodes.length : 0;
            } else {
              count = (puzzleData.days?.[String(d)] || []).length + (puzzleData.lateFound?.[String(d)] || []).length;
            }
            return (
              <button
                key={d}
                onClick={() => handleDayChange(d)}
                className="button"
                style={{
                  borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: isActive ? 'var(--primary-bg-active)' : 'var(--bg-panel)',
                  color: isActive ? 'var(--primary)' : 'var(--text)'
                }}
              >
                <span>Day {d}</span>
                {activePuzzle !== 'og' && <strong style={{ marginLeft: '0.5rem' }}>{count}</strong>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
          <button
            onClick={() => handlePuzzleChange('shattered')}
            className="button"
            style={{
              borderColor: activePuzzle === 'shattered' ? 'var(--primary)' : 'var(--border)',
              backgroundColor: activePuzzle === 'shattered' ? 'var(--primary-bg-active)' : 'var(--bg-panel)',
              color: activePuzzle === 'shattered' ? 'var(--primary)' : 'var(--text)'
            }}
          >
            Shattered
          </button>
          <button
            onClick={() => handlePuzzleChange('og')}
            className="button"
            style={{
              borderColor: activePuzzle === 'og' ? 'var(--primary)' : 'var(--border)',
              backgroundColor: activePuzzle === 'og' ? 'var(--primary-bg-active)' : 'var(--bg-panel)',
              color: activePuzzle === 'og' ? 'var(--primary)' : 'var(--text)'
            }}
          >
            OG
          </button>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="eyebrow">Day {mounted ? activeDay : 1}</span>
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
                  onClick={() => setSliderValue(activeCodes.length === TOTAL_PIECES ? TOTAL_PIECES + 1 : activeCodes.length)}
                  title="Click to snap to known pieces"
                >
                  {sliderValue > TOTAL_PIECES ? 'Full Map Preview' : (
                    <>
                      {sliderValue} / {activeCodes.length} pieces
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
              data-cols={gridSize.cols}
              data-rows={gridSize.rows}
              style={{
                display: (mappings && sliderValue <= TOTAL_PIECES && activeCodes.length > 0) ? 'grid' : 'none',
                gridTemplateColumns: `repeat(${gridSize.cols}, 1fr)`,
                gridTemplateRows: `repeat(${gridSize.rows}, 1fr)`,
                aspectRatio: `${gridSize.cols} / ${gridSize.rows}`
              }}
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
                key={`map-${activePuzzle}-day-${mounted ? activeDay : 1}`}
                src={`/api/maps/${activePuzzle}/day-${mounted ? activeDay : 1}.png?v=${encodeURIComponent(data?.updatedAt || '')}`}
                alt={`Map for ${activePuzzle} day ${mounted ? activeDay : 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: mapError ? 'none' : 'block',
                  borderRadius: 'var(--radius)'
                }}
                onError={() => setMapError(true)}
              />
              <div style={{
                display: mapError ? 'flex' : 'none',
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius)'
              }}>
                No map available for {activePuzzle} day {mounted ? activeDay : 1}.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearch}>
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
      </section>

      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="eyebrow">Day {mounted ? activeDay : 1}</span>
            <h2>Published Codes</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className={`button ${isRawView ? 'button-primary' : ''}`} onClick={() => setIsRawView(!isRawView)}>Raw</button>
            <a href={`/api/raw?day=${mounted ? activeDay : 1}&puzzle=${activePuzzle}`} target="_blank" rel="noreferrer" className="button">API raw</a>
            <a href={`/api/raw?day=all&puzzle=${activePuzzle}`} target="_blank" rel="noreferrer" className="button">API raw (All)</a>
            <button className="button button-primary" onClick={copyAll} disabled={activeCodes.length === 0 && lateFoundArray.length === 0}>Copy All</button>
          </div>
        </div>

        {activeCodes.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No codes published for this day yet.</div>
        ) : isRawView ? (
          <textarea
            readOnly
            className="input"
            style={{ width: '100%', height: '300px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: '1.5' }}
            value={[...activeCodes, ...lateFoundArray].join('\n')}
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
            {lateFoundArray.map(code => (
              <div key={code} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-mono)',
                opacity: 0.65
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>{code}</span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-sans, sans-serif)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.1rem 0.35rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Late Find</span>
                </div>
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
        <p>Software endpoint: <code style={{ color: 'var(--primary)' }}>/api/raw?day={mounted ? activeDay : 1}&amp;puzzle={activePuzzle}</code></p>
      </footer>
    </div>
  );
}