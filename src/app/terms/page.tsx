"use client";

import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f5f3ef]">
      <nav className="h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 bg-[#f5f3ef]/80 backdrop-blur-md border-b border-black/[0.04]">
        <a href="/" className="flex items-center gap-2">
          <img src="/eliee_logo.jpg" alt="Logo" className="w-6 h-6 rounded-md" />
          <span className="font-medium text-black/80 text-sm tracking-tight">Eliee</span>
        </a>
        <a href="/" className="text-sm text-black/50 hover:text-black transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />
          Back
        </a>
      </nav>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-2">Terms of Service</h1>
        <p className="text-black/40 text-sm mb-12">Last updated: January 8, 2026</p>

        <div className="prose prose-sm max-w-none text-black/70 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-black mb-3">1. Acceptance of Terms</h2>
            <p className="leading-relaxed">
              By accessing or using Eliee ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">2. Description of Service</h2>
            <p className="leading-relaxed">
              Eliee is an AI-powered reasoning document platform that helps users structure their thinking, visualize logic, and make better decisions. The Service includes document creation, AI analysis, and visualization features.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">3. User Accounts</h2>
            <p className="leading-relaxed">
              You may need to create an account to use certain features. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">4. User Content</h2>
            <p className="leading-relaxed">
              You retain ownership of all content you create using Eliee. By using the Service, you grant us a limited license to process your content solely for the purpose of providing the Service. We do not claim ownership of your documents or ideas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">5. Acceptable Use</h2>
            <p className="leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>Use the Service to generate harmful, misleading, or illegal content</li>
              <li>Violate any applicable laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">6. AI-Generated Content</h2>
            <p className="leading-relaxed">
              Eliee uses AI to analyze and visualize your reasoning. AI suggestions are provided as assistance and should not be considered professional advice. You are responsible for reviewing and validating any AI-generated insights before making decisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">7. Subscription and Payments</h2>
            <p className="leading-relaxed">
              Some features require a paid subscription. Payments are processed securely through our payment provider. Subscriptions renew automatically unless cancelled. Refunds are available within 14 days of purchase if the Service has not been substantially used.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">8. Limitation of Liability</h2>
            <p className="leading-relaxed">
              The Service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">9. Termination</h2>
            <p className="leading-relaxed">
              We may terminate or suspend your access to the Service at any time for violations of these terms. You may terminate your account at any time by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">10. Changes to Terms</h2>
            <p className="leading-relaxed">
              We may update these terms from time to time. We will notify you of significant changes via email or through the Service. Continued use after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">11. Contact</h2>
            <p className="leading-relaxed">
              For questions about these Terms, please contact us at <a href="mailto:varun@teyra.app" className="text-black underline">varun@teyra.app</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 md:px-6 border-t border-black/[0.04]">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-black/30">
          <p>© 2026 Eliee</p>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-black">Privacy</a>
            <a href="/pricing" className="hover:text-black">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

