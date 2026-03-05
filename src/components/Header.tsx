'use client';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-vicrez-dark/95 backdrop-blur-md border-b border-vicrez-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href="https://www.vicrez.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
          <img
            src="https://www.vicrez.com/image/catalog/vicrez-logo-white-web.png"
            alt="Vicrez"
            className="h-8 w-auto"
          />
        </a>
        <nav className="flex items-center gap-4">
          <a
            href="https://www.vicrez.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-vicrez-muted hover:text-white transition-colors"
          >
            Shop Vicrez
          </a>
          <a
            href="https://b2b.vicrez.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm !px-4 !py-2"
          >
            Become a Dealer
          </a>
        </nav>
      </div>
    </header>
  );
}
