'use client';

import { useState, useRef, useEffect } from 'react';
import { logout, reviewSubmission, bulkPublish, clearDayCodes, toggleSetting, toggleLockedDay, uploadMap, deleteCode, manualSync, saveLateFound } from '../actions';
import { useRouter } from 'next/navigation';

export default function AdminClient({ initialData }) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState('submissions');
  const [bulkDay, setBulkDay] = useState(1);
  const [bulkCodes, setBulkCodes] = useState('');
  const [viewingDay, setViewingDay] = useState(null);
  const [rawViewDays, setRawViewDays] = useState({});
  const [lateFoundEdits, setLateFoundEdits] = useState(
    Object.fromEntries([1,2,3,4,5,6].map(d => [
      d,
      (initialData?.lateFound?.[String(d)] || []).join('\n')
    ]))
  );
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleReview = async (id, action) => {
    const res = await reviewSubmission(id, action);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleBulkPublish = async () => {
    const formData = new FormData();
    formData.append('day', bulkDay);
    formData.append('codes', bulkCodes);
    const res = await bulkPublish(formData);
    if (res.success) {
      alert(`Published ${res.added} new codes to Day ${bulkDay}`);
      setBulkCodes('');
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleClearDay = async (day) => {
    if (confirm(`Clear ALL codes for Day ${day}? This cannot be undone.`)) {
      await clearDayCodes(day);
      router.refresh();
    }
  };

  const handleMapUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await uploadMap(formData);
    if (res.success) {
      alert('Map uploaded successfully!');
      e.target.reset();
    } else {
      alert(res.error);
    }
  };

  const handleDeleteCode = async (day, code) => {
    if (confirm(`Delete code ${code} from Day ${day}?`)) {
      await deleteCode(day, code);
      router.refresh();
    }
  };

  const handleManualSync = async () => {
    try {
      const res = await manualSync();
      if (res.success) {
        alert('Manual sync completed!');
        router.refresh();
      } else {
        alert('Error: ' + res.error);
      }
    } catch (err) {
      alert('Error triggering sync: ' + err.message);
    }
  };

  const pendingSubs = data.submissions.filter(s => s.status === 'pending');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="hero-title" style={{ fontSize: '1.5rem' }}>Admin Dashboard</h1>
        </div>
        <button className="button button-danger" onClick={handleLogout}>Sign out</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <button className={`button ${activeTab === 'submissions' ? 'button-primary' : ''}`} onClick={() => setActiveTab('submissions')}>
          Submissions ({pendingSubs.length})
        </button>
        <button className={`button ${activeTab === 'publish' ? 'button-primary' : ''}`} onClick={() => setActiveTab('publish')}>
          Publish Codes
        </button>
        <button className={`button ${activeTab === 'map' ? 'button-primary' : ''}`} onClick={() => setActiveTab('map')}>
          Map Upload
        </button>
        <button className={`button ${activeTab === 'latefound' ? 'button-primary' : ''}`} onClick={() => setActiveTab('latefound')}>
          Late Found
        </button>
        <button className={`button ${activeTab === 'settings' ? 'button-primary' : ''}`} onClick={() => setActiveTab('settings')}>
          Settings
        </button>
      </div>

      {activeTab === 'submissions' && (
        <section className="panel">
          <h2 style={{ marginBottom: '1rem' }}>Pending Submissions</h2>
          {pendingSubs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No pending submissions.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {pendingSubs.map(s => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)' }}>
                  <div>
                    <code style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{s.code}</code>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '1rem' }}>Day {s.day}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="button" style={{ color: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleReview(s.id, 'approve')}>Approve</button>
                    <button className="button" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => handleReview(s.id, 'deny')}>Deny</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'publish' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <section className="grid-2">
            <div className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h2 style={{ marginBottom: '0.5rem' }}>Manual Synchronization</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>Force a manual sync of codes from the external source.</p>
                </div>
                <button className="button button-primary" onClick={handleManualSync}>
                  Trigger Manual Sync
                </button>
              </div>
            </div>

            <div className="panel">
              <h2 style={{ marginBottom: '1rem' }}>Bulk Upload Codes</h2>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Target Day</label>
                <select className="input" value={bulkDay} onChange={e => setBulkDay(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>Day {d}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Codes (one per line)</label>
                <textarea
                  className="input"
                  style={{ height: '200px', resize: 'vertical', fontFamily: 'var(--font-mono)' }}
                  value={bulkCodes}
                  onChange={e => setBulkCodes(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX&#10;XXXX-XXXX-XXXX"
                />
              </div>
              <button className="button button-primary" onClick={handleBulkPublish}>Publish</button>
            </div>
          </section>

          <section className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ marginBottom: 0 }}>Day Overview</h2>
              <a href="/api/raw?day=all" target="_blank" rel="noreferrer" className="button">API raw (All)</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5, 6].map(d => (
                <div key={d} style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem' }}>
                    <span>Day {d}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginRight: '0.5rem' }}>{(data.days[String(d)] || []).length} codes</span>
                      <button className={`button ${rawViewDays[d] ? 'button-primary' : ''}`} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setRawViewDays(p => ({ ...p, [d]: !p[d] }))}>Raw</button>
                      <a href={`/api/raw?day=${d}`} target="_blank" rel="noreferrer" className="button" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>API raw</a>
                      <button className="button" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setViewingDay(viewingDay === d ? null : d)}>
                        {viewingDay === d ? 'Hide' : 'View'}
                      </button>
                      <button className="button button-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleClearDay(d)}>Clear</button>
                    </div>
                  </div>
                  {viewingDay === d && (
                    <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)', maxHeight: '300px', overflowY: 'auto' }}>
                      {(data.days[String(d)] || []).length === 0 ? (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No codes for this day.</p>
                      ) : rawViewDays[d] ? (
                        <textarea
                          readOnly
                          className="input"
                          style={{ width: '100%', height: '300px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '14px', lineHeight: '1.5' }}
                          value={(data.days[String(d)] || []).join('\n')}
                          onFocus={(e) => e.target.select()}
                        />
                      ) : (
                        (data.days[String(d)] || []).map(code => (
                          <div key={code} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            fontFamily: 'var(--font-mono)',
                            marginBottom: '0.5rem'
                          }}>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{code}</span>
                            <button
                              className="button button-danger"
                              style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                              onClick={() => handleDeleteCode(d, code)}
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'map' && (
        <section className="panel">
          <h2 style={{ marginBottom: '1rem' }}>Upload Map Image</h2>
          <form onSubmit={handleMapUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Target Day</label>
              <select name="day" className="input">
                {[1, 2, 3, 4, 5, 6].map(d => <option key={d} value={d}>Day {d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Image File (.png, .jpg)</label>
              <input type="file" name="file" accept="image/*" className="input" required />
            </div>
            <button type="submit" className="button button-primary">Upload Map</button>
          </form>
        </section>
      )}

      {activeTab === 'latefound' && (
        <section className="panel">
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginBottom: '0.25rem' }}>Late Found Codes</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
              Codes discovered after the puzzle was active. These show slightly brighter than missing slots on the map.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[1, 2, 3, 4, 5, 6].map(d => (
              <div key={d} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 600 }}>Day {d}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {(lateFoundEdits[d] || '').split('\n').filter(l => /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(l.trim())).length} codes
                  </span>
                </div>
                <textarea
                  className="input"
                  style={{ width: '100%', height: '120px', resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6', marginBottom: '0.75rem' }}
                  placeholder="XXXX-XXXX-XXXX (one per line)"
                  value={lateFoundEdits[d]}
                  onChange={e => setLateFoundEdits(prev => ({ ...prev, [d]: e.target.value }))}
                />
                <button
                  className="button button-primary"
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.9rem' }}
                  onClick={async () => {
                    const fd = new FormData();
                    fd.append('day', d);
                    fd.append('codes', lateFoundEdits[d]);
                    const res = await saveLateFound(fd);
                    if (res.success) {
                      alert(`Saved ${res.count} code(s) for Day ${d}`);
                      router.refresh();
                    } else {
                      alert('Save failed');
                    }
                  }}
                >
                  Save Day {d}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'settings' && (
        <section className="panel">
          <h2 style={{ marginBottom: '1rem' }}>System Settings</h2>

          <div style={{ marginBottom: '2rem' }}>
            <h3>Auto-Approval</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Automatically approve submissions on unlocked days.</p>
            <button
              className="button"
              style={{ borderColor: data.settings.autoApproval ? 'var(--success)' : 'var(--border)' }}
              onClick={async () => {
                await toggleSetting('autoApproval');
                router.refresh();
              }}
            >
              {data.settings.autoApproval ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div>
            <h3>Locked Days</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>Days marked as locked do not accept new submissions.</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map(d => {
                const isLocked = data.settings.lockedDays.includes(d);
                return (
                  <button
                    key={d}
                    className="button"
                    style={{ borderColor: isLocked ? 'var(--danger)' : 'var(--border)', color: isLocked ? 'var(--danger)' : 'var(--text)' }}
                    onClick={async () => {
                      setData(prev => {
                        const currentLocked = prev.settings.lockedDays;
                        const nextLocked = currentLocked.includes(d)
                          ? currentLocked.filter(day => day !== d)
                          : [...currentLocked, d];
                        return {
                          ...prev,
                          settings: { ...prev.settings, lockedDays: nextLocked }
                        };
                      });

                      await toggleLockedDay(d);
                      router.refresh();
                    }}
                  >
                    Day {d} {isLocked ? '(Locked)' : ''}
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
