"use client";
import { useState } from "react";
import AccessibleDialog from "./AccessibleDialog";
const links = [
  ["Find an Installer", "/"],
  ["How It Works", "/how-it-works"],
  ["For Shops", "/for-shops"],
];
export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <a href="/" aria-label="Vicrez Installer Network home">
          <img
            src="https://d19eqr9piwa4et.cloudfront.net/catalog/vicrez-logo-white-web.png"
            alt="Vicrez"
            className="h-7 w-auto brightness-0"
          />
        </a>
        <nav
          aria-label="Main navigation"
          className="hidden sm:flex items-center gap-5 text-sm font-medium"
        >
          {links.map(([label, url]) => (
            <a key={url} className="py-3 hover:underline" href={url}>
              {label}
            </a>
          ))}
        </nav>
        <button
          className="sm:hidden border rounded-lg px-4 py-2"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          Menu
        </button>
      </div>
      <AccessibleDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Navigation"
      >
        <nav aria-label="Mobile navigation" className="flex flex-col gap-2">
          {[
            ...links,
            ["List Your Shop", "/apply"],
            ["Claim / Update a Listing", "/claim"],
          ].map(([label, url]) => (
            <a key={url} className="p-3 rounded-lg border" href={url}>
              {label}
            </a>
          ))}
        </nav>
      </AccessibleDialog>
    </header>
  );
}
