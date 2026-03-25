import { useState, useCallback } from 'react'
import apiClient from '../utils/api'
import type { AxiosError } from 'axios'

export interface AttendanceRecord {
  id: number
  user: number
  username: string
  full_name: string
  role: string
  attendance_date: string
  punch_in: string | null
  punch_out: string | null
  punch_in_time: string | null
  punch_out_time: string | null
  status: 'PRESENT' | 'INCOMPLETE' | 'ABSENT'
  total_work_hours: string
  notes: string
  created_at: string
  updated_at: string
}

export interface TodayStatus {
  status: 'PRESENT' | 'INCOMPLETE' | 'ABSENT'
  attendance_date: string
  punch_in: string | null
  punch_out: string | null
  punch_in_time?: string | null
  punch_out_time?: string | null
  total_work_hours: string
  message?: string
}

export interface AttendanceReport {
  summary: {
    total_records: number
    present: number
    incomplete: number
    avg_work_hours: number
  }
  records: AttendanceRecord[]
}

interface ApiResponse<T> {
  count: number
  results: T[]
}

export function useAttendanceAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleError = (err: any, ctx: string) => {
    const axErr = err as AxiosError<any>
    const msg = axErr.response?.data?.detail
      || (axErr.response?.data ? JSON.stringify(axErr.response.data) : `Failed to ${ctx}`)
    setError(String(msg))
    console.error(`[attendance:${ctx}]`, err)
  }

  const punchIn = useCallback(async (notes?: string): Promise<AttendanceRecord | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.post<AttendanceRecord>('/attendance/punch-in/', { notes: notes ?? '' })
      return data
    } catch (err) {
      handleError(err, 'punch-in')
      return null
    } finally { setLoading(false) }
  }, [])

  const punchOut = useCallback(async (notes?: string): Promise<AttendanceRecord | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.post<AttendanceRecord>('/attendance/punch-out/', { notes: notes ?? '' })
      return data
    } catch (err) {
      handleError(err, 'punch-out')
      return null
    } finally { setLoading(false) }
  }, [])

  const fetchToday = useCallback(async (): Promise<TodayStatus | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.get<TodayStatus>('/attendance/today/')
      return data
    } catch (err) {
      handleError(err, 'fetch today')
      return null
    } finally { setLoading(false) }
  }, [])

  const fetchMyHistory = useCallback(async (): Promise<AttendanceRecord[] | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.get<AttendanceRecord[]>('/attendance/my-history/')
      return data
    } catch (err) {
      handleError(err, 'fetch history')
      return null
    } finally { setLoading(false) }
  }, [])

  const fetchReport = useCallback(async (params?: {
    date_from?: string
    date_to?: string
    user_id?: number
    status?: string
  }): Promise<AttendanceReport | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.get<AttendanceReport>('/attendance/report/', { params })
      return data
    } catch (err) {
      handleError(err, 'fetch report')
      return null
    } finally { setLoading(false) }
  }, [])

  const fetchAll = useCallback(async (params?: Record<string, any>): Promise<AttendanceRecord[] | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.get<ApiResponse<AttendanceRecord>>('/attendance/', { params })
      return data.results || []
    } catch (err) {
      handleError(err, 'fetch all')
      return null
    } finally { setLoading(false) }
  }, [])

  return {
    loading, error,
    punchIn, punchOut,
    fetchToday, fetchMyHistory, fetchReport, fetchAll,
  }
}
