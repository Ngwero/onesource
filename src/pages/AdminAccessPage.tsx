import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { PageContainer } from '../components/PageContainer';

export function AdminAccessPage() {
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) throw new Error('Please sign in again.');
      const api = import.meta.env.VITE_API_URL || '/api';
      const response = await fetch(`${api}/admin/session`, {
        method: 'POST', credentials: 'include',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Unable to open the admin panel.');
      }
      if (!cancelled) window.location.assign(new URL('/admin', new URL(api, window.location.href)).href);
    })().catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);
  return <PageContainer className="py-16 text-center">
    <h1 className="text-2xl font-bold">Admin access</h1>
    <p role={error ? 'alert' : 'status'} className="my-4">{error || 'Opening your admin panel…'}</p>
    <Link to="/account" className="btn-primary">Back to account</Link>
  </PageContainer>;
}
