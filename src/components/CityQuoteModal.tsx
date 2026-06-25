'use client';

import { useState, useEffect } from 'react';

interface CityQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationLabel: string;
}

const KIT_OPTIONS = [
  'Widebody Kit',
  'Fender Flares',
  'Hood',
  'Spoiler / Rear Wing',
  'Rear Diffuser',
  'Side Skirts',
  'Front Lip / Splitter',
  'Wheels & Tires',
  'Vinyl Wrap',
  'Paint Protection Film (PPF)',
  'Window Tint',
  'Steering Wheel',
  'Other',
];

const TIMELINE_OPTIONS = [
  'ASAP',
  '2-4 weeks',
  '1-3 months',
  'Just researching',
];

const BUDGET_OPTIONS = [
  'Under $1K',
  '$1-2.5K',
  '$2.5-5K',
  '$5K+',
  'Not sure yet',
];

export default function CityQuoteModal({ isOpen, onClose, locationLabel }: CityQuoteModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [kitInterest, setKitInterest] = useState('');
  const [installTimeline, setInstallTimeline] = useState('');
  const [budgetRange, setBudgetRange] = useState('');
  const [notes, setNotes] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setZipCode('');
      setVehicleYear('');
      setVehicleMake('');
      setVehicleModel('');
      setKitInterest('');
      setInstallTimeline('');
      setBudgetRange('');
      setNotes('');
      setWebsiteUrl('');
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
    if (websiteUrl) {
      // honeypot triggered — silently fake a success
      setSubmitted(true);
      return;
    }
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
          zip_code: zipCode,
          vehicle_year: vehicleYear,
          vehicle_make: vehicleMake,
          vehicle_model: vehicleModel,
          what_needed: kitInterest,
          install_timeline: installTimeline,
          budget_range: budgetRange,
          additional_notes: notes,
          how_heard: `installers.vicrez.com / ${locationLabel}`,
          // No installer_id / installer_email — backend will route to top-3 closest via RFQ webhook
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
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
          aria-label="Close"
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
            <h2 className="text-xl font-bold mb-2">Got It! We&apos;re Matching You With Installers</h2>
            <p className="text-vicrez-muted">
              We&apos;ve forwarded your request to verified installers near {locationLabel}.
              Expect a quote within 24 business hours via email or phone.
            </p>
            <button onClick={onClose} className="btn-secondary mt-6">
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-1">Get Matched With Installers</h2>
            <p className="text-sm text-vicrez-muted mb-6">
              Get free quotes from <span className="text-white">verified installers in {locationLabel}</span>.
              We&apos;ll match you with up to 3 shops near you.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot — hidden from users, bots will fill it */}
              <div style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, overflow: 'hidden' }} aria-hidden="true">
                <label>
                  Website (leave blank)
                  <input
                    type="text"
                    name="website_url"
                    tabIndex={-1}
                    autoComplete="off"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </label>
              </div>

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
                  minLength={2}
                  maxLength={80}
                  placeholder="John Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                    Phone *
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
                    Zip Code *
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="input-field w-full"
                    required
                    pattern="\d{5}"
                    maxLength={5}
                    placeholder="90210"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Email *
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
                    pattern="\d{4}"
                    maxLength={4}
                    placeholder="2024"
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
                    placeholder="Dodge"
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
                    placeholder="Charger"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  What do you want installed? *
                </label>
                <select
                  value={kitInterest}
                  onChange={(e) => setKitInterest(e.target.value)}
                  className="input-field w-full"
                  required
                >
                  <option value="">Select a category…</option>
                  {KIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                    Timeline
                  </label>
                  <select
                    value={installTimeline}
                    onChange={(e) => setInstallTimeline(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Select…</option>
                    {TIMELINE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                    Budget
                  </label>
                  <select
                    value={budgetRange}
                    onChange={(e) => setBudgetRange(e.target.value)}
                    className="input-field w-full"
                  >
                    <option value="">Select…</option>
                    {BUDGET_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-vicrez-muted mb-1 uppercase tracking-wider">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field w-full h-20 resize-none"
                  maxLength={500}
                  placeholder="Anything else we should know — specific parts, vehicle mods, deadlines…"
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
                {submitting ? 'Sending Request…' : 'Get Free Quotes'}
              </button>

              <p className="text-xs text-vicrez-muted text-center pt-1">
                We&apos;ll route your request to up to 3 verified installers near {locationLabel}. No spam, ever.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
