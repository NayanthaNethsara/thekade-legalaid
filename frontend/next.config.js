/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    // allow loading background images from Unsplash used in the hero
    domains: ["images.unsplash.com"],
  },
};

module.exports = nextConfig;
