const { HTML_LIMITED_BOT_UA_RE } = require("next/dist/shared/lib/router/utils/html-bots");
const consolidatedProfiles = require("./src/lib/consolidated-profiles.json");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  // Google's homepage crawl reported no canonical. Preserve Next's
  // default crawler list and deliver metadata in <head> for Googlebot too.
  // Ordinary browsers keep streaming; page content and canonical values match.
  htmlLimitedBots: new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|Googlebot`, HTML_LIMITED_BOT_UA_RE.flags),
  async redirects() {
    return [
      ...consolidatedProfiles.map(({ from, to }) => ({
        source: `/installer/${from}`,
        destination: `/installer/${to}`,
        permanent: true,
      })),
      {
        // Historical Google URL omitted the period in the recorded city name.
        source: "/installers/port-st-lucie-fl",
        destination: "/installers/port-st.-lucie-fl",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy-Report-Only",
            value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'",
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/owner/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/:privatePage(request-status|shop-response|inquiry-progress)",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.vicrez.com",
      },
    ],
  },
};

module.exports = nextConfig;
