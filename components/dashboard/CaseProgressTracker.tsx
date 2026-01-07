'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MessageSquare,
  CheckSquare,
  Calendar,
  User,
  Briefcase,
} from 'lucide-react'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface CaseData {
  id: string
  case_number: string | null
  status: string
  current_step: string
  progress_percentage: number
  filing_date: string | null
  attorney_id: string
  spouse_name: string
}

interface Attorney {
  full_name: string
}

const stages = [
  { name: 'Consultation', completed: true },
  { name: 'Petition Filed', completed: true },
  { name: 'Financial Disclosures', completed: false, inProgress: true },
  { name: 'Settlement Negotiations', completed: false, inProgress: false },
  { name: 'Final Judgment', completed: false, inProgress: false },
]

const nextSteps = [
  { id: 1, task: 'Upload 2023 tax return', due: 'Jan 15', completed: false },
  { id: 2, task: 'Review draft parenting plan', due: 'Jan 20', completed: false },
  { id: 3, task: 'Schedule mediation session', due: 'Jan 25', completed: false },
]

export default function CaseProgressTracker() {
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [attorney, setAttorney] = useState<Attorney | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCaseData()
  }, [])

  const loadCaseData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get client's case
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('*')
        .eq('client_id', user.id)
        .single()

      if (caseError) {
        console.error('Error loading case:', caseError)
      } else {
        setCaseData(caseData)

        // Get attorney info
        if (caseData.attorney_id) {
          const { data: attorneyData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', caseData.attorney_id)
            .single()
          
          if (attorneyData) setAttorney(attorneyData)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Case</h3>
        <p className="text-gray-600">You don't have an active case yet. Contact your attorney to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your case is {caseData.progress_percentage}% complete
            </h2>
            <p className="text-lg text-gray-700">
              Current step: <span className="font-semibold text-blue-700">{caseData.current_step}</span>
            </p>
          </div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-2xl font-bold">
            {caseData.progress_percentage}%
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <p className="font-medium text-gray-900">What's needed next:</p>
          </div>
          <p className="text-gray-700 ml-7">Please upload your 2023 tax return</p>
          <p className="text-sm text-gray-500 ml-7 mt-1">Expected timeline: 2-3 weeks remaining for this step</p>
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-500"
            style={{ width: `${caseData.progress_percentage}%` }}
          />
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Case Progress Timeline</h3>
        
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {stage.completed ? (
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                ) : stage.inProgress ? (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Circle className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 pb-8 border-l-2 border-gray-200 pl-4 ml-5 -mt-2">
                <h4 className={`font-medium ${
                  stage.completed ? 'text-green-700' :
                  stage.inProgress ? 'text-blue-700' :
                  'text-gray-500'
                }`}>
                  {stage.name}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {stage.completed ? 'Completed' :
                   stage.inProgress ? 'In Progress' :
                   'Upcoming'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Steps Checklist */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h3>
          <div className="space-y-3">
            {nextSteps.map((step) => (
              <label key={step.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={step.completed}
                  className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  readOnly
                />
                <div className="flex-1">
                  <p className={`font-medium ${step.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                    {step.task}
                  </p>
                  <p className="text-sm text-gray-500">Due: {step.due}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Key Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Information</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Case Number</dt>
              <dd className="mt-1 text-sm text-gray-900">{caseData.case_number || 'Pending'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Filing Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {caseData.filing_date ? new Date(caseData.filing_date).toLocaleDateString() : 'Not filed yet'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Your Attorney</dt>
              <dd className="mt-1 text-sm text-gray-900">{attorney?.full_name || 'Not assigned'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Next Court Date</dt>
              <dd className="mt-1 text-sm text-gray-900">Feb 10, 2024</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <FileText className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">12</p>
          <p className="text-sm text-gray-600">Documents Uploaded</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">3</p>
          <p className="text-sm text-gray-600">Unread Messages</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <CheckSquare className="w-6 h-6 text-orange-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-gray-900">2</p>
          <p className="text-sm text-gray-600">Pending Tasks</p>
        </div>
      </div>
    </div>
  )
}