"use client";

import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
        <h1 className="text-3xl md:text-4xl font-semibold text-black tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-black/40 text-sm mb-12">Last updated: January 8, 2026</p>

        <div className="prose prose-sm max-w-none text-black/70 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-black mb-3">1. Information We Collect</h2>
            <p className="leading-relaxed mb-3">We collect information you provide directly:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> Email address and password when you create an account</li>
              <li><strong>Document Content:</strong> The documents, reasoning blocks, and visualizations you create</li>
              <li><strong>Usage Data:</strong> How you interact with features to improve the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">2. How We Use Your Information</h2>
            <p className="leading-relaxed mb-3">We use your information to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide and improve the Service</li>
              <li>Process your documents with AI for analysis and visualization</li>
              <li>Communicate with you about your account and updates</li>
              <li>Ensure security and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">3. AI Processing</h2>
            <p className="leading-relaxed">
              When you use visualization and analysis features, your document content is processed by AI models. We do not use your content to train AI models. Processing happens in real-time and content is not stored beyond what's necessary to provide the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">4. Data Storage and Security</h2>
            <p className="leading-relaxed">
              Your data is stored securely using industry-standard encryption. We use trusted cloud providers with SOC 2 compliance. We implement appropriate technical and organizational measures to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">5. Data Sharing</h2>
            <p className="leading-relaxed mb-3">We do not sell your personal information. We may share data with:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Service Providers:</strong> Third parties that help us operate the Service (hosting, payments)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
              <li><strong>Business Transfers:</strong> In connection with a merger or acquisition</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">6. Your Rights</h2>
            <p className="leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access and download your data</li>
              <li>Correct inaccurate information</li>
              <li>Delete your account and data</li>
              <li>Export your documents</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">7. Cookies</h2>
            <p className="leading-relaxed">
              We use essential cookies to maintain your session and preferences. We do not use advertising or tracking cookies. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">8. Data Retention</h2>
            <p className="leading-relaxed">
              We retain your data as long as your account is active. After account deletion, we remove your data within 30 days, except where we need to retain it for legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">9. Children's Privacy</h2>
            <p className="leading-relaxed">
              The Service is not intended for users under 13. We do not knowingly collect information from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">10. Changes to This Policy</h2>
            <p className="leading-relaxed">
              We may update this policy from time to time. We will notify you of significant changes via email or through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-black mb-3">11. Contact</h2>
            <p className="leading-relaxed">
              For privacy questions, contact us at <a href="mailto:varun@teyra.app" className="text-black underline">varun@teyra.app</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-4 md:px-6 border-t border-black/[0.04]">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs text-black/30">
          <p>© 2026 Eliee</p>
          <div className="flex gap-4">
            <a href="/terms" className="hover:text-black">Terms</a>
            <a href="/pricing" className="hover:text-black">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

