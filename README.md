# Vicrez Installer Directory v2

Enhanced nationwide installer directory for [installers.vicrez.com](https://installers.vicrez.com).

## Features

- **Tier System**: Verified Vicrez Installers (green badge, priority placement) vs. Suggested Local Installers
- **Zip Code Search**: Distance-based search using Haversine formula + zippopotam.us geocoding
- **Smart Filters**: By specialty (Body Kits, Paint, Wraps, Performance, Wheels), tier, and radius
- **Claim Listing CTA**: Drives Listed installers to b2b.vicrez.com for dealer signup
- **Removal Requests**: FTC-compliant opt-out flow for listed businesses
- **Dark Theme**: Matches vicrez.com aesthetic (black/gray/red #e31937)
- **Responsive**: Mobile-first grid layout
- **SEO**: Open Graph tags, semantic HTML

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- TypeScript
- Vercel-ready

## Deploy

```bash
npm install
npm run build
# or push to Vercel
vercel --prod
```

## API

- Fetches from `https://installers.vicrez.com/api/installers`
- Local removal request endpoint: `POST /api/removal-request`

## Tier Classification

| Tier | Source Keywords |
|------|---------------|
| Verified | `[New Dealer Form]`, `[CS Sheet]`, `[Vicrez Business Network]`, `Alex Cold Call`, `manual` |
| Listed | Everything else (primarily `Google Maps Directory`) |
