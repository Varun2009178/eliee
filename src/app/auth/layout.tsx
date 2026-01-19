import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In or Sign Up - Eliee",
  description: "Create your free Eliee account or sign in to access your AI-powered writing assistant. Start writing smarter with AI-native document editing.",
  keywords: ["sign in", "sign up", "login", "register", "create account", "Eliee account"],
  openGraph: {
    title: "Sign In or Sign Up - Eliee",
    description: "Create your free Eliee account or sign in to access your AI-powered writing assistant.",
  },
  alternates: {
    canonical: "https://eliee.sh/auth",
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
