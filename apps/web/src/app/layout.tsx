import type { Metadata } from 'next';
import { Instrument_Serif } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from '@/components/ui/toaster';
import { Grain } from '@/components/grain';
import { SignInDialog } from '@/components/sign-in-dialog';

const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prediqt — Bet on anything, privately',
  description:
    'A private prediction market with rooms, AI agents, and confidential bets. Powered by Zama FHE.',
  metadataBase: new URL('https://prediqt.app'),
  openGraph: {
    title: 'Prediqt',
    description: 'Bet on anything, with anyone — privately. Powered by Zama FHE.',
    type: 'website',
  },
  icons: { icon: '/favicon.svg' },
};

export const viewport = {
  themeColor: '#07070A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body
        style={
          {
            '--font-display': display.style.fontFamily,
            '--font-sans': GeistSans.style.fontFamily,
            '--font-mono': GeistMono.style.fontFamily,
          } as React.CSSProperties
        }
      >
        <AuthProvider>
          {children}
          <SignInDialog />
          <Toaster />
        </AuthProvider>
        <Grain />
      </body>
    </html>
  );
}
