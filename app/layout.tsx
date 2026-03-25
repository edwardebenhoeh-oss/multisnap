import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MultiSnap — Turn One Room Photo Into Ready-to-Post Listings',
  description:
    'AI detects, crops, identifies, prices, and writes listings for everything in your photo. ' +
    'Scan a room. Get eBay-ready listings in seconds.',
  keywords: ['resale listings', 'AI item detection', 'eBay listing generator', 'room scanner', 'marketplace helper'],
  openGraph: {
    title: 'MultiSnap — Turn One Room Photo Into Ready-to-Post Listings',
    description: 'AI detects, crops, identifies, prices, and writes listings for everything in your photo.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
