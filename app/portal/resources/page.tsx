'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Users,
  Scale,
  Home,
  MessageSquare,
  Phone,
  HelpCircle,
  BookOpen,
  Shield,
  Heart,
  FileText,
  CheckSquare,
  ExternalLink,
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQCategory {
  name: string
  icon: React.ElementType
  color: string
  items: FAQItem[]
}

const FAQ_CATEGORIES: FAQCategory[] = [
  {
    name: 'Getting Started',
    icon: BookOpen,
    color: 'bg-blue-100 text-blue-600',
    items: [
      {
        question: 'How does the divorce process work?',
        answer: 'The divorce process typically involves filing a petition, serving your spouse, exchanging financial information (discovery), negotiating a settlement, and finalizing the agreement with a court order. Your attorney will guide you through each step, and you can track your progress on your Dashboard.',
      },
      {
        question: 'How long will my divorce take?',
        answer: 'The timeline varies depending on your state, the complexity of your case, and whether you and your spouse agree on key issues. An uncontested divorce may take 2-6 months, while a contested one can take a year or more. Check your progress tracker for estimated timelines.',
      },
      {
        question: 'What documents do I need to provide?',
        answer: 'Typically, you\'ll need financial documents (tax returns, pay stubs, bank statements), property records, and any prenuptial agreements. Your attorney will create tasks for specific documents they need. Check the Tasks section for your current document requests.',
      },
      {
        question: 'How do I upload documents?',
        answer: 'Go to Documents > Upload, where you can take photos with your camera or select files from your device. Make sure documents are legible and complete before uploading.',
      },
    ],
  },
  {
    name: 'Financial Matters',
    icon: DollarSign,
    color: 'bg-green-100 text-green-600',
    items: [
      {
        question: 'How are assets divided?',
        answer: 'Asset division depends on your state. Community property states split marital assets 50/50, while equitable distribution states divide them fairly (not necessarily equally). Your attorney will explain which approach applies to your case.',
      },
      {
        question: 'How does child support work?',
        answer: 'Child support is typically calculated using state guidelines that consider both parents\' incomes, custody arrangement, and the children\'s needs. Your attorney can provide specific calculations for your situation.',
      },
      {
        question: 'What about alimony/spousal support?',
        answer: 'Spousal support depends on factors like the length of marriage, each spouse\'s income and earning potential, and the standard of living during marriage. Not all divorces include spousal support.',
      },
      {
        question: 'How do I pay my attorney\'s fees?',
        answer: 'You can view and pay invoices in the Billing section of this portal. Payment plans may be available — contact your attorney to discuss options.',
      },
    ],
  },
  {
    name: 'Children & Custody',
    icon: Users,
    color: 'bg-purple-100 text-purple-600',
    items: [
      {
        question: 'What\'s the difference between legal and physical custody?',
        answer: 'Legal custody refers to decision-making authority for the child (education, healthcare, religion). Physical custody refers to where the child lives. Both can be sole or joint.',
      },
      {
        question: 'How is custody determined?',
        answer: 'Courts prioritize the "best interests of the child," considering factors like each parent\'s relationship with the child, stability, and the child\'s preferences (depending on age). If parents agree, the court typically approves their plan.',
      },
      {
        question: 'Can custody arrangements be modified later?',
        answer: 'Yes. If there\'s a significant change in circumstances (relocation, change in work schedule, safety concerns), either parent can request a modification through the court.',
      },
    ],
  },
  {
    name: 'Legal Process',
    icon: Scale,
    color: 'bg-orange-100 text-orange-600',
    items: [
      {
        question: 'What happens at a court hearing?',
        answer: 'Your attorney will prepare you for any hearings. In many cases, hearings are brief and procedural. Your attorney will tell you what to expect, what to wear, and how to conduct yourself.',
      },
      {
        question: 'What is mediation?',
        answer: 'Mediation is a voluntary process where a neutral mediator helps you and your spouse negotiate agreements. It\'s often faster, less expensive, and less stressful than going to trial.',
      },
      {
        question: 'What if my spouse won\'t cooperate?',
        answer: 'If your spouse is unresponsive or uncooperative, your attorney can use legal mechanisms to move the case forward, including default judgments or court motions.',
      },
    ],
  },
  {
    name: 'Your Home & Property',
    icon: Home,
    color: 'bg-teal-100 text-teal-600',
    items: [
      {
        question: 'What happens to the house?',
        answer: 'Options include: one spouse buys out the other, selling the home and splitting proceeds, or one spouse retaining the home as part of the overall division. Your attorney will help you evaluate the best option.',
      },
      {
        question: 'What about retirement accounts?',
        answer: 'Retirement accounts earned during the marriage are generally considered marital property. Dividing them typically requires a special court order called a QDRO (Qualified Domestic Relations Order).',
      },
    ],
  },
  {
    name: 'Emotional Support',
    icon: Heart,
    color: 'bg-pink-100 text-pink-600',
    items: [
      {
        question: 'I\'m feeling overwhelmed. Is that normal?',
        answer: 'Absolutely. Divorce is one of the most stressful life events. It\'s completely normal to feel a range of emotions including sadness, anger, relief, and anxiety. Consider speaking with a therapist or counselor for support.',
      },
      {
        question: 'Where can I find support resources?',
        answer: 'Many communities offer divorce support groups. Online resources, therapy, and counseling can all help. Your attorney may be able to recommend local resources as well.',
      },
    ],
  },
  {
    name: 'Using This Portal',
    icon: Shield,
    color: 'bg-indigo-100 text-indigo-600',
    items: [
      {
        question: 'Is my information secure?',
        answer: 'Yes. All data is encrypted in transit and at rest. Only you and your attorney can see your case information. We use industry-standard security practices to protect your privacy.',
      },
      {
        question: 'How do I message my attorney?',
        answer: 'Go to the Messages section from the sidebar to send and receive messages. Your attorney will respond during business hours.',
      },
      {
        question: 'How do I complete tasks my attorney assigned?',
        answer: 'Go to the Tasks section to see what your attorney needs from you. Each task has instructions and a due date. Mark tasks as complete when you\'ve finished them.',
      },
    ],
  },
]

// Quick links for the portal
const QUICK_LINKS = [
  { label: 'View My Tasks', href: '/portal/tasks', icon: CheckSquare, color: 'text-blue-600 bg-blue-50' },
  { label: 'Upload Documents', href: '/portal/documents', icon: FileText, color: 'text-green-600 bg-green-50' },
  { label: 'Message Attorney', href: '/portal/messages', icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
  { label: 'View Billing', href: '/portal/billing', icon: DollarSign, color: 'text-amber-600 bg-amber-50' },
]

export default function PortalResourcesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Getting Started')
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const toggleQuestion = (question: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(question)) {
        next.delete(question)
      } else {
        next.add(question)
      }
      return next
    })
  }

  const filteredCategories = searchQuery.trim()
    ? FAQ_CATEGORIES.map(cat => ({
        ...cat,
        items: cat.items.filter(item =>
          item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(cat => cat.items.length > 0)
    : FAQ_CATEGORIES

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 lg:py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Help & Resources</h1>
      <p className="text-gray-600 text-sm mb-6">
        Find answers to common questions about your divorce case and this portal.
      </p>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all text-center"
            >
              <div className={`p-2.5 rounded-lg ${link.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-gray-700">{link.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search questions..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Popular Questions */}
      {!searchQuery && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Popular Questions
          </h2>
          <div className="grid gap-2">
            {[
              'How long will my divorce take?',
              'How are assets divided?',
              'How do I upload documents?',
              'Is my information secure?',
            ].map((q) => (
              <button
                key={q}
                onClick={() => setSearchQuery(q.split(' ').slice(0, 3).join(' '))}
                className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left min-h-[44px]"
              >
                <HelpCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="text-sm text-gray-700">{q}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAQ Categories */}
      <div className="space-y-3">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No results found for &ldquo;{searchQuery}&rdquo;</p>
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-blue-600 hover:text-blue-700 mt-2"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredCategories.map((category) => {
            const Icon = category.icon
            const isExpanded = searchQuery || expandedCategory === category.name

            return (
              <div key={category.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded && !searchQuery ? null : category.name)}
                  className="w-full flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${category.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 flex-1 text-left">
                    {category.name}
                  </span>
                  <span className="text-xs text-gray-400 mr-2">{category.items.length}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100">
                    {category.items.map((item) => {
                      const qExpanded = expandedQuestions.has(item.question)

                      return (
                        <div key={item.question} className="border-b border-gray-50 last:border-0">
                          <button
                            onClick={() => toggleQuestion(item.question)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left min-h-[44px]"
                          >
                            <ChevronRight
                              className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${
                                qExpanded ? 'rotate-90' : ''
                              }`}
                            />
                            <span className={`text-sm ${qExpanded ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                              {item.question}
                            </span>
                          </button>
                          {qExpanded && (
                            <div className="px-4 pb-4 pl-11">
                              <p className="text-sm text-gray-600 leading-relaxed">
                                {item.answer}
                              </p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Document Checklist */}
      <div className="mt-8 bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Common Documents Needed</h3>
        <p className="text-sm text-gray-600 mb-4">
          Your attorney may request some or all of these. Check your Tasks section for specific requests.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            'Tax returns (last 3 years)',
            'Recent pay stubs',
            'Bank account statements',
            'Mortgage documents',
            'Vehicle titles/registrations',
            'Retirement account statements',
            'Insurance policies',
            'Prenuptial/postnuptial agreements',
            'Credit card statements',
            'Business ownership documents',
          ].map((doc) => (
            <div key={doc} className="flex items-center gap-2 text-sm text-gray-700 py-1">
              <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {doc}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Attorney Card */}
      <div className="mt-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Still have questions?</h3>
        <p className="text-blue-100 text-sm mb-4">
          Your attorney is here to help with any questions specific to your case.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/portal/messages"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-50 transition-colors min-h-[44px]"
          >
            <MessageSquare className="w-4 h-4" />
            Send a Message
          </Link>
          <Link
            href="/portal/appointments"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-400 transition-colors min-h-[44px]"
          >
            <Phone className="w-4 h-4" />
            Schedule Appointment
          </Link>
        </div>
      </div>

      {/* Helpful External Links */}
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Helpful Resources</h3>
        <div className="space-y-2">
          {[
            { label: 'National Domestic Violence Hotline', href: 'tel:18007997233', note: '1-800-799-7233' },
            { label: 'Divorce Support Groups (DivorceCare)', href: 'https://www.divorcecare.org', note: 'Find a group near you' },
            { label: 'National Suicide Prevention Lifeline', href: 'tel:988', note: 'Call or text 988' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{link.label}</p>
                <p className="text-xs text-gray-500">{link.note}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </a>
          ))}
        </div>
      </div>

      {/* Emergency Info */}
      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-red-800 mb-1">
          If you are in danger
        </p>
        <p className="text-xs text-red-700">
          If you or your children are in immediate danger, call 911. For domestic violence
          support, call the National Domestic Violence Hotline:{' '}
          <a href="tel:18007997233" className="font-semibold underline">1-800-799-7233</a>
        </p>
      </div>
    </div>
  )
}
