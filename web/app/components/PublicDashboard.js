'use client';

import { useState, useEffect, useMemo, useLayoutEffect } from 'react';
import Link from 'next/link';

function getGridCoords(coords) {
  if (Array.isArray(coords)) return [coords[0], coords[1]];
  if (coords && typeof coords === 'object') {
    return [(coords.x - 720) / 240, (coords.y - 720) / 240];
  }
  return [0, 0];
}

const PIECE_IMAGE_SCALE = 384 / 240;
function isPieceMapFormat(mappings) {
  if (!mappings) return false;
  const sampleKey = Object.keys(mappings).find(k => k !== 'count');
  if (!sampleKey) return false;
  return !Array.isArray(mappings[sampleKey]);
}

function formatRefreshTime(timeStr) {
  if (!timeStr) return '';
  if (timeStr === 'daily') return 'every day';

  const parts = [];
  const regex = /(\d+)([dhms])/g;
  let match;
  let hasMatches = false;
  let isFirst = true;

  while ((match = regex.exec(timeStr)) !== null) {
    hasMatches = true;
    const value = parseInt(match[1], 10);
    const unitChar = match[2];

    let unit = '';
    if (unitChar === 'd') unit = 'day';
    else if (unitChar === 'h') unit = 'hour';
    else if (unitChar === 'm') unit = 'minute';
    else if (unitChar === 's') unit = 'second';

    if (isFirst && value === 1) {
      parts.push(unit);
    } else {
      parts.push(`${value} ${unit}${value !== 1 ? 's' : ''}`);
    }
    isFirst = false;
  }

  if (!hasMatches) return timeStr;

  let joinedParts = '';
  if (parts.length === 1) {
    joinedParts = parts[0];
  } else if (parts.length === 2) {
    joinedParts = parts.join(' and ');
  } else {
    joinedParts = parts.slice(0, -1).join(', ') + ', and ' + parts[parts.length - 1];
  }

  return `every ${joinedParts}`;
}

export default function PublicDashboard({ initialData, eventMode, eventChapter, eventSeason, eventName }) {
  const [activeDay, setActiveDay] = useState(1);
  const [isRawView, setIsRawView] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mapError, setMapError] = useState(false);
  const puzzleData = initialData || { days: {}, lateFound: {} };

  const [mappings, setMappings] = useState(null);

  const TOTAL_PIECES = mappings?.count || 1296;

  const eventPathParts = [eventMode];
  if (eventChapter) eventPathParts.push(eventChapter);
  if (eventSeason) eventPathParts.push(eventSeason);
  const eventPath = eventPathParts.join('/');

  const [sliderValue, setSliderValue] = useState(TOTAL_PIECES + 1);

  const gridSize = useMemo(() => {
    if (!mappings) {
      return { cols: 48, rows: 27 };
    }

    let maxCol = 0;
    let maxRow = 0;
    Object.entries(mappings).forEach(([code, coords]) => {
      if (code !== 'count') {
        const [x, y] = getGridCoords(coords);
        if (typeof x === 'number') maxCol = Math.max(maxCol, x);
        if (typeof y === 'number') maxRow = Math.max(maxRow, y);
      }
    });

    return { cols: maxCol + 1 || 48, rows: maxRow + 1 || 27 };
  }, [mappings]);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      const savedDay = localStorage.getItem(`fngg_active_day_${eventPath}`);
      if (savedDay) {
        const d = Number(savedDay);
        if (d !== 1) setActiveDay(d);
      }
    }, 0);
  }, [eventPath]);

  useEffect(() => {
    document.title = eventName;
  }, [eventName]);

  useEffect(() => {
    fetch(`/api/mappings/${eventPath}/${activeDay}.json`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(mappingData => {
        setMappings(mappingData);
        const count = mappingData.count || 1296;
        if (isPieceMapFormat(mappingData)) {
          setSliderValue(count + 1);
        } else {
          const known = (puzzleData.days?.[String(activeDay)] || []).length;
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
  }, [activeDay, eventPath, eventMode, puzzleData]);

  const handleDayChange = (d) => {
    setActiveDay(d);
    setMapError(false);
    localStorage.setItem(`fngg_active_day_${eventPath}`, d);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const maxDay = puzzleData.maxDay || (eventMode === 'og' ? 3 : 6);
  const days = Array.from({ length: maxDay }, (_, i) => i + 1);

  const pieceMapFormat = isPieceMapFormat(mappings);

  let activeCodes = [];
  if (pieceMapFormat) {
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
      setSearchResult({ found: true, text: `Found in Puzzle ${foundDay}: ${found}` });
    } else {
      setSearchResult({ found: false, text: 'Code not found in any published day.' });
    }
  };

  const lateFoundArray = useMemo(
    () => {
      if (pieceMapFormat) return [];
      return puzzleData.lateFound?.[String(activeDay)] || [];
    },
    [puzzleData, activeDay, pieceMapFormat]
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
          const [x, y] = getGridCoords(coords);
          map[`${x},${y}`] = code;
        }
      });
    }
    return map;
  }, [mappings]);

  const cells = useMemo(() => {
    const elements = [];
    if (!mappings) return elements;

    if (pieceMapFormat) {
      const widthPct = (PIECE_IMAGE_SCALE / gridSize.cols) * 100;
      const heightPct = (PIECE_IMAGE_SCALE / gridSize.rows) * 100;

      Object.entries(mappings).forEach(([code, coords]) => {
        if (code === 'count') return;
        const [c, r] = getGridCoords(coords);
        const hasKnownPiece = activeCodes.includes(code);
        const z = (coords && typeof coords === 'object' && !Array.isArray(coords)) ? coords.z : 0;

        elements.push(
          <div
            key={code}
            id={`cell-${code}`}
            className={`shattered-board-cell piece-overlap ${hasKnownPiece ? 'valid-fragment' : ''}`}
            data-tooltip={`Fragment ${code}\nRow ${r + 1}, Column ${c + 1}`}
            style={{
              backgroundImage: hasKnownPiece ? `url(/api/images/${eventPath}/${activeDay}/${code}.webp)` : 'none',
              left: `${((c + 0.5) / gridSize.cols) * 100}%`,
              top: `${((r + 0.5) / gridSize.rows) * 100}%`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              zIndex: z || 0
            }}
          />
        );
      });
      return elements;
    }

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
              backgroundImage: shouldRenderImage ? `url(/api/images/${eventPath}/${activeDay}/${code}.webp)` : 'none'
            }}
          />
        );
      }
    }
    return elements;
  }, [mappings, activeDay, cellMap, activeCodes, lateFoundArray, gridSize, eventPath, pieceMapFormat]);

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
    <div id="view-public" data-theme={eventMode === 'og' ? 'og' : 'shattered'}>
      <header className="appbar">
        <Link href="/" className="brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>Home</span>
        </Link>
        <span className="appbar-badge">
          {eventName}
        </span>
      </header>

      <section className="panel" style={{ marginBottom: '2rem' }}>
        <h1 className="hero-title">{puzzleData.heroTitle || (eventMode === 'og' ? 'Fortnite OG Pieces' : 'Puzzle Pieces')}</h1>
        <p style={{ color: 'var(--text-muted)' }}>
          {puzzleData.ongoing === false ? (
            puzzleData.refresh
              ? `Puzzles came out ${formatRefreshTime(puzzleData.refresh)} but the event is now over every code is listed below.`
              : 'The event is now over every code is listed below.'
          ) : (
            `This event is currently ongoing please submit new codes below.${puzzleData.refresh ? ` New puzzles come out ${formatRefreshTime(puzzleData.refresh)}.` : ''}`
          )}
        </p>

        <div className="grid-2" style={{ marginTop: '1.5rem', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
              {mounted ? activeCodes.length + lateFoundArray.length : (puzzleData.days?.['1'] || []).length + (puzzleData.lateFound?.['1'] || []).length}
            </div>
            <div className="eyebrow">puzzle {mounted ? activeDay : 1} pieces</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {days.map(d => {
              const isActive = mounted ? (activeDay === d) : (d === 1);
              let count = 0;
              if (pieceMapFormat) {
                count = (d === activeDay && mappings) ? activeCodes.length : 0;
              } else {
                count = (puzzleData.days?.[String(d)] || []).length + (puzzleData.lateFound?.[String(d)] || []).length;
              }
              return (
                <button
                  key={d}
                  onClick={() => handleDayChange(d)}
                  className={`button day-button ${isActive ? 'active' : ''}`}
                >
                  <span>Puzzle {d}</span>
                  {!pieceMapFormat && <strong style={{ marginLeft: '0.5rem' }}>{count}</strong>}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <span className="eyebrow">Puzzle {mounted ? activeDay : 1}</span>
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
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }}
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
                key={`map-${eventPath}-day-${mounted ? activeDay : 1}`}
                src={`/api/maps/${eventPath}/${mounted ? activeDay : 1}.png?v=${encodeURIComponent(puzzleData?.updatedAt || '')}`}
                alt={`Map for puzzle ${mounted ? activeDay : 1}`}
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
                No map available for puzzle {mounted ? activeDay : 1}.
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
            <span className="eyebrow">Puzzle {mounted ? activeDay : 1}</span>
            <h2>Published Codes</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button className={`button ${isRawView ? 'button-primary' : ''}`} onClick={() => setIsRawView(!isRawView)}>Raw</button>
            <a href={`/api/raw?day=${mounted ? activeDay : 1}&mode=${eventMode}${eventChapter ? `&chapter=${eventChapter}` : ''}${eventSeason ? `&season=${eventSeason}` : ''}`} target="_blank" rel="noreferrer" className="button">API raw</a>
            <a href={`/api/raw?day=all&mode=${eventMode}${eventChapter ? `&chapter=${eventChapter}` : ''}${eventSeason ? `&season=${eventSeason}` : ''}`} target="_blank" rel="noreferrer" className="button">API raw (All)</a>
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
        <p>Software endpoint: <code style={{ color: 'var(--primary)' }}>{`/api/raw?day=${mounted ? activeDay : 1}&mode=${eventMode}${eventChapter ? `&chapter=${eventChapter}` : ''}${eventSeason ? `&season=${eventSeason}` : ''}`}</code></p>
      </footer>
    </div>
  );
}