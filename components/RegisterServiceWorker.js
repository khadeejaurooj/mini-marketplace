'use client';
// Registers public/sw.js. Browsers need a service worker (plus the manifest)
// before they offer "Install app" / "Add to Home Screen".
import { useEffect } from 'react';

export default function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);
  return null;
}
