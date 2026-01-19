import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started - Create Your Free Account",
  description: "Get started with Eliee in seconds. Create your free account and start writing smarter with AI-powered assistance, fact-checking, and reasoning tools.",
  keywords: ["get started", "free account", "start writing", "AI writing", "create account"],
  openGraph: {
    title: "Get Started with Eliee",
    description: "Create your free account and start writing smarter with AI-powered assistance.",
  },
  alternates: {
    canonical: "https://eliee.sh/get-started",
  },
};

export default function GetStartedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
