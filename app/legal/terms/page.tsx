// Session 25: Terms of Service Page
// Static legal content for the Unbind platform

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function TermsOfServicePage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: February 17, 2025</p>

          <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-blue-600 prose-li:text-gray-600">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Unbind platform (&ldquo;Service&rdquo;), you agree to be
              bound by these Terms of Service (&ldquo;Terms&rdquo;). If you are using the Service on
              behalf of a law firm or organization, you represent that you have the authority to
              bind that entity to these Terms.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Unbind is a cloud-based divorce collaboration platform designed for family law
              attorneys and their clients. The Service provides case management, document
              management, billing, messaging, e-filing, and related tools to facilitate the
              divorce process.
            </p>

            <h2>3. Account Registration</h2>
            <p>
              To use the Service, you must create an account and provide accurate, complete
              information. You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your account. You
              must notify us immediately of any unauthorized use of your account.
            </p>

            <h2>4. Authorized Users</h2>
            <p>
              Law firm accounts may invite attorneys, staff members, and clients to access the
              platform. The account holder is responsible for ensuring all authorized users
              comply with these Terms. Client access is limited to their own case information
              and communications.
            </p>

            <h2>5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Upload malicious software, viruses, or harmful code</li>
              <li>Share confidential case information outside authorized channels</li>
              <li>Use the Service to harass, intimidate, or threaten any person</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            </ul>

            <h2>6. Data and Privacy</h2>
            <p>
              We take the privacy and security of your data seriously. Our handling of personal
              information is described in our{' '}
              <Link href="/legal/privacy" className="text-blue-600 hover:text-blue-700">
                Privacy Policy
              </Link>
              . By using the Service, you consent to the collection and use of information as
              described in the Privacy Policy.
            </p>

            <h2>7. Confidentiality</h2>
            <p>
              Unbind recognizes the sensitive nature of legal case data. We maintain
              industry-standard security measures to protect attorney-client privileged
              information. All data is encrypted in transit and at rest. We will not access,
              use, or disclose your case data except as necessary to provide the Service or as
              required by law.
            </p>

            <h2>8. Intellectual Property</h2>
            <p>
              The Service, including its design, features, and content (excluding user-submitted
              data), is owned by Unbind and is protected by copyright, trademark, and other
              intellectual property laws. You retain ownership of all data you submit to the
              Service.
            </p>

            <h2>9. Billing and Payment</h2>
            <p>
              Subscription fees are billed in advance on a monthly or annual basis. Fees are
              non-refundable except as required by law or as explicitly stated in these Terms.
              We reserve the right to change our pricing with 30 days&apos; notice. Continued use
              of the Service after a price change constitutes acceptance of the new pricing.
            </p>

            <h2>10. Service Availability</h2>
            <p>
              We strive to maintain 99.9% uptime for the Service. However, we do not guarantee
              uninterrupted access and may perform scheduled maintenance with advance notice.
              We are not liable for any downtime or service interruptions beyond our reasonable
              control.
            </p>

            <h2>11. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Unbind shall not be liable for any
              indirect, incidental, special, consequential, or punitive damages, including
              loss of profits, data, or business opportunities, arising out of or related to
              your use of the Service. Our total liability shall not exceed the fees paid by
              you in the twelve months preceding the claim.
            </p>

            <h2>12. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
              warranties of any kind, either express or implied. Unbind does not provide legal
              advice. The Service is a tool for legal professionals, and all legal decisions
              remain the responsibility of the attorney.
            </p>

            <h2>13. Termination</h2>
            <p>
              Either party may terminate the account at any time. Upon termination, you will
              have 30 days to export your data. After this period, we may delete your data in
              accordance with our data retention policies. We may suspend or terminate your
              account immediately if you violate these Terms.
            </p>

            <h2>14. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the
              State of California, without regard to its conflict of law principles. Any
              disputes arising under these Terms shall be resolved in the state or federal
              courts located in San Francisco County, California.
            </p>

            <h2>15. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material
              changes via email or through the Service. Continued use of the Service after
              changes take effect constitutes acceptance of the updated Terms.
            </p>

            <h2>16. Contact Information</h2>
            <p>
              If you have questions about these Terms, please contact us at:{' '}
              <a href="mailto:legal@unbind.law">legal@unbind.law</a>
            </p>
          </div>
        </article>
      </div>
    </div>
  )
}
