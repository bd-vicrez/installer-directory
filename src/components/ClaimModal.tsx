'use client';

import { useEffect } from 'react';

interface ClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimModal({ isOpen, onClose }: ClaimModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

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

        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-vicrez-red/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-vicrez-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold mb-2">Claim Your Listing</h2>
          <p className="text-vicrez-muted mb-6">
            Want priority placement, a verified badge, and a dealer account?
            Sign up for the Vicrez Business Network.
          </p>

          <a
            href="https://b2b.vicrez.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-block w-full text-center text-lg"
          >
            Sign Up at b2b.vicrez.com
          </a>

          <p className="text-xs text-vicrez-muted mt-4">
            Get wholesale pricing, marketing support, and verified status in our installer directory.
          </p>
        </div>
      </div>
    </div>
  );
}
