import { generateBreadcrumbJsonLd } from '@/lib/seo';

interface BreadcrumbItem {
  name: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems = [{ name: 'Home', href: '/' }, ...items];
  const jsonLd = generateBreadcrumbJsonLd(
    allItems.map((item) => ({ name: item.name, url: `https://installers.vicrez.com${item.href}` }))
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm text-vicrez-muted mb-6">
        <ol className="flex flex-wrap items-center gap-1">
          {allItems.map((item, i) => (
            <li key={item.href} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1">/</span>}
              {i < allItems.length - 1 ? (
                <a href={item.href} className="hover:text-white transition-colors">
                  {item.name}
                </a>
              ) : (
                <span className="text-gray-400">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
