// Session 25: Privacy Policy Page
// Static legal content for the Unbind platform

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <article className="bg-white rounded-lg border border-gray-200 p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: February 17, 2025</p>

          <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600 prose-li:text-gray-600">
            <h2>1. Introduction</h2>
            <p>
              Unbind (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed
              to protecting the privacy and security of your personal information. This
              Privacy Policy describes how we collect, use, store, and share information when
              you use our divorce collaboration platform (&ldquo;Service&rdquo;).
            </p>

            <h2>2. Information We Collect</h2>
            <h3>2.1 Account Information</h3>
            <p>
              When you register for an account, we collect your name, email address,
              professional credentials, and law firm affiliation. For client accounts, we
              collect the information necessary to associate you with your case.
            </p>

            <h3>2.2 Case Data</h3>
            <p>
              In the course of using the Service, attorneys and clients may submit case-related
              information including personal details of parties, financial documents, court
              filings, and other sensitive legal materials. This data is treated with the
              highest level of confidentiality.
            </p>

            <h3>2.3 Usage Data</h3>
            <p>
              We automatically collect information about how you interact with the Service,
              including pages visited, features used, timestamps, device information, and IP
              addresses. This data helps us improve the Service and ensure security.
            </p>

            <h3>2.4 Payment Information</h3>
            <p>
              Payment processing is handled by our third-party payment processor (Stripe).
              We do not store credit card numbers or bank account details on our servers.
              We receive only transaction confirmations and billing history.
            </p>

            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related notifications</li>
              <li>Send administrative messages, updates, and security alerts</li>
              <li>Respond to your requests, questions, and support inquiries</li>
              <li>Monitor and analyze usage patterns to improve user experience</li>
              <li>Detect, prevent, and address security issues and fraud</li>
              <li>Comply with legal obligations and enforce our terms</li>
            </ul>

            <h2>4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data,
              including:
            </p>
            <ul>
              <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256)</li>
              <li>Row-level security policies in our database</li>
              <li>Regular security audits and penetration testing</li>
              <li>Multi-factor authentication support</li>
              <li>Role-based access controls</li>
              <li>Automated backup and disaster recovery</li>
              <li>SOC 2 Type II compliance (in progress)</li>
            </ul>

            <h2>5. Attorney-Client Privilege</h2>
            <p>
              We recognize and respect the attorney-client privilege. We design our systems
              and processes to maintain the confidentiality of privileged communications. We
              will not voluntarily disclose privileged information and will assert
              applicable protections if compelled by legal process.
            </p>

            <h2>6. Data Sharing</h2>
            <p>We do not sell your personal information. We may share information with:</p>
            <ul>
              <li>
                <strong>Service Providers:</strong> Third-party vendors who assist in providing
                the Service (hosting, payment processing, email delivery), subject to
                confidentiality agreements
              </li>
              <li>
                <strong>Court Systems:</strong> When you use our e-filing features, case data
                is transmitted to the relevant court&apos;s electronic filing system
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, subpoena, or
                court order, though we will provide notice when legally permitted
              </li>
              <li>
                <strong>With Consent:</strong> When you explicitly authorize sharing with
                specific third parties
              </li>
            </ul>

            <h2>7. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. Case data
              is retained for 7 years after case closure, consistent with legal record
              retention requirements. You may request data export or deletion at any time,
              subject to legal retention obligations.
            </p>

            <h2>8. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you</li>
              <li>Correct inaccurate or incomplete information</li>
              <li>Request deletion of your personal information</li>
              <li>Export your data in a portable format</li>
              <li>Object to or restrict certain processing activities</li>
              <li>Withdraw consent where processing is based on consent</li>
            </ul>
            <p>
              To exercise these rights, please contact us at{' '}
              <a href="mailto:privacy@unbind.law">privacy@unbind.law</a>.
            </p>

            <h2>9. California Privacy Rights (CCPA)</h2>
            <p>
              California residents have additional rights under the California Consumer
              Privacy Act, including the right to know what personal information is collected,
              the right to delete personal information, and the right to opt out of the sale
              of personal information. We do not sell personal information.
            </p>

            <h2>10. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for children under 18. We do not knowingly collect
              personal information from children. If we discover that a child has provided
              personal information, we will delete it promptly.
            </p>

            <h2>11. International Data Transfers</h2>
            <p>
              Your data is primarily stored and processed in the United States. If you access
              the Service from outside the United States, your information may be transferred
              to and processed in the United States, where data protection laws may differ
              from those in your jurisdiction.
            </p>

            <h2>12. Cookies and Tracking</h2>
            <p>
              We use essential cookies for authentication and session management. We use
              analytics tools to understand how the Service is used. You can manage cookie
              preferences through your browser settings.
            </p>

            <h2>13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of
              material changes via email or through the Service at least 30 days before the
              changes take effect.
            </p>

            <h2>14. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or our data practices, please
              contact us at:
            </p>
            <ul>
              <li>
                Email: <a href="mailto:privacy@unbind.law">privacy@unbind.law</a>
              </li>
              <li>
                Mail: Unbind, Inc., Attn: Privacy Team
              </li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  )
}
