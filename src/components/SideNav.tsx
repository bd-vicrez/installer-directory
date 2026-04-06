'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

interface NavItem {
  emoji: string;
  label: string;
  href: string;
  external?: boolean;
}

const navItems: NavItem[] = [
  { emoji: '🔍', label: 'Find an Installer', href: '/' },
  { emoji: '📍', label: 'Browse by State', href: '/directory' },
  { emoji: '📖', label: 'Installation Guides', href: '/guides' },
  { emoji: '🏪', label: 'List Your Shop', href: '/apply' },
  { emoji: '🛒', label: 'Shop Vicrez.com', href: 'https://www.vicrez.com', external: true },
  { emoji: '🤝', label: 'Become a Dealer (B2B)', href: 'https://b2b.vicrez.com', external: true },
  { emoji: '📧', label: 'Contact Us', href: 'https://www.vicrez.com/contact-us', external: true },
];

export default function SideNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      <div ref={navRef} className="fixed left-0 top-1/2 -translate-y-1/2 z-40">
        {/* Collapsed tab trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center
            w-10 h-10 rounded-r-lg shadow-lg transition-all duration-300 ease-in-out
            bg-[#1a1a2e] text-white hover:bg-[#E31937] hover:w-12
            ${isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}
            md:w-10 md:h-10`}
          aria-label="Open navigation menu"
          title="Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Expanded panel */}
        <nav
          className={`absolute left-0 top-1/2 -translate-y-1/2 
            bg-[#1a1a2e] rounded-r-xl shadow-2xl overflow-hidden
            transition-all duration-300 ease-in-out origin-left
            ${isOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4'}
          `}
          role="navigation"
          aria-label="Side navigation"
        >
          <div className="w-64">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white/90 font-semibold text-sm tracking-wide uppercase">
                Navigation
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/50 hover:text-white transition-colors p-1"
                aria-label="Close navigation menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav items */}
            <ul className="py-2">
              {navItems.map((item) => {
                const active = !item.external && isActive(item.href);
                const linkProps = item.external
                  ? { target: '_blank' as const, rel: 'noopener noreferrer' }
                  : {};

                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      {...linkProps}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200
                        ${
                          active
                            ? 'bg-[#E31937]/20 text-[#E31937] border-l-2 border-[#E31937] font-medium'
                            : 'text-white/80 hover:bg-white/10 hover:text-[#E31937] border-l-2 border-transparent'
                        }
                      `}
                    >
                      <span className="text-base flex-shrink-0">{item.emoji}</span>
                      <span className="truncate">{item.label}</span>
                      {item.external && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 ml-auto flex-shrink-0 opacity-40"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/10">
              <p className="text-[10px] text-white/30 uppercase tracking-wider">
                Vicrez Installer Network
              </p>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
}
