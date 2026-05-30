import type { Metadata } from 'next';
import SessionProviderWrapper from '@/components/SessionProviderWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScholarLab — Paper Match',
  description: 'Precision academic discovery',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
