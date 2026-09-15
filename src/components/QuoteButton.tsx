'use client';

import { useState } from 'react';
import QuoteModal from './QuoteModal';

interface Props {
  available: boolean;
  installer: {
    id: string;
    business_name: string;
    city: string;
    state: string;
    phone: string;
  };
}

export default function QuoteButton({ installer, available }: Props) {
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(!available);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  async function openQuote() {
    if (checking) return;
    setChecking(true); setError('');
    try {
      const response = await fetch('/api/quote-availability?id=' + encodeURIComponent(installer.id), { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const result = await response.json();
      if (result.available !== true) { setUnavailable(true); return; }
      setOpen(true);
    } catch { setError('We could not check this shop’s online contact option. Please retry or use its phone or website.'); }
    finally { setChecking(false); }
  }
  if (unavailable) return <section className="card p-5" aria-label="Quote availability">
    <h2 className="font-semibold text-gray-900">Contact this shop directly</h2>
    <p className="text-sm text-gray-700 mt-2">This shop does not currently receive quote requests through Vicrez. Use its available phone or website contact options.</p>
    <a className="text-vicrez-red underline inline-block mt-3" href={'/?q=' + encodeURIComponent(installer.city + ', ' + installer.state) + '#results'}>Find another installer</a>
  </section>;

  return (
    <>
      <button
        onClick={openQuote} aria-disabled={checking} aria-haspopup="dialog"
        className="btn-primary w-full text-center text-lg py-3"
      >
        {checking ? 'Checking contact availability…' : 'Request a Quote'}
      </button>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <QuoteModal 
        isOpen={open} 
        onClose={() => setOpen(false)} 
        installer={installer} 
      />
    </>
  );
}
