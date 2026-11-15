import './globals.css';
import { Inter, Fraunces } from 'next/font/google';
import NavBar from '@/components/NavBar';
import RegisterServiceWorker from '@/components/RegisterServiceWorker';

// Fonts are built into Next.js (next/font) - no extra package needed.
// Inter = clean body text, Fraunces = elegant serif for headings.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });

// Page title + PWA settings (manifest = what makes it installable as an app).
export const metadata = {
  title: 'Mini Marketplace',
  description: 'Demo multi-vendor marketplace',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Marketplace', statusBarStyle: 'default' },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
};

// width=device-width makes the layout fit phone screens properly.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#23201c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        {/* Honest demo notice instead of a fake promo banner */}
        <div className="bg-ink text-white text-xs text-center py-2 px-4">
          Demo marketplace · sample products · no real payments
        </div>
        <NavBar />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="border-t border-line mt-12 py-8 text-center text-sm text-muted">
          Mini Marketplace · built for an MVP skills test
        </footer>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
