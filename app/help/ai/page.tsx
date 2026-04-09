'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scale, ArrowLeft, Briefcase, Users } from 'lucide-react'
import HelpChat from '@/components/help/HelpChat'

const ATTORNEY_QUESTIONS = [
  'How does AI document categorization work?',
  'What states does Unbind support for e-filing?',
  'How do I set up trust accounting?',
  'What does $179/month include?',
  'How do I invite my team members?',
  'How does the client portal work?',
  'Can I generate settlement documents?',
  'How do discovery deadline calculations work?',
]

const CLIENT_QUESTIONS = [
  'How do I view my case status?',
  'How do I upload documents?',
  'How do I pay my invoice?',
  'How do I message my attorney?',
  'How do I log in with a magic link?',
  'Can I use Unbind on my phone?',
  'Is my information secure?',
  'How do I schedule an appointment?',
]

export default function AIHelpPage() {
  const [audience, setAudience] = useState<'attorney' | 'client'>('attorney')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Scale className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Unbind</span>
            </div>
          </div>
          <Link
            href="/help"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Help Center
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Help Assistant</h1>
          <p className="text-gray-500">
            Get instant answers about Unbind. Choose your role below.
          </p>
        </div>

        {/* Audience Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAudience('attorney')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                audience === 'attorney'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              For Attorneys
            </button>
            <button
              onClick={() => setAudience('client')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                audience === 'client'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="w-4 h-4" />
              For Clients
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="text-center mb-8">
          {audience === 'attorney' ? (
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              Ask about features, pricing, onboarding, integrations, or anything else about the Unbind platform.
            </p>
          ) : (
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              Ask about how to use your client portal — viewing your case, uploading documents, paying invoices, and more.
            </p>
          )}
        </div>

        {/* Suggested Questions + Chat Widget */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
            Suggested Questions
          </h2>
          <HelpChat
            key={audience}
            audience={audience}
            suggestedQuestions={audience === 'attorney' ? ATTORNEY_QUESTIONS : CLIENT_QUESTIONS}
          />
        </div>
      </div>
    </div>
  )
}
