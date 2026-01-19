import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";

const siteUrl = "https://www.eliee.sh";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Eliee - AI-Powered Writing Assistant | Google Docs Alternative",
    template: "%s | Eliee",
  },
  description: "Eliee is an AI-native writing assistant that helps you think clearly, write better, and structure your ideas. The smarter alternative to Google Docs with built-in AI for fact-checking, paraphrasing, and reasoning.",
  keywords: [
    "AI writing assistant",
    "Google Docs alternative",
    "AI document editor",
    "AI-powered writing",
    "smart writing tool",
    "AI text editor",
    "reasoning document",
    "AI fact checker",
    "writing with AI",
    "document AI",
    "Claude writing",
    "GPT writing assistant",
    "online document editor",
    "collaborative writing AI",
    "thinking tool",
    "clarity writing",
  ],
  authors: [{ name: "Eliee" }],
  creator: "Eliee",
  publisher: "Eliee",
  icons: {
    icon: "/eliee_logo_tab.png",
    apple: "/eliee_logo_tab.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Eliee",
    title: "Eliee - AI-Powered Writing Assistant | Google Docs Alternative",
    description: "Write smarter with AI. Eliee helps you think clearly, fact-check claims, and structure your reasoning. The AI-native alternative to Google Docs.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Eliee - AI-Powered Writing Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eliee - AI-Powered Writing Assistant",
    description: "Write smarter with AI. The AI-native alternative to Google Docs.",
    images: ["/og-image.png"],
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
  alternates: {
    canonical: siteUrl,
  },
  verification: {
    // Add your Google Search Console verification code here
    // google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="canonical" href={siteUrl} />
        <meta name="theme-color" content="#f5f3ef" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Eliee",
              "applicationCategory": "ProductivityApplication",
              "operatingSystem": "Web",
              "description": "AI-powered writing assistant that helps you think clearly, write better, and structure your ideas. The smarter alternative to Google Docs.",
              "url": siteUrl,
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD",
                "description": "Free tier available"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "150"
              },
              "featureList": [
                "AI-powered writing assistance",
                "Fact-checking and verification",
                "Text paraphrasing and simplification",
                "Reasoning visualization",
                "Real-time collaboration",
                "Claude and GPT-4 integration"
              ]
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Eliee",
              "url": siteUrl,
              "logo": `${siteUrl}/eliee_logo.jpg`,
              "sameAs": [],
              "contactPoint": {
                "@type": "ContactPoint",
                "email": "varun@teyra.app",
                "contactType": "customer support"
              }
            }),
          }}
        />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased selection:bg-primary selection:text-primary-foreground font-sans`}
      >
          {children}
      </body>
    </html>
  );
}
