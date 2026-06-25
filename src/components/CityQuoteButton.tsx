'use client';

import { useState } from 'react';
import CityQuoteModal from './CityQuoteModal';

interface Props {
  locationLabel: string;
  variant?: 'banner' | 'inline';
}

export default function CityQuoteButton({ locationLabel, variant = 'banner' }: Props) {
  const [open, setOpen] = useState(false);

  if (variant === 'banner') {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="block w-full mb-8 bg-gradient-to-r from-vicrez-red to-red-700 rounded-xl p-6 text-center hover:from-vicrez-red-dark hover:to-red-800 transition-all cursor-pointer"
        >
          <p className="text-lg font-bold text-white">🔧 Get Free Install Quotes in {locationLabel}</p>
          <p className="text-sm text-white/80 mt-1">
            Tell us your vehicle & what you want installed — we&apos;ll match you with verified shops near you within 24 hours.
          </p>
        </button>
        <CityQuoteModal
          isOpen={open}
          onClose={() => setOpen(false)}
          locationLabel={locationLabel}
        />
      </>
    );
  }

  // inline
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary w-full text-center text-lg py-3"
      >
        Get Free Install Quotes
      </button>
      <CityQuoteModal
        isOpen={open}
        onClose={() => setOpen(false)}
        locationLabel={locationLabel}
      />
    </>
  );
}
