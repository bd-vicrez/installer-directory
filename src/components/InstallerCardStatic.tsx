import { Installer } from '@/lib/types';
import { getTier, parseRating, parseCapabilities, formatPhone } from '@/lib/utils';

interface InstallerCardStaticProps {
  installer: Installer;
}

export default function InstallerCardStatic({ installer }: InstallerCardStaticProps) {
  const tier = getTier(installer.source);
  const isVerified = tier === 'verified';
  const rating = parseRating(installer.internal_notes);
  const capabilities = parseCapabilities(installer.install_capabilities);

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
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.55 18.5L3.85 12.8L5.275 11.375L9.55 15.65L18.725 6.475L20.15 7.9L9.55 18.5Z" fill="white"/>
              <path d="M12 1L14.7 3.3H18.4L19 7L22 9.5L20.7 13L22 16.5L19 19L18.4 22.7H14.7L12 25L9.3 22.7H5.6L5 19L2 16.5L3.3 13L2 9.5L5 7L5.6 3.3H9.3L12 1Z" fill="#1DA1F2" transform="scale(0.88) translate(1.5, 1.5)"/>
              <path d="M9.55 18.5L3.85 12.8L5.275 11.375L9.55 15.65L18.725 6.475L20.15 7.9L9.55 18.5Z" fill="white" transform="scale(0.7) translate(5, 4.5)"/>
            </svg>
            Verified Vicrez Installer
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-vicrez-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Listed Installer
          </>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        <h3 className="text-lg font-bold text-white leading-tight">{installer.business_name}</h3>

        {/* Rating */}
        {rating && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className={`w-4 h-4 ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="text-sm text-vicrez-muted ml-1">{rating}/5</span>
          </div>
        )}

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
        {capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {capabilities.slice(0, 5).map((cap, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 rounded-full bg-vicrez-dark border border-vicrez-border text-gray-400"
              >
                {cap}
              </span>
            ))}
            {capabilities.length > 5 && (
              <span className="text-xs px-2 py-1 text-vicrez-muted">
                +{capabilities.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-4 pb-4 pt-2 border-t border-vicrez-border">
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
      </div>
    </div>
  );
}
