'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import Sidebar from '@/components/layout/Sidebar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { User, Bell, Shield, CreditCard } from 'lucide-react'

const supabase = createClient(
  'https://rpbjravqgflidnwjkgvc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYmpyYXZxZ2ZsaWRud2prZ3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwNDM2MzEsImV4cCI6MjA4MjYxOTYzMX0.kNKpXSGNVAQDReTFA0qcLMS9eKOzFaA8UPkGTYqG75Y'
)

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: string
  phone: string | null
  firm_name: string | null
  bar_number: string | null
  email_notifications: boolean
  sms_notifications: boolean
  notify_messages: boolean
  notify_documents: boolean
  notify_tasks: boolean
  notify_deadlines: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    firm_name: '',
    bar_number: '',
    email_notifications: true,
    sms_notifications: false,
    notify_messages: true,
    notify_documents: true,
    notify_tasks: true,
    notify_deadlines: true,
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        firm_name: data.firm_name || '',
        bar_number: data.bar_number || '',
        email_notifications: data.email_notifications ?? true,
        sms_notifications: data.sms_notifications ?? false,
        notify_messages: data.notify_messages ?? true,
        notify_documents: data.notify_documents ?? true,
        notify_tasks: data.notify_tasks ?? true,
        notify_deadlines: data.notify_deadlines ?? true,
      })
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', profile.id)

      if (error) throw error

      showToast('Settings saved successfully!')
      loadProfile()
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const getInitials = () => {
    if (!profile?.full_name) return 'U'
    return profile.full_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="account">
                <Shield className="w-4 h-4 mr-2" />
                Account
              </TabsTrigger>
              {profile?.role === 'admin' && (
                <TabsTrigger value="billing">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing
                </TabsTrigger>
              )}
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Profile Information</h2>
                
                {/* Avatar */}
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                    {getInitials()}
                  </div>
                  <div>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                      Change Avatar
                    </button>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF. Max 2MB.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <input
                      id="full_name"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <input
                      id="email"
                      type="email"
                      value={profile?.email || ''}
                      disabled
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Attorney-specific fields */}
                  {profile?.role === 'admin' && (
                    <>
                      <div>
                        <Label htmlFor="firm_name">Firm Name</Label>
                        <input
                          id="firm_name"
                          type="text"
                          value={formData.firm_name}
                          onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="bar_number">Bar Number</Label>
                        <input
                          id="bar_number"
                          type="text"
                          value={formData.bar_number}
                          onChange={(e) => setFormData({ ...formData, bar_number: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email_notifications" className="text-base">Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <Switch
                      id="email_notifications"
                      checked={formData.email_notifications}
                      onCheckedChange={(checked) => setFormData({ ...formData, email_notifications: checked })}
                    />
                  </div>

                  {/* SMS Notifications */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms_notifications" className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-gray-500">Receive notifications via text message</p>
                    </div>
                    <Switch
                      id="sms_notifications"
                      checked={formData.sms_notifications}
                      onCheckedChange={(checked) => setFormData({ ...formData, sms_notifications: checked })}
                    />
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-4">Notification Types</h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_messages">New Messages</Label>
                        <Switch
                          id="notify_messages"
                          checked={formData.notify_messages}
                          onCheckedChange={(checked) => setFormData({ ...formData, notify_messages: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_documents">Document Uploads</Label>
                        <Switch
                          id="notify_documents"
                          checked={formData.notify_documents}
                          onCheckedChange={(checked) => setFormData({ ...formData, notify_documents: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_tasks">Task Assignments</Label>
                        <Switch
                          id="notify_tasks"
                          checked={formData.notify_tasks}
                          onCheckedChange={(checked) => setFormData({ ...formData, notify_tasks: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="notify_deadlines">Upcoming Deadlines</Label>
                        <Switch
                          id="notify_deadlines"
                          checked={formData.notify_deadlines}
                          onCheckedChange={(checked) => setFormData({ ...formData, notify_deadlines: checked })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* Account Settings */}
            <TabsContent value="account" className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Account Settings</h2>
                
                <div className="space-y-6">
                  {/* Account Type */}
                  <div>
                    <Label>Account Type</Label>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        profile?.role === 'admin' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {profile?.role === 'admin' ? 'Attorney' : 'Client'}
                      </span>
                    </div>
                  </div>

                  {/* Change Password */}
                  <div>
                    <Label>Password</Label>
                    <button className="mt-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                      Change Password
                    </button>
                  </div>

                  {/* Two-Factor Authentication */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label>Two-Factor Authentication</Label>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Billing (Attorney only) */}
            {profile?.role === 'admin' && (
              <TabsContent value="billing" className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing & Subscription</h2>
                  
                  <div className="space-y-6">
                    {/* Current Plan */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                          <p className="text-2xl font-bold text-blue-600 mt-1">Free Trial</p>
                          <p className="text-sm text-gray-600 mt-1">14 days remaining</p>
                        </div>
                        <CreditCard className="w-12 h-12 text-blue-600" />
                      </div>
                    </div>

                    {/* Upgrade Button */}
                    <div>
                      <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium text-lg">
                        Upgrade to Pro - $99/month
                      </button>
                      <p className="text-sm text-gray-500 text-center mt-2">
                        Unlimited cases • Priority support • Advanced features
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}