import type { Metadata } from "next";
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";

export const metadata: Metadata = {
  title: "Eliee",
  description: "Write first. Structure later. Think clearly with AI that shows you the logic.",
  icons: {
    icon: "/eliee_logo_tab.png",
    apple: "/eliee_logo_tab.png",
  },
  openGraph: {
    title: "Eliee",
    description: "Write first. Structure later. Think clearly with AI that shows you the logic.",
    siteName: "Eliee",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased selection:bg-primary selection:text-primary-foreground font-sans`}
      >
          {children}
      </body>
    </html>
  );
}
