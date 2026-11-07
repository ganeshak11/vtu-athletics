import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, BRAND_COLOR } from '@/lib/site';

// Icons come from app/favicon.ico, app/icon.svg and app/apple-icon.png (Next.js file conventions);
// the web-app manifest from app/manifest.ts.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Dr. ACS-AURA 2026',
    'ACS AURA',
    'VTU athletic meet 2026',
    'VTU 28th inter-collegiate athletic meet',
    'VTU state level athletics',
    'Visvesvaraya Technological University sports',
    'Dr. ACS College of Engineering',
    'ACSCE Bengaluru',
    'inter-collegiate athletics Karnataka',
    'VTU sports registration',
  ],
  authors: [{ name: 'Dr. ACS College of Engineering, Bengaluru' }],
  publisher: 'Dr. ACS College of Engineering, Bengaluru',
  category: 'sports',
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_IN',
    images: [
      {
        url: '/banner.jpeg',
        width: 1200,
        height: 628,
        alt: 'Dr. ACS-AURA 2026 — VTU’s 28th Inter-Collegiate State Level Athletic Meet, 7–10 December 2026',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/banner.jpeg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  formatDetection: { telephone: false },
};

// Zoom is allowed (no maximum-scale) — blocking it hurts accessibility and Lighthouse/SEO scores.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND_COLOR,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Playfair+Display:wght@600;700;800&family=Audiowide&family=Outfit:wght@400;600;700;800;900&family=Inter:wght@400;600;700&display=swap"
        />
      </head>
      <body>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
