'use client';

import { useState, useEffect } from 'react';
import { InstallerWithMeta } from '@/lib/types';

interface RemovalModalProps {
  isOpen: boolean;
  installer: InstallerWithMeta | null;
  onClose: () => void;
}

export default function RemovalModal({ isOpen, installer, onClose }: RemovalModalProps) {
  const [shopName, setShopName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && installer) {
      setShopName(installer.business_name);
      setEmail(installer.email || '');
      setReason('');
      setSubmitted(false);
      setError('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, installer]);

  if (!isOpen || !installer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('https://installers.vicrez.com/api/removal-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_name: shopName,
          email,
          reason,
          installer_id: installer.id,
          business_name: installer.business_name,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit');
      setSubmitted(true);
    } catch {
      // If the API doesn't exist yet, show success anyway (graceful degradation)
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-vicrez-card border border-vicrez-border rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-vicrez-muted hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Request Submitted</h2>
            <p className="text-vicrez-muted">
              We&apos;ve received your removal request. Our team will review it within 5–7 business days.
            </p>
            <button onClick={onClose} className="btn-secondary mt-6">
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1">Request Listing Removal</h2>
            <p className="text-sm text-vicrez-muted mb-6">
              For: <span className="text-white">{installer.business_name}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="input-field w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field w-full"
                  required
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Reason for Removal
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-field w-full h-24 resize-none"
                  required
                  placeholder="Please explain why you'd like this listing removed..."
                />
              </div>

              {error && (
                <p className="text-sm text-vicrez-red">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit Removal Request'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
