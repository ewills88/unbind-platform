'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, ListTodo, Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import TaskCard from '@/components/client/TaskCard'
import { ClientTask } from '@/types/client'
import { authFetch } from '@/lib/supabase/auth-fetch'

export default function ClientTasksPage() {
  const [tasks, setTasks] = useState<ClientTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const res = await authFetch('/api/client/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Error fetching tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (taskId: string) => {
    try {
      const res = await authFetch(`/api/client/tasks/${taskId}/complete`, { method: 'PATCH' })
      if (!res.ok) throw new Error('Failed to complete task')

      setTasks(prev =>
        prev.map(t =>
          t.id === taskId ? { ...t, status: 'completed', completed_by_client_at: new Date().toISOString() } : t
        )
      )
    } catch (err) {
      console.error('Complete task error:', err)
    }
  }

  const pendingTasks = tasks
    .filter(t => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => {
      // Overdue first, then by due date ascending
      if (!a.due_date && !b.due_date) return 0
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'approved')

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete these tasks to keep your case moving forward.
        </p>
      </div>

      <Tabs defaultValue="todo" className="w-full">
        <TabsList className="mb-4 w-full sm:w-auto">
          <TabsTrigger value="todo" className="flex-1 sm:flex-initial">
            To Do {pendingTasks.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded-full">
                {pendingTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 sm:flex-initial">
            Completed {completedTasks.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded-full">
                {completedTasks.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex-1 sm:flex-initial">
            All
            <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded-full">
              {tasks.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="todo">
          {pendingTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">All done!</p>
              <p className="text-sm text-gray-500 mt-1">
                You&apos;ve completed all your current tasks.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completedTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ListTodo className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900">No completed tasks yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Complete your pending tasks and they&apos;ll appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all">
          {tasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ListTodo className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900">No tasks yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Your attorney will assign tasks as your case progresses.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
