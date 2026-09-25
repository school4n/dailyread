'use client';

// PWA Service Worker Registration
// src/components/PWAProvider.tsx

import { useEffect } from 'react';

export function PWAProvider() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[PWA] Service worker registered:', registration.scope);
        })
        .catch((error) => {
          console.warn('[PWA] Service worker registration failed:', error);
        });
    }
  }, []);
  
  return null;
}
