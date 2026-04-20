import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lattice — fdl-create',
  description: 'Visual user-driven CMS + app-data platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
