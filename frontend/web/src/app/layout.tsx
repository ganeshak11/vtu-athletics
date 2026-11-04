import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VTU SportsOS — Central Inter-Collegiate Athletics Platform',
  description: 'Official athletic management, accreditation, heat seeding, and real-time live scoring system for VTU athletic meets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
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
