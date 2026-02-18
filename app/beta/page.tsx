'use client'

// Session 25: Beta Signup Page
// Hero section, signup form with Zod validation, feature highlights

import { useState } from 'react'
import Link from 'next/link'
import {
  Scale, Shield, FileText, Users, Zap, Clock,
  CheckCircle2, ArrowRight, Loader2
} from 'lucide-react'
import { z } from 'zod'

const betaSignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required').max(200),
  firm_name: z.string().max(200).optional(),
  role: z.string().optional(),
  firm_size: z.string().optional(),
  practice_areas: z.array(z.string()).optional(),
  message: z.string().max(2000).optional(),
})

const PRACTICE_AREAS = [
  'Divorce',
  'Child Custody',
  'Child Support',
  'Spousal Support',
  'Property Division',
  'Mediation',
  'Collaborative Law',
  'Prenuptial Agreements',
]

const FEATURES = [
  {
    icon: <Scale className="w-6 h-6" />,
    title: 'Collaborative Case Management',
    description: 'Manage cases with real-time collaboration between attorneys and clients.',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'AI-Powered Document Analysis',
    description: 'Automatically analyze financial documents and extract key data points.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Bank-Level Security',
    description: 'End-to-end encryption, SOC 2 compliance, and attorney-client privilege protection.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Client Portal',
    description: 'Give clients secure access to their case, documents, and billing.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Court E-Filing',
    description: 'File documents directly with courts across all 50 states.',
  },
  {
    icon: <Clock className="w-6 h-6" />,
    title: 'Automated Deadlines',
    description: 'Never miss a deadline with automatic court deadline calculations.',
  },
]

export default function BetaSignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    firm_name: '',
    role: '',
    firm_size: '',
    practice_areas: [] as string[],
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const togglePracticeArea = (area: string) => {
    setFormData((prev) => ({
      ...prev,
      practice_areas: prev.practice_areas.includes(area)
        ? prev.practice_areas.filter((a) => a !== area)
        : [...prev.practice_areas, area],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSubmitError('')

    const parsed = betaSignupSchema.safeParse(formData)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message
        }
      }
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/beta/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const data = await response.json()
        setSubmitError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setSubmitError('Network error. Please check your connection and try again.')
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-12 max-w-md text-center shadow-xl">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">You&apos;re on the list!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for signing up for Unbind beta access. We&apos;ll be in touch soon
            with your invitation.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            Return to home
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              The Modern Platform for Family Law
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Unbind streamlines divorce case management with AI-powered document analysis,
              secure client collaboration, court e-filing, and automated deadline tracking.
              Join the beta to transform your practice.
            </p>
            <a
              href="#signup-form"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-lg"
            >
              Request Beta Access
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Everything you need for family law
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600 w-fit mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Signup Form */}
        <div id="signup-form" className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-10 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Request Beta Access
            </h2>
            <p className="text-gray-500 text-center mb-8">
              Fill out the form below and we&apos;ll send you an invitation.
            </p>

            {submitError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Jane Smith"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="jane@smithlaw.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Firm Name */}
              <div>
                <label htmlFor="firm_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Firm Name
                </label>
                <input
                  type="text"
                  id="firm_name"
                  name="firm_name"
                  value={formData.firm_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder="Smith Family Law"
                />
              </div>

              {/* Role and Firm Size row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    <option value="">Select role...</option>
                    <option value="attorney">Attorney</option>
                    <option value="partner">Partner</option>
                    <option value="paralegal">Paralegal</option>
                    <option value="office_manager">Office Manager</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="firm_size" className="block text-sm font-medium text-gray-700 mb-1">
                    Firm Size
                  </label>
                  <select
                    id="firm_size"
                    name="firm_size"
                    value={formData.firm_size}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                  >
                    <option value="">Select size...</option>
                    <option value="solo">Solo practitioner</option>
                    <option value="2-10">2-10 attorneys</option>
                    <option value="11-50">11-50 attorneys</option>
                    <option value="50+">50+ attorneys</option>
                  </select>
                </div>
              </div>

              {/* Practice Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Practice Areas
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRACTICE_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => togglePracticeArea(area)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        formData.practice_areas.includes(area)
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                  rows={3}
                  placeholder="Tell us about your practice or what features interest you most..."
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Request Beta Access
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
