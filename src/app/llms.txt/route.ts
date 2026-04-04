export async function GET() {
  const content = `# Vicrez Installer Network
> Find professional installers for body kits, widebody kits, bumpers, wheels, tires, vinyl wrap, PPF, and aftermarket automotive parts across the United States.

## About
The Vicrez Installer Network is a directory of 13,000+ automotive installers across all 50 US states. Customers can search by zip code, city, or service type to find trusted shops near them.

## Key Pages
- Homepage & Search: https://installers.vicrez.com/
- Browse by State: https://installers.vicrez.com/directory
- Installation Guides: https://installers.vicrez.com/guides
- Apply to Join: https://installers.vicrez.com/apply

## Services Covered
- Body kit installation
- Widebody kit installation
- Vinyl wrap
- Paint Protection Film (PPF)
- Wheels & tires
- Carbon fiber parts
- Exhaust installation
- Suspension & coilovers
- Paint & bodywork

## Parent Company
Vicrez.com — Premier e-commerce for aftermarket automotive parts: body kits, carbon fiber, steering wheels, wheels, tires, vinyl wrap, PPF, and more.
- Main site: https://www.vicrez.com
- B2B wholesale: https://b2b.vicrez.com
`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}