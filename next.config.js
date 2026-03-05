/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.vicrez.com',
      },
    ],
  },
};

module.exports = nextConfig;
