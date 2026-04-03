import { useCallback, useState } from 'react'
import apiClient from '../utils/api'
import type { AxiosError } from 'axios'

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface VoterRecord {
  id: number
  name: string
  father_name?: string
  voter_id: string
  aadhaar?: string
  phone?: string
  phone2?: string
  alt_phoneno2?: string
  alt_phoneno3?: string
  email?: string
  booth: number
  village?: number
  sentiment?: string
  gender?: string
  address?: string
  pincode?: string
  age?: number
  date_of_birth?: string
  religion?: string
  caste?: string
  sub_caste?: string
  current_location?: string
  scheme_name?: string
  issue_name?: string
  education_level?: string
  occupation?: string
  preferred_party?: number
  notes?: string
  latitude?: number
  longitude?: number
  is_contacted?: boolean
  has_attended_event?: boolean
  is_volunteer?: boolean
  feedback_score?: number
  created_at?: string
  updated_at?: string
}

interface VolunteerRecord {
  id: number
  user: number | null        // FK id
  user_name?: string         // full name from backend
  username?: string          // username from backend
  name?: string              // direct name field
  voter_id?: string
  phone?: string
  phone2?: string
  booth: number | null
  booths?: number[]
  booth_names?: string[]
  ward: number | null
  panchayat?: number | null
  status?: string
  role?: string
  age?: number | null
  gender?: string
  joined_date?: string
  source?: string
  block?: string
  panchayat_name?: string
  union_name?: string
  skills?: string
  vehicle?: string
  volunteer_type?: string
  notes?: string
  created_at?: string
}

interface BeneficiaryRecord {
  id: number
  name: string
  voter_id?: string
  phone?: string
  phone2?: string
  age?: number | null
  gender?: string
  address?: string
  pincode?: string
  booth: number | null
  booth_name?: string
  booth_number?: string
  ward: number | null
  ward_name?: string
  block?: string
  panchayat_name?: string
  union_name?: string
  scheme: number | null
  scheme_display?: string
  scheme_name?: string
  benefit_type?: string
  benefit_status?: string
  benefit_amount?: string
  source?: string
  is_contacted?: boolean
  notes?: string
  created_at?: string
}

interface BoothRecord {
  id: number
  number: string
  name: string
  ward?: number | null
  ward_name?: string | null
  panchayat?: number | null
  constituency_name?: string
  total_voters: number
  status?: string
  sentiment?: string
  created_at?: string
}

interface EventAttendeeRecord {
  id: number
  event: number
  volunteer: number
  attendance_status: string
  attended_at?: string
}

interface ActivityLogRecord {
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
  assigned_to?: string
  created_at?: string
}

interface FieldSurveyRecord {
  id: number
  voter?: number | null     // FK to Voter — set when survey created via telecalling
  survey_date: string
  block?: string
  village?: string
  booth_no?: string
  voter_name: string
  age?: number
  gender?: string
  phone?: string
  address?: string
  is_registered?: string
  aware_of_candidate?: string
  likely_to_vote?: string
  support_level?: string
  party_preference?: string
  key_issues?: string
  remarks?: string
  response_status?: string
  surveyed_by?: string
  assigned_volunteer?: string   // volunteer assigned for field visit
  created_at?: string
}

interface CampaignEventRecord {
  id: number
  title: string
  description?: string
  event_type: string
  constituency: number
  scheduled_date: string
  scheduled_time?: string
  location: string
  status: string
  expected_attendees?: number
  actual_attendees?: number
  organized_by?: number
  organized_by_name?: string
  materials_prepared?: string
  outcome_notes?: string
  special_guest_name?: string
  attendees?: EventAttendeeRecord[]
  created_at?: string
}

interface TaskRecord {
  id: number
  task_type?: number | null
  task_type_name?: string
  title: string
  category: string
  task_category?: number | null
  task_category_name?: string
  task_category_color?: string
  details?: string
  expected_datetime: string
  venue?: string
  block?: number | null
  block_name?: string
  union?: number | null
  union_name?: string
  panchayat?: number | null
  panchayat_name?: string
  booth?: number | null
  booth_name?: string
  ward?: number | null
  ward_name?: string
  volunteer_role?: number | null
  volunteer_role_name?: string
  delivery_incharge?: number | null
  delivery_incharge_name?: string
  coordinator?: number | null
  coordinator_name?: string
  qty?: number
  status: string
  completed_datetime?: string | null
  notes?: string
  created_at?: string
  updated_at?: string
}

interface UseEntryAPIReturn {
  loading: boolean
  error: string | null
  // Voters
  fetchVoters: (boothId?: number, search?: string, page?: number, pageSize?: number, wardId?: number, pincode?: string, panchayatId?: number, unionId?: number, blockId?: number, ageGroup?: string, contactStatus?: string) => Promise<{ results: VoterRecord[]; count: number } | null>
  fetchVoter: (voterId: number) => Promise<VoterRecord | null>
  createVoter: (voterData: Partial<VoterRecord>) => Promise<VoterRecord | null>
  updateVoter: (voterId: number, voterData: Partial<VoterRecord>) => Promise<VoterRecord | null>
  deleteVoter: (voterId: number) => Promise<boolean>
  // Volunteers
  fetchVolunteers: (boothId?: number, search?: string, wardId?: number, page?: number, pageSize?: number, block?: string, union?: string, panchayat?: string, ageGroup?: string) => Promise<{ results: VolunteerRecord[]; count: number } | null>
  createVolunteer: (volunteerData: Partial<VolunteerRecord>) => Promise<VolunteerRecord | null>
  updateVolunteer: (volunteerId: number, volunteerData: Partial<VolunteerRecord>) => Promise<VolunteerRecord | null>
  // Booths
  fetchBooths: (constraintFilter?: number) => Promise<BoothRecord[] | null>
  updateBooth: (boothId: number, boothData: Partial<BoothRecord>) => Promise<BoothRecord | null>
  // Events
  fetchCampaignEvents: (filter?: any) => Promise<CampaignEventRecord[] | null>
  createCampaignEvent: (eventData: Partial<CampaignEventRecord>) => Promise<CampaignEventRecord | null>
  updateCampaignEvent: (eventId: number, eventData: Partial<CampaignEventRecord>) => Promise<CampaignEventRecord | null>
  deleteCampaignEvent: (eventId: number) => Promise<boolean>
  // Tasks
  fetchTasks: (filters?: Record<string, string | number>) => Promise<TaskRecord[] | null>
  createTask: (data: Partial<TaskRecord>) => Promise<TaskRecord | null>
  updateTask: (id: number, data: Partial<TaskRecord>) => Promise<TaskRecord | null>
  deleteTask: (id: number) => Promise<boolean>
  // Activity Logs
  fetchActivityLogs: (category: string) => Promise<ActivityLogRecord[] | null>
  createActivityLog: (data: Partial<ActivityLogRecord>) => Promise<ActivityLogRecord | null>
  updateActivityLog: (id: number, data: Partial<ActivityLogRecord>) => Promise<ActivityLogRecord | null>
  deleteActivityLog: (id: number) => Promise<boolean>
  // Field Surveys
  fetchFieldSurveys: () => Promise<FieldSurveyRecord[] | null>
  createFieldSurvey: (data: Partial<FieldSurveyRecord>) => Promise<FieldSurveyRecord | null>
  updateFieldSurvey: (id: number, data: Partial<FieldSurveyRecord>) => Promise<FieldSurveyRecord | null>
  deleteFieldSurvey: (id: number) => Promise<boolean>
  // Beneficiaries
  fetchBeneficiaries: (boothId?: number, search?: string, wardId?: number, page?: number, pageSize?: number, block?: string, union?: string, panchayat?: string, ageGroup?: string) => Promise<{ results: BeneficiaryRecord[]; count: number } | null>
  createBeneficiary: (data: Partial<BeneficiaryRecord>) => Promise<BeneficiaryRecord | null>
  updateBeneficiary: (id: number, data: Partial<BeneficiaryRecord>) => Promise<BeneficiaryRecord | null>
  deleteBeneficiary: (id: number) => Promise<boolean>
  // Bulk upload
  bulkUpload: (endpoint: string, file: File) => Promise<{ created: number; skipped: number; errors: { row: number; reason: string }[] } | null>
}

/**
 * Hook for managing entry module API operations
 */
export function useEntryAPI(): UseEntryAPIReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = (err: any, context: string) => {
    const axiosError = err as AxiosError<any>
    const message = axiosError.response?.data?.detail || `Failed to ${context}`
    setError(String(message))
    console.error(`[${context}]`, err)
  }

  // ==================== VOTERS ====================

  const fetchVoters = useCallback(
    async (boothId?: number, search?: string, page = 1, pageSize = 200, wardId?: number, pincode?: string, panchayatId?: number, unionId?: number, blockId?: number, ageGroup?: string, contactStatus?: string): Promise<{ results: VoterRecord[]; count: number } | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<ApiResponse<VoterRecord>>('/voters/voters/', {
          params: {
            ...(boothId     ? { booth:     boothId     } : {}),
            ...(search      ? { search }                 : {}),
            ...(wardId      ? { ward:      wardId      } : {}),
            ...(pincode     ? { pincode }                : {}),
            ...(panchayatId ? { panchayat: panchayatId } : {}),
            ...(unionId     ? { union:     unionId     } : {}),
            ...(blockId     ? { block:     blockId     } : {}),
            ...(ageGroup    ? { age_group: ageGroup    } : {}),
            ...(contactStatus ? { contact_status: contactStatus } : {}),
            limit:  pageSize,
            offset: (page - 1) * pageSize,
          },
        })
        return { results: data.results || [], count: data.count || 0 }
      } catch (err) {
        handleError(err, 'fetch voters')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const fetchVoter = useCallback(
    async (voterId: number): Promise<VoterRecord | null> => {
      try {
        const { data } = await apiClient.get<VoterRecord>(`/voters/voters/${voterId}/`)
        return data
      } catch (err) {
        handleError(err, 'fetch voter detail')
        return null
      }
    },
    []
  )

  const createVoter = useCallback(
    async (voterData: Partial<VoterRecord>): Promise<VoterRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.post<VoterRecord>('/voters/voters/', voterData)
        return data
      } catch (err) {
        handleError(err, 'create voter')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateVoter = useCallback(
    async (voterId: number, voterData: Partial<VoterRecord>): Promise<VoterRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<VoterRecord>(`/voters/voters/${voterId}/`, voterData)
        return data
      } catch (err) {
        handleError(err, 'update voter')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteVoter = useCallback(async (voterId: number): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.delete(`/voters/voters/${voterId}/`)
      return true
    } catch (err) {
      handleError(err, 'delete voter')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // ==================== VOLUNTEERS ====================

  const fetchVolunteers = useCallback(
    async (boothId?: number, search?: string, wardId?: number, page = 1, pageSize = 10, block?: string, union?: string, panchayat?: string, ageGroup?: string): Promise<{ results: VolunteerRecord[]; count: number } | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<ApiResponse<VolunteerRecord>>('/volunteers/volunteers/', {
          params: {
            limit:  pageSize,
            offset: (page - 1) * pageSize,
            ...(boothId   ? { booth:     boothId   } : {}),
            ...(search    ? { search }               : {}),
            ...(wardId    ? { ward:      wardId    } : {}),
            ...(block     ? { block }                : {}),
            ...(union     ? { union }                : {}),
            ...(panchayat ? { panchayat }            : {}),
            ...(ageGroup  ? { age_group: ageGroup  } : {}),
          },
        })
        return { results: data.results || [], count: data.count || 0 }
      } catch (err) {
        handleError(err, 'fetch volunteers')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createVolunteer = useCallback(
    async (volunteerData: Partial<VolunteerRecord>): Promise<VolunteerRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.post<VolunteerRecord>('/volunteers/volunteers/', volunteerData)
        return data
      } catch (err) {
        handleError(err, 'create volunteer')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateVolunteer = useCallback(
    async (volunteerId: number, volunteerData: Partial<VolunteerRecord>): Promise<VolunteerRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<VolunteerRecord>(
          `/volunteers/volunteers/${volunteerId}/`,
          volunteerData
        )
        return data
      } catch (err) {
        handleError(err, 'update volunteer')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // ==================== BOOTHS ====================

  const fetchBooths = useCallback(
    async (constraintFilter?: number): Promise<BoothRecord[] | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<ApiResponse<BoothRecord>>('/masters/booths/', {
          params: { limit: 1000 },
        })
        return data.results || []
      } catch (err) {
        handleError(err, 'fetch booths')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateBooth = useCallback(
    async (boothId: number, boothData: Partial<BoothRecord>): Promise<BoothRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<BoothRecord>(`/masters/booths/${boothId}/`, boothData)
        return data
      } catch (err) {
        handleError(err, 'update booth')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // ==================== CAMPAIGN EVENTS ====================

  const fetchCampaignEvents = useCallback(
    async (filter?: any): Promise<CampaignEventRecord[] | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<ApiResponse<CampaignEventRecord>>('/campaigns/events/', {
          params: { limit: 1000, ...filter },
        })
        return data.results || []
      } catch (err) {
        handleError(err, 'fetch campaign events')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createCampaignEvent = useCallback(
    async (eventData: Partial<CampaignEventRecord>): Promise<CampaignEventRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.post<CampaignEventRecord>('/campaigns/events/', eventData)
        return data
      } catch (err) {
        handleError(err, 'create campaign event')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateCampaignEvent = useCallback(
    async (eventId: number, eventData: Partial<CampaignEventRecord>): Promise<CampaignEventRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<CampaignEventRecord>(
          `/campaigns/events/${eventId}/`,
          eventData
        )
        return data
      } catch (err) {
        handleError(err, 'update campaign event')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteCampaignEvent = useCallback(
    async (eventId: number): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await apiClient.delete(`/campaigns/events/${eventId}/`)
        return true
      } catch (err) {
        handleError(err, 'delete campaign event')
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // ==================== TASKS ====================

  const fetchTasks = useCallback(async (
    filters?: Record<string, string | number>
  ): Promise<TaskRecord[] | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.get<ApiResponse<TaskRecord>>('/campaigns/tasks/', {
        params: { limit: 1000, ...filters },
      })
      return data.results || []
    } catch (err) { handleError(err, 'fetch tasks'); return null }
    finally { setLoading(false) }
  }, [])

  const createTask = useCallback(async (taskData: Partial<TaskRecord>): Promise<TaskRecord | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.post<TaskRecord>('/campaigns/tasks/', taskData)
      return data
    } catch (err) { handleError(err, 'create task'); return null }
    finally { setLoading(false) }
  }, [])

  const updateTask = useCallback(async (id: number, taskData: Partial<TaskRecord>): Promise<TaskRecord | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.patch<TaskRecord>(`/campaigns/tasks/${id}/`, taskData)
      return data
    } catch (err) { handleError(err, 'update task'); return null }
    finally { setLoading(false) }
  }, [])

  const deleteTask = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true); setError(null)
    try { await apiClient.delete(`/campaigns/tasks/${id}/`); return true }
    catch (err) { handleError(err, 'delete task'); return false }
    finally { setLoading(false) }
  }, [])

  // ==================== ACTIVITY LOGS ====================

  const fetchActivityLogs = useCallback(
    async (category: string): Promise<ActivityLogRecord[] | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<ApiResponse<ActivityLogRecord>>('/activities/logs/', {
          params: { limit: 1000, category },
        })
        return data.results || []
      } catch (err) {
        handleError(err, 'fetch activity logs')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createActivityLog = useCallback(
    async (logData: Partial<ActivityLogRecord>): Promise<ActivityLogRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.post<ActivityLogRecord>('/activities/logs/', logData)
        return data
      } catch (err) {
        handleError(err, 'create activity log')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateActivityLog = useCallback(
    async (id: number, logData: Partial<ActivityLogRecord>): Promise<ActivityLogRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<ActivityLogRecord>(`/activities/logs/${id}/`, logData)
        return data
      } catch (err) {
        handleError(err, 'update activity log')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteActivityLog = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.delete(`/activities/logs/${id}/`)
      return true
    } catch (err) {
      handleError(err, 'delete activity log')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // ==================== BENEFICIARIES ====================

  const fetchBeneficiaries = useCallback(
    async (boothId?: number, search?: string, wardId?: number, page = 1, pageSize = 10, block?: string, union?: string, panchayat?: string, ageGroup?: string): Promise<{ results: BeneficiaryRecord[]; count: number } | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.get<ApiResponse<BeneficiaryRecord>>('/beneficiaries/beneficiaries/', {
          params: {
            limit:  pageSize,
            offset: (page - 1) * pageSize,
            ...(boothId   ? { booth:     boothId   } : {}),
            ...(search    ? { search }               : {}),
            ...(wardId    ? { ward:      wardId    } : {}),
            ...(block     ? { block }                : {}),
            ...(union     ? { union }                : {}),
            ...(panchayat ? { panchayat }            : {}),
            ...(ageGroup  ? { age_group: ageGroup  } : {}),
          },
        })
        return { results: data.results || [], count: data.count || 0 }
      } catch (err) {
        handleError(err, 'fetch beneficiaries')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const createBeneficiary = useCallback(
    async (beneficiaryData: Partial<BeneficiaryRecord>): Promise<BeneficiaryRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.post<BeneficiaryRecord>('/beneficiaries/beneficiaries/', beneficiaryData)
        return data
      } catch (err) {
        handleError(err, 'create beneficiary')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateBeneficiary = useCallback(
    async (id: number, beneficiaryData: Partial<BeneficiaryRecord>): Promise<BeneficiaryRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<BeneficiaryRecord>(
          `/beneficiaries/beneficiaries/${id}/`,
          beneficiaryData
        )
        return data
      } catch (err) {
        handleError(err, 'update beneficiary')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteBeneficiary = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.delete(`/beneficiaries/beneficiaries/${id}/`)
      return true
    } catch (err) {
      handleError(err, 'delete beneficiary')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  // ==================== BULK UPLOAD ====================

  const bulkUpload = useCallback(
    async (
      endpoint: string,
      file: File
    ): Promise<{ created: number; skipped: number; errors: { row: number; reason: string }[] } | null> => {
      setLoading(true)
      setError(null)
      try {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await apiClient.post(endpoint, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
      } catch (err) {
        handleError(err, `bulk upload ${endpoint}`)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // ==================== FIELD SURVEYS ====================

  const fetchFieldSurveys = useCallback(async (): Promise<FieldSurveyRecord[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<ApiResponse<FieldSurveyRecord>>('/activities/surveys/', {
        params: { limit: 1000 },
      })
      return data.results || []
    } catch (err) {
      handleError(err, 'fetch field surveys')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createFieldSurvey = useCallback(
    async (surveyData: Partial<FieldSurveyRecord>): Promise<FieldSurveyRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.post<FieldSurveyRecord>('/activities/surveys/', surveyData)
        return data
      } catch (err) {
        handleError(err, 'create field survey')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateFieldSurvey = useCallback(
    async (id: number, surveyData: Partial<FieldSurveyRecord>): Promise<FieldSurveyRecord | null> => {
      setLoading(true)
      setError(null)
      try {
        const { data } = await apiClient.patch<FieldSurveyRecord>(`/activities/surveys/${id}/`, surveyData)
        return data
      } catch (err) {
        handleError(err, 'update field survey')
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteFieldSurvey = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await apiClient.delete(`/activities/surveys/${id}/`)
      return true
    } catch (err) {
      handleError(err, 'delete field survey')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    fetchVoters,
    fetchVoter,
    createVoter,
    updateVoter,
    deleteVoter,
    fetchVolunteers,
    createVolunteer,
    updateVolunteer,
    fetchBooths,
    updateBooth,
    fetchCampaignEvents,
    createCampaignEvent,
    updateCampaignEvent,
    deleteCampaignEvent,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    fetchActivityLogs,
    createActivityLog,
    updateActivityLog,
    deleteActivityLog,
    fetchFieldSurveys,
    createFieldSurvey,
    updateFieldSurvey,
    deleteFieldSurvey,
    fetchBeneficiaries,
    createBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    bulkUpload,
  }
}

export type { VoterRecord, VolunteerRecord, BoothRecord, CampaignEventRecord, TaskRecord, ActivityLogRecord, FieldSurveyRecord, BeneficiaryRecord }
