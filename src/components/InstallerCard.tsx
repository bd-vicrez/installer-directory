'use client';

import { InstallerWithMeta } from '@/lib/types';
import { formatPhone, formatDistance } from '@/lib/utils';
import StarRating from './StarRating';

interface InstallerCardProps {
  installer: InstallerWithMeta;
  onClaimClick: () => void;
  onRemovalClick: (installer: InstallerWithMeta) => void;
}

export default function InstallerCard({ installer, onClaimClick, onRemovalClick }: InstallerCardProps) {
  const isVerified = installer.tier === 'verified';

  return (
    <div className={`card relative ${isVerified ? 'border-green-500/30' : ''}`}>
      {/* Tier badge */}
      <div className={`px-4 py-2 flex items-center gap-2 text-xs font-medium ${
        isVerified
          ? 'bg-green-500/10 text-green-400 border-b border-green-500/20'
          : 'bg-vicrez-card text-vicrez-muted border-b border-vicrez-border'
      }`}>
        {isVerified ? (
          <>
            <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified Vicrez Installer
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-vicrez-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Suggested Local Installer
          </>
        )}
        {installer.distance !== null && (
          <span className="ml-auto text-xs font-semibold whitespace-nowrap">
            {formatDistance(installer.distance)}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {/* Business name */}
        <h3 className="text-lg font-bold text-white leading-tight">{installer.business_name}</h3>

        {/* Rating */}
        <StarRating rating={installer.rating} />

        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-gray-300">
          <svg className="w-4 h-4 text-vicrez-muted mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>
            {installer.street_address && `${installer.street_address}, `}
            {installer.city}, {installer.state} {installer.zip_code}
          </span>
        </div>

        {/* Phone */}
        {installer.phone && (
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-vicrez-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a href={`tel:${installer.phone}`} className="text-vicrez-red hover:underline">
              {formatPhone(installer.phone)}
            </a>
          </div>
        )}

        {/* Capabilities */}
        {installer.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {installer.capabilities.slice(0, 5).map((cap, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-vicrez-dark border border-vicrez-border text-gray-400"
              >
                {cap}
              </span>
            ))}
            {installer.capabilities.length > 5 && (
              <span className="text-xs px-2 py-1 text-vicrez-muted">
                +{installer.capabilities.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-4 pb-4 pt-2 border-t border-vicrez-border space-y-2">
        {/* Directions & Website buttons */}
        <div className="flex gap-2">
          {installer.lat && installer.lng && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${installer.lat},${installer.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs flex-1 text-center flex items-center justify-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Directions
            </a>
          )}
          {installer.website && (
            <a
              href={installer.website.startsWith('http') ? installer.website : `https://${installer.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs flex-1 text-center"
            >
              Website
            </a>
          )}
        </div>

        {/* Claim listing (Listed only) */}
        {!isVerified && (
          <div className="flex items-center justify-between">
            <button
              onClick={onClaimClick}
              className="text-xs font-medium text-vicrez-red hover:text-white transition-colors"
            >
              ✦ Claim This Listing
            </button>
            <button
              onClick={() => onRemovalClick(installer)}
              className="text-[10px] text-vicrez-muted hover:text-gray-400 transition-colors underline"
            >
              Request Removal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
