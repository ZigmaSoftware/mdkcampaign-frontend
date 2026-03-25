import { useCallback, useState, useEffect } from 'react'
import apiClient from '../utils/api'
import type { AxiosError } from 'axios'

interface DashboardStats {
  id: number
  snapshot_date: string
  total_voters: number
  voters_contacted: number
  voter_contact_percentage: number
  voters_by_sentiment: {
    positive?: number
    neutral?: number
    negative?: number
    undecided?: number
  }
  total_booths: number
  booths_assigned: number
  booths_working: number
  booth_assignment_percentage: number
  total_volunteers: number
  active_volunteers: number
  avg_performance_score: number
  total_events: number
  completed_events: number
  event_completion_percentage: number
  total_attendees: number
  surveys_conducted: number
  feedback_received: number
  created_at?: string
  updated_at?: string
}

interface BoothStat {
  id: number
  name: string
  number: string
  total_voters: number
  voters_contacted: number
  coverage_percentage: number
}

interface WardStat {
  id: number
  name: string
  constituency_name: string
  total_voters: number
  voters_contacted: number
  coverage_pct: number
  sentiment: Record<string, number>
  caste_dist: Record<string, number>
  booth_count: number
}

interface FixLinksResult { fixed_booths: number; fixed_voters: number }

interface UseAnalyticsAPIReturn {
  loading: boolean
  error: string | null
  stats: DashboardStats | null
  fetchDashboardStats: (constituencyId?: number) => Promise<DashboardStats | null>
  fetchBoothStats: (constituencyId?: number) => Promise<BoothStat[]>
  fetchWardStats: (constituencyId?: number) => Promise<WardStat[]>
  fixDataLinks: () => Promise<FixLinksResult | null>
}

/**
 * Hook for managing analytics and dashboard API operations
 */
export function useAnalyticsAPI(): UseAnalyticsAPIReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)

  const handleError = (err: any, context: string) => {
    const axiosError = err as AxiosError<any>
    const message = axiosError.response?.data?.detail || `Failed to ${context}`
    setError(String(message))
    console.error(`[${context}]`, err)
  }

  const fetchDashboardStats = useCallback(
    async (constituencyId?: number): Promise<DashboardStats | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<DashboardStats>('/analytics/dashboard/', {
          params: constituencyId ? { constituency_id: constituencyId } : undefined,
        })
        setStats(data)
        return data
      } catch (err) {
        handleError(err, 'fetch dashboard stats')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchBoothStats = useCallback(
    async (constituencyId?: number): Promise<BoothStat[]> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<BoothStat[]>('/analytics/booths/', {
          params: constituencyId ? { constituency_id: constituencyId } : undefined,
        })
        return data
      } catch (err) {
        handleError(err, 'fetch booth stats')
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchWardStats = useCallback(
    async (constituencyId?: number): Promise<WardStat[]> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<WardStat[]>('/analytics/wards/', {
          params: constituencyId ? { constituency_id: constituencyId } : undefined,
        })
        return data
      } catch (err) {
        handleError(err, 'fetch ward stats')
        return []
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fixDataLinks = useCallback(async (): Promise<FixLinksResult | null> => {
    try {
      const { data } = await apiClient.post<FixLinksResult>('/analytics/fix-links/')
      return data
    } catch (err) {
      handleError(err, 'fix data links')
      return null
    }
  }, [])

  return {
    loading,
    error,
    stats,
    fetchDashboardStats,
    fetchBoothStats,
    fetchWardStats,
    fixDataLinks,
  }
}

export type { DashboardStats, BoothStat, WardStat }
