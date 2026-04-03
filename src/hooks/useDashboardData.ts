import { useState, useEffect } from 'react'
import apiClient from '../utils/api'

export interface ActivityLogItem {
  id: number
  category: 'agent' | 'field' | 'volunteer'
  activity_type: string
  date: string
  hours_worked?: number
  village?: string
  booth_no?: string
  notes?: string
  username?: string
  user_role?: string
  created_at?: string
}

export interface CampaignEventItem {
  id: number
  title: string
  event_type: string
  scheduled_date: string
  scheduled_time?: string
  location: string
  status: string
  expected_attendees?: number
  actual_attendees?: number
}

export interface TaskItem {
  id: number
  title: string
  category: string
  task_category?: number | null
  task_category_name?: string
  task_category_color?: string
  details?: string
  expected_datetime: string
  venue?: string
  delivery_incharge_name?: string
  coordinator_name?: string
  status: string
  notes?: string
  created_at?: string
}

export interface DashboardAnalytics {
  total_voters?: number
  voters_contacted?: number
  voters_by_sentiment?: Record<string, number>
  contacted_by_sentiment?: Record<string, number>
  total_booths?: number
  booths_assigned?: number
  active_volunteers?: number
  total_events?: number
  completed_events?: number
}

interface UseDashboardDataReturn {
  activities: ActivityLogItem[]
  events: CampaignEventItem[]
  tasks: TaskItem[]
  analytics: DashboardAnalytics | null
  loading: boolean
}

export function useDashboardData(): UseDashboardDataReturn {
  const [activities, setActivities] = useState<ActivityLogItem[]>([])
  const [events, setEvents] = useState<CampaignEventItem[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      apiClient.get('/activities/logs/', { params: { limit: 8 } }),
      apiClient.get('/campaigns/events/', { params: { limit: 100 } }),
      apiClient.get('/campaigns/tasks/', { params: { limit: 100 } }),
      apiClient.get('/analytics/dashboard/'),
    ]).then(([activitiesRes, eventsRes, tasksRes, analyticsRes]) => {
      if (activitiesRes.status === 'fulfilled') {
        setActivities(activitiesRes.value.data.results || [])
      }
      if (eventsRes.status === 'fulfilled') {
        setEvents(eventsRes.value.data.results || [])
      }
      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value.data.results || [])
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value.data)
      }
    }).finally(() => setLoading(false))
  }, [])

  return { activities, events, tasks, analytics, loading }
}

/* ── Helpers ─────────────────────────────────────────────────────── */

export function getActivityIcon(category: string) {
  switch (category) {
    case 'agent':
      return { icon: 'ph ph-user-gear', iconBg: '#dbeafe', iconColor: '#0d2455' }
    case 'field':
      return { icon: 'ph ph-map-pin', iconBg: '#dcfce7', iconColor: '#138808' }
    case 'volunteer':
      return { icon: 'ph ph-users-three', iconBg: '#fff3e0', iconColor: '#e07010' }
    default:
      return { icon: 'ph ph-activity', iconBg: '#f3f4f6', iconColor: '#6b7280' }
  }
}

export function formatActivityDate(dateStr: string): string {
  const today = new Date()
  const actDate = new Date(dateStr)
  if (actDate.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (actDate.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return actDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function buildActivityMeta(log: ActivityLogItem): string {
  const parts: string[] = [formatActivityDate(log.date)]
  if (log.username) parts.push(log.username)
  if (log.village) parts.push(log.village)
  if (log.booth_no) parts.push(`Booth ${log.booth_no}`)
  if (log.hours_worked) parts.push(`${log.hours_worked}h`)
  return parts.join(' · ')
}

export function buildActivityTitle(log: ActivityLogItem): string {
  return log.notes ? `${log.activity_type} – ${log.notes}` : log.activity_type
}

export function getEventTypeBadge(eventType: string): { label: string; variant: 'g' | 's' | 'r' | 'p' | 'blue' | 'pink' } {
  switch (eventType) {
    case 'rally':        return { label: 'Rally',    variant: 's' }
    case 'meeting':      return { label: 'Meeting',  variant: 'blue' }
    case 'training':     return { label: 'Training', variant: 'g' }
    case 'door_door':    return { label: 'D2D',      variant: 'p' }
    case 'nagar_kirtan': return { label: 'Kirtan',   variant: 'p' }
    case 'stage_show':   return { label: 'Show',     variant: 'pink' }
    default:             return { label: 'Event',    variant: 'blue' }
  }
}

export function getEventStatusDisplay(status: string): { text: string; className: string } {
  switch (status) {
    case 'confirmed':
      return { text: '✓ Confirmed', className: 'text-kampgreen font-bold text-[12px]' }
    case 'planned':
      return { text: 'Planning',    className: 'text-saffron-dark font-bold text-[12px]' }
    case 'completed':
      return { text: 'Done',        className: 'text-muted font-bold text-[12px]' }
    case 'cancelled':
      return { text: 'Cancelled',   className: 'text-kampr font-bold text-[12px]' }
    default:
      return { text: status,        className: 'text-muted text-[12px]' }
  }
}

export function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function getTaskStatusDisplay(status: string): { text: string; bg: string; color: string } {
  switch (status) {
    case 'pending':     return { text: 'Pending',     bg: '#fef3c7', color: '#d97706' }
    case 'in_progress': return { text: 'In Progress', bg: '#dbeafe', color: '#0d2455' }
    case 'completed':   return { text: 'Completed',   bg: '#dcfce7', color: '#138808' }
    case 'cancelled':   return { text: 'Cancelled',   bg: '#fee2e2', color: '#dc2626' }
    default:            return { text: status,        bg: '#f3f4f6', color: '#6b7280' }
  }
}

export function formatTaskDateTime(dt: string): string {
  const d = new Date(dt)
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}
