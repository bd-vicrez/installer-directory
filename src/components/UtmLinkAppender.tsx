'use client';

/**
 * Global UTM appender.
 * On every route change, scans the DOM for outbound links to *.vicrez.com (excluding the installer
 * directory subdomain itself) and appends UTM params describing the source installer page.
 *
 * utm_source=installers
 * utm_medium=<page-type>          (home | state | city | combo | installer_detail | guide | apply | directory | other)
 * utm_campaign=<page-slug>        (sanitized pathname)
 * utm_content=<link-anchor-text>  (lowercased, max 40 chars, dashed)
 *
 * Preserves existing UTM params if a link already has them.
 * Mutates href in-place so a real browser click attributes correctly in GA4.
 */
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const VICREZ_HOST_RE = /^https?:\/\/((www|b2b|shop|driver|drive|stage)\.)?vicrez\.com(\/|$|\?|#)/i;

function classifyPage(pathname: string): string {
  if (!pathname || pathname === '/') return 'home';
  if (pathname === '/directory') return 'directory';
  if (pathname.startsWith('/guides')) return 'guide';
  if (pathname.startsWith('/apply')) return 'apply';
  if (pathname.startsWith('/installer/')) return 'installer_detail';
  if (pathname.startsWith('/installers/category/')) return 'category';
  if (/^\/installers\/[^/]+\/[^/]+$/.test(pathname)) return 'combo'; // city+service
  if (/^\/installers\/[^/]+$/.test(pathname)) {
    // state slug = long, city slug includes -<state-abbr> at end
    return 'location';
  }
  return 'other';
}

function pageSlug(pathname: string): string {
  return (pathname || '/').replace(/^\//, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'home';
}

function anchorContent(el: HTMLAnchorElement): string {
  const text = (el.textContent || '').trim().toLowerCase();
  if (!text) return '';
  return text
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

function appendUtm(href: string, params: Record<string, string>): string {
  try {
    const u = new URL(href);
    for (const [k, v] of Object.entries(params)) {
      if (!v) continue;
      if (!u.searchParams.has(k)) {
        u.searchParams.set(k, v);
      }
    }
    return u.toString();
  } catch {
    return href;
  }
}

export default function UtmLinkAppender() {
  const pathname = usePathname();

  useEffect(() => {
    const medium = classifyPage(pathname || '/');
    const campaign = pageSlug(pathname || '/');

    const links = document.querySelectorAll('a[href]');
    links.forEach((node) => {
      const el = node as HTMLAnchorElement;
      const raw = el.getAttribute('href') || '';
      if (!VICREZ_HOST_RE.test(raw)) return;
      // Skip tel:, mailto:, hash, relative
      if (raw.startsWith('tel:') || raw.startsWith('mailto:') || raw.startsWith('#')) return;

      const content = anchorContent(el);
      const newHref = appendUtm(raw, {
        utm_source: 'installers',
        utm_medium: medium,
        utm_campaign: campaign,
        utm_content: content,
      });
      if (newHref !== raw) {
        el.setAttribute('href', newHref);
        el.dataset.utmTagged = '1';
      }
    });
  }, [pathname]);

  return null;
}
