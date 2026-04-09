import { useState, useCallback } from 'react'
import apiClient from '../utils/api'
import type { AxiosError } from 'axios'

export interface PollOption {
  id: number
  question_no: 1 | 2
  key: string
  name: string
  name_ta: string
  sub_label: string
  icon_bg: string
  bar_color: string
  is_winner: boolean
  display_order: number
  vote_count: number
}

export interface PollData {
  id: number
  title: string
  title_ta: string
  constituency_name: string
  constituency_no: number
  is_active: boolean
  options: PollOption[]
  total_votes: number
  user_has_voted: boolean
  user_q1_option: number | null
  user_q2_option: number | null
  poll_session_key?: string | null
}

export interface VoteRecord {
  id:           number
  username:     string
  voter_ip:     string
  voter_name:   string
  voter_phone:  string
  voter_city:   string
  q1_option:    string
  q1_key:       string
  q2_option:    string
  q2_key:       string
  timestamp:    string
}

export interface PollResetWindow {
  id: number
  starts_at: string
  ends_at: string | null
  is_current: boolean
  total_votes: number
  note: string
}

export interface UserRecord {
  id: number
  username: string
  email: string
  phone: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  role_display: string
  volunteer_role?: number | null
  volunteer_role_name?: string
  is_active: boolean
  is_verified: boolean
  date_joined: string
  constituency_name?: string
  district_name?: string
  booth_name?: string
}

export interface PagePermission {
  id: number
  role: string
  page_id: string
  can_access: boolean
}

interface ApiResponse<T> {
  count: number
  results: T[]
}

export function usePollAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = (err: any, ctx: string) => {
    const msg = (err as AxiosError<any>).response?.data?.detail || `Failed to ${ctx}`
    setError(String(msg))
    console.error(`[${ctx}]`, err)
  }

  const fetchActivePoll = useCallback(async (sessionKey?: string): Promise<PollData | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<PollData>('/polls/active/', {
        params: sessionKey ? { session: sessionKey } : undefined,
      })
      return data
    } catch (err) {
      handleError(err, 'fetch active poll')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const castVote = useCallback(
    async (pollId: number, q1OptionId: number, q2OptionId?: number, voterName?: string, voterPhone?: string, voterCity?: string): Promise<PollData | null> => {
      setLoading(true)
      setError(null)
      try {
        const body: Record<string, unknown> = { q1_option: q1OptionId }
        if (q2OptionId) body.q2_option = q2OptionId
        if (voterName)  body.voter_name  = voterName
        if (voterPhone) body.voter_phone = voterPhone
        if (voterCity)  body.voter_city  = voterCity
        const { data } = await apiClient.post<PollData>(`/polls/${pollId}/vote/`, body)
        return data
      } catch (err) {
        const axErr = err as AxiosError<any>
        if (axErr.response?.data?.detail === 'already_voted') {
          setError('already_voted')
        } else {
          handleError(err, 'cast vote')
        }
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateVote = useCallback(
    async (pollId: number, q2OptionId: number): Promise<PollData | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<PollData>(`/polls/${pollId}/update_vote/`, {
          q2_option: q2OptionId,
        })
        return data
      } catch (err) {
        handleError(err, 'update vote')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchVotesList = useCallback(
    async (pollId: number, sessionKey?: string): Promise<VoteRecord[] | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<VoteRecord[]>(`/polls/${pollId}/votes/`, {
          params: sessionKey ? { session: sessionKey } : undefined,
        })
        return data
      } catch (err) {
        handleError(err, 'fetch votes list')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchPollResets = useCallback(async (pollId: number): Promise<PollResetWindow[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<PollResetWindow[]>(`/polls/${pollId}/resets/`)
      return data
    } catch (err) {
      handleError(err, 'fetch poll resets')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createPollReset = useCallback(
    async (pollId: number, startsAt?: string, note?: string): Promise<PollResetWindow | null> => {
      setLoading(true)
      setError(null)
      try {
        const payload: Record<string, unknown> = {}
        if (startsAt) payload.starts_at = startsAt
        if (note) payload.note = note
        const { data } = await apiClient.post<PollResetWindow>(`/polls/${pollId}/resets/`, payload)
        return data
      } catch (err) {
        handleError(err, 'create poll reset')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    fetchActivePoll,
    castVote,
    updateVote,
    fetchVotesList,
    fetchPollResets,
    createPollReset,
  }
}

export function useUserAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = (err: any, ctx: string) => {
    const axErr = err as AxiosError<any>
    const msg = axErr.response?.data?.detail
      || (axErr.response?.data ? JSON.stringify(axErr.response.data) : `Failed to ${ctx}`)
    setError(String(msg))
    console.error(`[${ctx}]`, err)
  }

  const fetchUsers = useCallback(async (): Promise<UserRecord[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<ApiResponse<UserRecord>>('/auth/users/')
      return data.results || []
    } catch (err) {
      handleError(err, 'fetch users')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createUser = useCallback(async (userData: Record<string, any>): Promise<UserRecord | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.post<UserRecord>('/auth/users/', userData)
      return data
    } catch (err) {
      handleError(err, 'create user')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateUser = useCallback(async (userId: number, userData: Record<string, any>): Promise<UserRecord | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.patch<UserRecord>(`/auth/users/${userId}/`, userData)
      return data
    } catch (err) {
      handleError(err, 'update user')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deactivateUser = useCallback(async (userId: number): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.post(`/auth/users/${userId}/deactivate/`)
      return true
    } catch (err) {
      handleError(err, 'deactivate user')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchPermissions = useCallback(async (): Promise<PagePermission[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<ApiResponse<PagePermission>>('/auth/permissions/')
      return data.results || []
    } catch (err) {
      handleError(err, 'fetch permissions')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePermission = useCallback(
    async (permId: number, canAccess: boolean): Promise<PagePermission | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<PagePermission>(`/auth/permissions/${permId}/`, {
          can_access: canAccess,
        })
        return data
      } catch (err) {
        handleError(err, 'update permission')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchMyAccess = useCallback(async (): Promise<string[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<{ allowed_pages: string[] }>('/auth/permissions/my_access/')
      return data.allowed_pages
    } catch (err) {
      handleError(err, 'fetch my access')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading, error,
    fetchUsers, createUser, updateUser, deactivateUser,
    fetchPermissions, updatePermission, fetchMyAccess,
  }
}
