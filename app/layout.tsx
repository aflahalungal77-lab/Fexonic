import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fexonic — QR Restaurant Ordering',
  description: 'QR menu, table ordering and kitchen management for restaurants.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
