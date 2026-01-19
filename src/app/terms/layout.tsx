import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Read the Eliee Terms of Service. Learn about our subscription policies, cancellation terms, user content ownership, and acceptable use guidelines.",
  keywords: ["terms of service", "terms and conditions", "legal", "user agreement", "subscription terms"],
  openGraph: {
    title: "Terms of Service - Eliee",
    description: "Eliee Terms of Service - Subscription policies, cancellation terms, and user guidelines.",
  },
  alternates: {
    canonical: "https://eliee.sh/terms",
  },
};

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
