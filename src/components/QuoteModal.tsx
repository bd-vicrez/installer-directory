'use client';

import { useState, useEffect } from 'react';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  installer: {
    id: string;
    business_name: string;
    city: string;
    state: string;
    email: string;
    phone: string;
  };
}

export default function QuoteModal({ isOpen, onClose, installer }: QuoteModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [whatNeeded, setWhatNeeded] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setVehicleYear('');
      setVehicleMake('');
      setVehicleModel('');
      setWhatNeeded('');
      setAdditionalNotes('');
      setSubmitted(false);
      setError('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          vehicle_year: vehicleYear,
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          what_needed: whatNeeded,
          additional_notes: additionalNotes,
          installer_id: installer.id,
          installer_business_name: installer.business_name,
          installer_email: installer.email,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to submit');
      }
      
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-vicrez-card border border-vicrez-border rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
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
            <h2 className="text-xl font-bold mb-2">Quote Request Sent!</h2>
            <p className="text-vicrez-muted">
              Your quote request has been sent to {installer.business_name}! They&apos;ll contact you within 24-48 hours.
            </p>
            <button onClick={onClose} className="btn-secondary mt-6">
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1">Request a Quote</h2>
            <p className="text-sm text-vicrez-muted mb-6">
              From: <span className="text-white">{installer.business_name}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="input-field w-full"
                  required
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Your Phone *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="input-field w-full"
                  required
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Your Email *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="input-field w-full"
                  required
                  placeholder="john@email.com"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                    Year *
                  </label>
                  <input
                    type="text"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    className="input-field w-full"
                    required
                    placeholder="2023"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                    Make *
                  </label>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className="input-field w-full"
                    required
                    placeholder="BMW"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="input-field w-full"
                    required
                    placeholder="M3"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  What do you need installed? *
                </label>
                <textarea
                  value={whatNeeded}
                  onChange={(e) => setWhatNeeded(e.target.value)}
                  className="input-field w-full h-24 resize-none"
                  required
                  placeholder="e.g., Widebody kit, rear diffuser, vinyl wrap..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Additional Notes
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="input-field w-full h-20 resize-none"
                  placeholder="Any additional details or requirements..."
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
                {submitting ? 'Sending Request…' : 'Send Quote Request'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}