import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            TrueBlazer.AI
          </h1>
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6">Terms of Service</h1>
        <p className="text-muted-foreground mb-8" suppressHydrationWarning>Last updated: January 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using TrueBlazer.AI ("Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these Terms of Service, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              TrueBlazer.AI provides an AI-powered platform for founders to discover, validate, and build business ideas. The Service includes idea generation, analysis, task management, workspace tools, and other features designed to support entrepreneurial journeys.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Maintaining the confidentiality of your account credentials</li>
              <li>All activities that occur under your account</li>
              <li>Notifying us immediately of any unauthorized use</li>
              <li>Ensuring your account information is accurate and current</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Subscription and Payment</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Some features of the Service require a paid subscription:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Subscription fees are billed in advance on a monthly or annual basis</li>
              <li>All fees are non-refundable except as required by law</li>
              <li>You may cancel your subscription at any time through the billing portal</li>
              <li>Cancellations take effect at the end of the current billing period</li>
              <li>We reserve the right to modify pricing with 30 days' notice</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You agree not to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Harass, abuse, or harm another person</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems to access the Service without permission</li>
              <li>Resell or redistribute the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by TrueBlazer.AI and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws. You retain ownership of content you create using the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service uses AI to generate ideas, analysis, and recommendations. While we strive for accuracy, AI-generated content may contain errors or inaccuracies. You are responsible for verifying and validating all AI-generated content before acting upon it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms. Upon termination, your right to use the Service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free. Your use of the Service is at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall TrueBlazer.AI, its directors, employees, partners, or agents be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or other intangibles, resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
