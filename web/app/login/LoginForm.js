'use client';

import { useState } from 'react';
import { login } from '../actions';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    const res = await login(formData);

    if (res.success) {
      router.push('/admin');
      router.refresh();
    } else {
      setError(res.error || 'Invalid login');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Password</label>
        <input 
          type="password" 
          name="password" 
          className="input" 
          placeholder="••••••••" 
          required 
          disabled={loading}
        />
      </div>
      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.875rem', textAlign: 'center' }}>
          {error}
        </div>
      )}
      <button 
        type="submit" 
        className="button button-primary" 
        style={{ width: '100%' }}
        disabled={loading}
      >
        {loading ? 'Verifying...' : 'Sign in'}
      </button>
    </form>
  );
}
