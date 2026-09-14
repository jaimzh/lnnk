import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import { HeroProvider } from "@/context/HeroContext";
import BrownianParticles from "@/components/animations/brownian-particles";
import Preloader from "@/components/shared/preloader";

const ubuntu = Ubuntu({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-ubuntu",
});

const SITE_INFO = {
  title: "LNNK | Custom URL Shortener & CDN Link Hosting",
  description:
    "Create custom short links and fast CDN asset links with LNNK. Shorten URLs, host shareable files, track clicks, and manage branded links.",
  url: "https://lnnk.click",
  image: "https://lnnk.click/lnnk-wide.png",
};

export const metadata: Metadata = {
  applicationName: "LNNK",
  title: {
    default: SITE_INFO.title,
    template: `%s | LNNK`,
  },
  description: SITE_INFO.description,
  keywords: [
    "URL shortener",
    "link shortener",
    "custom URL shortener",
    "branded links",
    "custom short links",
    "CDN",
    "custom CDN",
    "CDN link hosting",
    "CDN file hosting",
    "asset CDN links",
    "image CDN links",
    "file sharing links",
    "LNNK",
    "lnnk.click",
    "cdn.lnnk.click",
    "short links",
    "link management",
    "marketing tools",
  ],
  authors: [{ name: "LNNK Team" }],
  creator: "LNNK",
  publisher: "LNNK",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_INFO.url),
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    title: "LNNK",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: SITE_INFO.title,
    description: SITE_INFO.description,
    url: SITE_INFO.url,
    siteName: "LNNK",
    images: [
      {
        url: SITE_INFO.image,
        width: 1200,
        height: 630,
        alt: "LNNK custom URL shortener and CDN link hosting",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_INFO.title,
    description: SITE_INFO.description,
    images: [SITE_INFO.image],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${ubuntu.variable} font-sans antialiased`}
        suppressHydrationWarning={true}
      >
        <HeroProvider>
          <Preloader />
          <BrownianParticles />
          {children}
        </HeroProvider>
      </body>
    </html>
  );
}

