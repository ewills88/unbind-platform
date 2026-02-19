'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Puzzle, Loader2, AlertCircle, Check, X,
  Calendar, HardDrive, Mail, Calculator, CreditCard, Phone,
  PenTool, Video, Briefcase,
} from 'lucide-react'
import type { FirmIntegration } from '@/types/admin'
import { INTEGRATION_INFO } from '@/types/admin'

const ICON_MAP: Record<string, typeof Calendar> = {
  Calendar, HardDrive, Mail, Calculator, CreditCard, Phone,
  PenTool, Video, Briefcase,
}

const ALL_INTEGRATIONS = Object.entries(INTEGRATION_INFO).map(([key, info]) => ({
  type: key,
  ...info,
}))

export default function AdminIntegrationsPage() {
  const router = useRouter()
  const [integrations, setIntegrations] = useState<FirmIntegration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchIntegrations() }, [])

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/admin/integrations')
      if (res.status === 401) { router.push('/login'); return }
      if (res.status === 403) { setError('Access denied'); setLoading(false); return }
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setIntegrations(data.data || [])
    } catch { setError('Failed to load integrations') }
    finally { setLoading(false) }
  }

  const handleConnect = async (type: string, name: string) => {
    try {
      const res = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_type: type,
          integration_name: name,
          status: 'pending',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      fetchIntegrations()
    } catch { setError('Failed to connect integration') }
  }

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('Disconnect this integration?')) return
    try {
      await fetch('/api/admin/integrations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId }),
      })
      fetchIntegrations()
    } catch { setError('Failed to disconnect') }
  }

  const getStatus = (type: string): FirmIntegration | undefined => {
    return integrations.find(i => i.integration_type === type)
  }

  const categories = Array.from(new Set(ALL_INTEGRATIONS.map(i => i.category)))

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600 mt-1">Connect third-party services to your firm</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" /><p className="text-red-800 text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4 text-red-600" /></button>
        </div>
      )}

      {categories.map(category => (
        <div key={category} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_INTEGRATIONS.filter(i => i.category === category).map(integration => {
              const status = getStatus(integration.type)
              const isConnected = status?.status === 'connected'
              const isPending = status?.status === 'pending'
              const Icon = ICON_MAP[integration.icon] || Puzzle

              return (
                <div key={integration.type} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">{integration.name}</h3>
                        <p className="text-xs text-gray-500">{integration.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    {isConnected ? (
                      <>
                        <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                          <Check className="w-3 h-3" /> Connected
                        </span>
                        <button onClick={() => handleDisconnect(status!.id)}
                          className="text-xs text-red-600 hover:text-red-800">Disconnect</button>
                      </>
                    ) : isPending ? (
                      <span className="text-xs text-amber-600 font-medium">Setup pending...</span>
                    ) : (
                      <button onClick={() => handleConnect(integration.type, integration.name)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">Connect</button>
                    )}
                  </div>

                  {status?.last_sync_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last sync: {new Date(status.last_sync_at).toLocaleString()}
                    </p>
                  )}
                  {status?.last_error && (
                    <p className="text-xs text-red-500 mt-1 truncate">{status.last_error}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
