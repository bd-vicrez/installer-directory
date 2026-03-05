'use client';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-vicrez-border bg-vicrez-dark mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <img
              src="https://www.vicrez.com/image/catalog/vicrez-logo-white-web.png"
              alt="Vicrez"
              className="h-8 w-auto mb-4"
            />
            <p className="text-sm text-vicrez-muted">
              Premium automotive aftermarket parts. Body kits, carbon fiber accessories,
              custom steering wheels, and more.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-400">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://www.vicrez.com" target="_blank" rel="noopener noreferrer" className="text-vicrez-muted hover:text-white transition-colors">
                  Shop Vicrez.com
                </a>
              </li>
              <li>
                <a href="https://b2b.vicrez.com" target="_blank" rel="noopener noreferrer" className="text-vicrez-muted hover:text-white transition-colors">
                  Become a Dealer (B2B)
                </a>
              </li>
              <li>
                <a href="https://www.vicrez.com/contact-us" target="_blank" rel="noopener noreferrer" className="text-vicrez-muted hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-gray-400">Legal</h4>
            <p className="text-xs text-vicrez-muted leading-relaxed">
              Listed businesses are sourced from publicly available information and do not imply
              endorsement by or affiliation with Vicrez. Verified installers have been confirmed through
              our dealer network. To request removal, click &quot;Request Removal&quot; on your listing.
            </p>
          </div>
        </div>

        <div className="border-t border-vicrez-border mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-vicrez-muted">
            © {year} Vicrez. All rights reserved. This directory is provided for informational purposes only.
          </p>
          <p className="text-xs text-vicrez-muted">
            <a href="https://www.vicrez.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            {' · '}
            <a href="https://www.vicrez.com/terms" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
