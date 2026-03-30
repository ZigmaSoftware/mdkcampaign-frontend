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
  ward_name: string | null
  constituency_name: string | null
  total_voters: number
  voters_contacted: number
  coverage_percentage: number
  volunteer_count: number
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
  volunteer_count: number
}

export interface VolunteerInfo {
  id: number
  name: string | null
  phone: string | null
  phone2: string | null
  skills: string | null
  role: string | null
  status: string | null
}

export interface VoterBasicInfo {
  id: number
  voter_id: string | null
  name: string | null
  age: number | null
  gender: string | null
  sentiment: string | null
  is_contacted: boolean | null
  phone: string | null
  ward_name: string | null
}

interface FixLinksResult { fixed_booths: number; fixed_voters: number }

interface UseAnalyticsAPIReturn {
  loading: boolean
  error: string | null
  stats: DashboardStats | null
  fetchDashboardStats: (constituencyId?: number) => Promise<DashboardStats | null>
  fetchBoothStats: (constituencyId?: number) => Promise<BoothStat[]>
  fetchWardStats: (constituencyId?: number) => Promise<WardStat[]>
  fetchBoothVolunteers: (boothId: number) => Promise<VolunteerInfo[]>
  fetchWardVolunteers: (wardId: number) => Promise<VolunteerInfo[]>
  fetchBoothVoters: (boothId: number) => Promise<VoterBasicInfo[]>
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

  const fetchBoothVolunteers = useCallback(async (boothId: number): Promise<VolunteerInfo[]> => {
    try {
      const { data } = await apiClient.get<VolunteerInfo[]>(`/analytics/booth-volunteers/${boothId}/`)
      return data
    } catch (err) {
      handleError(err, 'fetch booth volunteers')
      return []
    }
  }, [])

  const fetchWardVolunteers = useCallback(async (wardId: number): Promise<VolunteerInfo[]> => {
    try {
      const { data } = await apiClient.get<VolunteerInfo[]>(`/analytics/ward-volunteers/${wardId}/`)
      return data
    } catch (err) {
      handleError(err, 'fetch ward volunteers')
      return []
    }
  }, [])

  const fetchBoothVoters = useCallback(async (boothId: number): Promise<VoterBasicInfo[]> => {
    try {
      const { data } = await apiClient.get<VoterBasicInfo[]>(`/analytics/booth-voters/${boothId}/`)
      return data
    } catch (err) {
      handleError(err, 'fetch booth voters')
      return []
    }
  }, [])

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
    fetchBoothVolunteers,
    fetchWardVolunteers,
    fetchBoothVoters,
    fixDataLinks,
  }
}

export type { DashboardStats, BoothStat, WardStat }
