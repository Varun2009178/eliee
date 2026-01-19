import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Eliee Privacy Policy. Learn how we collect, use, and protect your data. Your documents and personal information are safe with us.",
  keywords: ["privacy policy", "data protection", "GDPR", "user privacy", "data security"],
  openGraph: {
    title: "Privacy Policy - Eliee",
    description: "Eliee Privacy Policy - How we protect your data and documents.",
  },
  alternates: {
    canonical: "https://eliee.sh/privacy",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
