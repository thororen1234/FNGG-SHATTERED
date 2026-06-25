import { getAllEvents } from './lib/data';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const events = await getAllEvents();

  return (
    <div id="view-public" data-theme="home">
      <header className="appbar">
        <div className="brand">
          <span>FNGG PUZZLES</span>
        </div>
      </header>

      <section className="panel">
        <div className="site-tagline">
          <span className="eyebrow">Community Events</span>
          <p className="tagline-text">
            Select a puzzle event below to view its community progress and map.
          </p>
        </div>

        <div className="grid-2" style={{ gap: '1rem', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events.filter(e => e.mode === 'br').map((event) => {
              const hrefParts = [event.mode];
              if (event.chapter) hrefParts.push(event.chapter);
              if (event.season) hrefParts.push(event.season);
              const href = `/${hrefParts.join('/')}`;

              return (
                <Link key={href} href={href} className="button" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '2rem',
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--radius)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="eyebrow">
                      Battle Royale
                    </span>
                    <span className="eyebrow" style={{ color: event.ongoing === false ? 'var(--text-muted)' : 'var(--primary)' }}>
                      {event.ongoing === false ? 'OVER' : 'ONGOING'}
                    </span>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {event.name}
                  </span>
                </Link>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {events.filter(e => e.mode !== 'br').map((event) => {
              const hrefParts = [event.mode];
              if (event.chapter) hrefParts.push(event.chapter);
              if (event.season) hrefParts.push(event.season);
              const href = `/${hrefParts.join('/')}`;

              return (
                <Link key={href} href={href} className="button" style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '2rem',
                  backgroundColor: 'var(--bg-panel)',
                  borderColor: 'var(--border)',
                  borderRadius: 'var(--radius)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="eyebrow">
                      {event.mode === 'og' ? 'Fortnite OG' : event.mode}
                    </span>
                    <span className="eyebrow" style={{ color: event.ongoing === false ? 'var(--text-muted)' : 'var(--primary)' }}>
                      {event.ongoing === false ? 'OVER' : 'ONGOING'}
                    </span>
                  </div>
                  <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {event.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No puzzle events found.
          </div>
        )}
      </section>
    </div>
  );
}