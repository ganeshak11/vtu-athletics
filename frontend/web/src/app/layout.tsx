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
      </head>
      <body>
        <main id="main-content">
          {children}
        </main>
      </body>
    </html>
  );
}
