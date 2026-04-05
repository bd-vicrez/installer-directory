'use client';

import { useState } from 'react';
import QuoteModal from './QuoteModal';

interface Props {
  installer: {
    id: string;
    business_name: string;
    city: string;
    state: string;
    email: string;
    phone: string;
  };
}

export default function QuoteButton({ installer }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-primary w-full text-center text-lg py-3"
      >
        Request a Quote
      </button>
      <QuoteModal 
        isOpen={open} 
        onClose={() => setOpen(false)} 
        installer={installer} 
      />
    </>
  );
}