import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing - Free & Pro Plans",
  description: "Choose the right Eliee plan for you. Start free with 3 documents, or upgrade to Pro for unlimited documents, 150 premium AI prompts with Claude & GPT-4, and priority support. $9.99/month.",
  keywords: ["pricing", "plans", "free tier", "pro subscription", "AI writing cost", "document editor pricing"],
  openGraph: {
    title: "Eliee Pricing - Free & Pro Plans",
    description: "Start free with 3 documents. Upgrade to Pro for unlimited documents and premium AI with Claude & GPT-4. Just $9.99/month.",
  },
  alternates: {
    canonical: "https://eliee.sh/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
