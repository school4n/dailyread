// Next.js configuration
// next.config.ts

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Cloudflare
  output: 'standalone',
  
  // Image optimization - allow external sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "font-src 'self' fonts.gstatic.com",
              "img-src 'self' data: https: http:",
              "connect-src 'self' https:",
              "frame-src 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ];
  },
  
  // Rewrites to proxy API to Cloudflare Worker in production
  async rewrites() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || '';
    if (apiUrl && process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
      ];
    }
    return [];
  },
  
  // Environment variables exposed to client
  env: {
    NEXT_PUBLIC_SITE_NAME: 'DailyRead',
  },
  
  // Experimental features
  experimental: {
    // Enable PPR for faster initial loads
  },
};

export default nextConfig;
