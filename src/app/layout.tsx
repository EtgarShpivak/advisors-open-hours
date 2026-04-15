import type { Metadata } from 'next';
import './globals.css';

const OG_IMAGE = 'https://v3b.fal.media/files/b/0a962fe6/LmZLdWrZCVXQA_kbRpW-e.jpg';

export const metadata: Metadata = {
  title: 'Advisors Office Hours - Free GTM Consulting for Israeli Startups',
  description:
    '21 senior GTM and revenue marketing leaders give one hour of their time, free of charge. We want to help Israeli startups grow.',
  metadataBase: new URL('https://advisorsofficehours.com'),
  openGraph: {
    type: 'website',
    url: 'https://advisorsofficehours.com',
    siteName: 'Advisors Office Hours',
    title: 'Advisors Office Hours 🇮🇱',
    description: '12 senior GTM & marketing leaders giving one free hour to Israeli startups. Pro-bono, by choice.',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'Advisors Office Hours' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Advisors Office Hours 🇮🇱',
    description: '12 senior GTM & marketing leaders giving one free hour to Israeli startups. Pro-bono, by choice.',
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* DNS/connection warm-up */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* Warm up Supabase CDN for advisor photos */}
        <link rel="preconnect" href="https://tnefulukqttzfytkqdpa.supabase.co" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://tnefulukqttzfytkqdpa.supabase.co" />
        {/* Preload the two most-visible font weights before stylesheet parses */}
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgEM86xRbAg.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* Full font stylesheet — non-render-blocking because preloads above already started */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=optional"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
