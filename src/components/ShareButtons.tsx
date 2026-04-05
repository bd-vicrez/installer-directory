'use client';

import { useState } from 'react';

interface Props {
  url: string;
  businessName: string;
}

export default function ShareButtons({ url, businessName }: Props) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareOnFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = () => {
    const text = `Check out ${businessName} on the Vicrez Installer Network`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Share This Profile</h2>
      
      <div className="flex items-center gap-3">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-vicrez-card hover:bg-vicrez-muted/10 border border-vicrez-border hover:border-vicrez-muted/30 rounded-lg transition-colors text-sm"
          title="Copy link"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-vicrez-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-vicrez-muted">Copy Link</span>
            </>
          )}
        </button>
        
        <button
          onClick={shareOnFacebook}
          className="flex items-center gap-2 px-4 py-2 bg-vicrez-card hover:bg-blue-600/10 border border-vicrez-border hover:border-blue-600/30 rounded-lg transition-colors text-sm group"
          title="Share on Facebook"
        >
          <svg className="w-4 h-4 text-vicrez-muted group-hover:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="text-vicrez-muted group-hover:text-blue-400">Facebook</span>
        </button>
        
        <button
          onClick={shareOnTwitter}
          className="flex items-center gap-2 px-4 py-2 bg-vicrez-card hover:bg-blue-400/10 border border-vicrez-border hover:border-blue-400/30 rounded-lg transition-colors text-sm group"
          title="Share on X/Twitter"
        >
          <svg className="w-4 h-4 text-vicrez-muted group-hover:text-blue-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-vicrez-muted group-hover:text-blue-300">X (Twitter)</span>
        </button>
      </div>
    </div>
  );
}