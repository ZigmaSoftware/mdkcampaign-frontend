import { useCallback, useState } from 'react'
import apiClient from '../utils/api'
import type { AxiosError } from 'axios'

interface ApiResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

interface Country { id: number; name: string; code: string }
interface State   { id: number; name: string; code: string; country: number }
interface District { id: number; name: string; code: string; state: number; state_name?: string }

interface Constituency {
  id: number; name: string; code: string; district: number
  district_name?: string; election_type?: string; total_booths?: number
}

interface Ward {
  id: number; name: string; code: string; constituency: number; constituency_name?: string; description?: string
}

interface Booth {
  id: number; number: string; name: string; code: string
  panchayat?: number | null; panchayat_name?: string; constituency_name?: string
  total_voters: number; male_voters?: number; female_voters?: number
  status?: string; sentiment?: string; address?: string
  village?: string; notes?: string
  primary_agent?: number | null; agent_name?: string
  agent_ids?: number[]; agent_names?: string[]
  primary_volunteer?: number | null; primary_volunteer_name?: string
}

interface VolunteerName {
  id: number; user_name: string; phone: string
}

interface Area {
  id: number; name: string; code: string; constituency: number
  constituency_name?: string; description?: string
}

interface Party {
  id: number; name: string; code: string; abbreviation?: string
  president_name?: string; headquarters?: string
}

interface Candidate {
  id: number; name: string; party: number; party_name?: string; constituency: number
}

interface Scheme {
  id: number; name: string; description?: string; scheme_type?: string
  constituency?: number; constituency_name?: string
  target_population?: number; beneficiaries?: number; budget?: number
  responsible_ministry?: string; launch_date?: string; end_date?: string
}

interface Achievement {
  id: number; name: string; description?: string; ward?: number; ward_name?: string; booth?: number; booth_name?: string
}

interface TaskCategory {
  id: number; name: string; description?: string; color?: string; icon?: string; priority?: number
}

interface CampaignActivityType {
  id: number; name: string; description?: string; order: number; is_active: boolean
}

interface VolunteerRole {
  id: number; name: string; description?: string; order: number
}

interface VolunteerType {
  id: number; name: string; description?: string; order: number
}

interface Panchayat {
  id: number; name: string; code?: string; category?: string; description?: string
  union?: number | null; union_name?: string
}

interface Union {
  id: number; name: string; code?: string; block?: number | null; block_name?: string; description?: string
}

export function useMasterAPI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleError = (err: any, context: string) => {
    const axiosError = err as AxiosError<any>
    const msg = axiosError.response?.data?.detail
      || JSON.stringify(axiosError.response?.data)
      || `Failed to ${context}`
    setError(String(msg))
    console.error(`[${context}]`, err)
  }

  // ── generic helpers ──────────────────────────────────────────────
  const getList = useCallback(async <T>(url: string, params?: any): Promise<T[] | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.get<ApiResponse<T>>(url, { params: { limit: 1000, ...params } })
      return data.results || []
    } catch (err) { handleError(err, `fetch ${url}`); return null }
    finally { setLoading(false) }
  }, [])

  const createOne = useCallback(async <T>(url: string, payload: any): Promise<T | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.post<T>(url, payload)
      return data
    } catch (err) { handleError(err, `create ${url}`); return null }
    finally { setLoading(false) }
  }, [])

  const updateOne = useCallback(async <T>(url: string, payload: any): Promise<T | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.patch<T>(url, payload)
      return data
    } catch (err) { handleError(err, `update ${url}`); return null }
    finally { setLoading(false) }
  }, [])

  const deleteOne = useCallback(async (url: string): Promise<boolean> => {
    setLoading(true); setError(null)
    try { await apiClient.delete(url); return true }
    catch (err) { handleError(err, `delete ${url}`); return false }
    finally { setLoading(false) }
  }, [])

  // ── Countries / States / Districts ──────────────────────────────
  const fetchCountries    = useCallback(() => getList<Country>('/masters/countries/'), [getList])
  const fetchStates       = useCallback((countryId?: number) =>
    getList<State>('/masters/states/', countryId ? { country: countryId } : undefined), [getList])
  const fetchDistricts    = useCallback((stateId?: number) =>
    getList<District>('/masters/districts/', stateId ? { state: stateId } : undefined), [getList])
  const createDistrict    = useCallback((d: Partial<District>) =>
    createOne<District>('/masters/districts/', d), [createOne])
  const updateDistrict    = useCallback((id: number, d: Partial<District>) =>
    updateOne<District>(`/masters/districts/${id}/`, d), [updateOne])
  const deleteDistrict    = useCallback((id: number) =>
    deleteOne(`/masters/districts/${id}/`), [deleteOne])

  // ── Constituencies ───────────────────────────────────────────────
  const fetchConstituencies = useCallback((districtId?: number) =>
    getList<Constituency>('/masters/constituencies/', districtId ? { district: districtId } : undefined), [getList])
  const createConstituency  = useCallback((d: Partial<Constituency>) =>
    createOne<Constituency>('/masters/constituencies/', d), [createOne])
  const updateConstituency  = useCallback((id: number, d: Partial<Constituency>) =>
    updateOne<Constituency>(`/masters/constituencies/${id}/`, d), [updateOne])
  const deleteConstituency  = useCallback((id: number) =>
    deleteOne(`/masters/constituencies/${id}/`), [deleteOne])

  // ── Wards / Villages (same master data, aliased for voter entry) ─
  const fetchWards    = useCallback((constituencyId?: number) =>
    getList<Ward>('/masters/wards/', constituencyId ? { constituency: constituencyId } : undefined), [getList])
  const fetchVillages = useCallback((constituencyId?: number) =>
    getList<Ward>('/masters/wards/', constituencyId ? { constituency: constituencyId } : undefined), [getList])
  const createWard  = useCallback((d: Partial<Ward>) =>
    createOne<Ward>('/masters/wards/', d), [createOne])
  const updateWard  = useCallback((id: number, d: Partial<Ward>) =>
    updateOne<Ward>(`/masters/wards/${id}/`, d), [updateOne])
  const deleteWard  = useCallback((id: number) =>
    deleteOne(`/masters/wards/${id}/`), [deleteOne])

  // ── Booths ───────────────────────────────────────────────────────
  const fetchBooths  = useCallback(() =>
    getList<Booth>('/masters/booths/'), [getList])
  const createBooth  = useCallback((d: Partial<Booth>) =>
    createOne<Booth>('/masters/booths/', d), [createOne])
  const updateBooth  = useCallback((id: number, d: Partial<Booth>) =>
    updateOne<Booth>(`/masters/booths/${id}/`, d), [updateOne])
  const deleteBooth  = useCallback((id: number) =>
    deleteOne(`/masters/booths/${id}/`), [deleteOne])

  // ── Areas (PollingArea) ──────────────────────────────────────────
  const fetchAreas  = useCallback(() => getList<Area>('/masters/areas/'), [getList])
  const createArea  = useCallback((d: Partial<Area>) =>
    createOne<Area>('/masters/areas/', d), [createOne])
  const updateArea  = useCallback((id: number, d: Partial<Area>) =>
    updateOne<Area>(`/masters/areas/${id}/`, d), [updateOne])
  const deleteArea  = useCallback((id: number) =>
    deleteOne(`/masters/areas/${id}/`), [deleteOne])

  // ── Parties ──────────────────────────────────────────────────────
  const fetchParties  = useCallback(() => getList<Party>('/masters/parties/'), [getList])
  const createParty   = useCallback((d: Partial<Party>) =>
    createOne<Party>('/masters/parties/', d), [createOne])
  const updateParty   = useCallback((id: number, d: Partial<Party>) =>
    updateOne<Party>(`/masters/parties/${id}/`, d), [updateOne])
  const deleteParty   = useCallback((id: number) =>
    deleteOne(`/masters/parties/${id}/`), [deleteOne])

  // ── Candidates ───────────────────────────────────────────────────
  const fetchCandidates  = useCallback((constituencyId?: number) =>
    getList<Candidate>('/masters/candidates/', constituencyId ? { constituency: constituencyId } : undefined), [getList])
  const createCandidate  = useCallback((d: Partial<Candidate>) =>
    createOne<Candidate>('/masters/candidates/', d), [createOne])
  const updateCandidate  = useCallback((id: number, d: Partial<Candidate>) =>
    updateOne<Candidate>(`/masters/candidates/${id}/`, d), [updateOne])
  const deleteCandidate  = useCallback((id: number) =>
    deleteOne(`/masters/candidates/${id}/`), [deleteOne])

  // ── Schemes ──────────────────────────────────────────────────────
  const fetchSchemes  = useCallback(() => getList<Scheme>('/masters/schemes/'), [getList])
  const createScheme  = useCallback((d: Partial<Scheme>) =>
    createOne<Scheme>('/masters/schemes/', d), [createOne])
  const updateScheme  = useCallback((id: number, d: Partial<Scheme>) =>
    updateOne<Scheme>(`/masters/schemes/${id}/`, d), [updateOne])
  const deleteScheme  = useCallback((id: number) =>
    deleteOne(`/masters/schemes/${id}/`), [deleteOne])

  // ── Achievements ─────────────────────────────────────────────────
  const fetchAchievements  = useCallback(() => getList<Achievement>('/masters/achievements/'), [getList])
  const createAchievement  = useCallback((d: Partial<Achievement>) =>
    createOne<Achievement>('/masters/achievements/', d), [createOne])
  const updateAchievement  = useCallback((id: number, d: Partial<Achievement>) =>
    updateOne<Achievement>(`/masters/achievements/${id}/`, d), [updateOne])
  const deleteAchievement  = useCallback((id: number) =>
    deleteOne(`/masters/achievements/${id}/`), [deleteOne])

  // ── Task Categories ───────────────────────────────────────────
  const fetchTaskCategories = useCallback(() =>
    getList<TaskCategory>('/masters/task-categories/'), [getList])
  const createTaskCategory  = useCallback((d: Partial<TaskCategory>) =>
    createOne<TaskCategory>('/masters/task-categories/', d), [createOne])
  const updateTaskCategory  = useCallback((id: number, d: Partial<TaskCategory>) =>
    updateOne<TaskCategory>(`/masters/task-categories/${id}/`, d), [updateOne])
  const deleteTaskCategory  = useCallback((id: number) =>
    deleteOne(`/masters/task-categories/${id}/`), [deleteOne])

  // ── Campaign Activity Types ───────────────────────────────────
  const fetchCampaignActivityTypes = useCallback(() =>
    getList<CampaignActivityType>('/masters/campaign-activity-types/'), [getList])
  const createCampaignActivityType = useCallback((d: Partial<CampaignActivityType>) =>
    createOne<CampaignActivityType>('/masters/campaign-activity-types/', d), [createOne])
  const updateCampaignActivityType = useCallback((id: number, d: Partial<CampaignActivityType>) =>
    updateOne<CampaignActivityType>(`/masters/campaign-activity-types/${id}/`, d), [updateOne])
  const deleteCampaignActivityType = useCallback((id: number) =>
    deleteOne(`/masters/campaign-activity-types/${id}/`), [deleteOne])

  // ── Volunteer Types ───────────────────────────────────────────
  const fetchVolunteerTypes = useCallback(() =>
    getList<VolunteerType>('/masters/volunteer-types/'), [getList])
  const createVolunteerType = useCallback((d: Partial<VolunteerType>) =>
    createOne<VolunteerType>('/masters/volunteer-types/', d), [createOne])
  const updateVolunteerType = useCallback((id: number, d: Partial<VolunteerType>) =>
    updateOne<VolunteerType>(`/masters/volunteer-types/${id}/`, d), [updateOne])
  const deleteVolunteerType = useCallback((id: number) =>
    deleteOne(`/masters/volunteer-types/${id}/`), [deleteOne])

  // ── Volunteer Roles ───────────────────────────────────────────
  const fetchVolunteerRoles = useCallback(() =>
    getList<VolunteerRole>('/masters/volunteer-roles/'), [getList])
  const createVolunteerRole = useCallback((d: Partial<VolunteerRole>) =>
    createOne<VolunteerRole>('/masters/volunteer-roles/', d), [createOne])
  const updateVolunteerRole = useCallback((id: number, d: Partial<VolunteerRole>) =>
    updateOne<VolunteerRole>(`/masters/volunteer-roles/${id}/`, d), [updateOne])
  const deleteVolunteerRole = useCallback((id: number) =>
    deleteOne(`/masters/volunteer-roles/${id}/`), [deleteOne])

  // ── Panchayats ────────────────────────────────────────────────
  const fetchPanchayats = useCallback(() =>
    getList<Panchayat>('/masters/panchayats/'), [getList])
  const createPanchayat = useCallback((d: Partial<Panchayat>) =>
    createOne<Panchayat>('/masters/panchayats/', d), [createOne])
  const updatePanchayat = useCallback((id: number, d: Partial<Panchayat>) =>
    updateOne<Panchayat>(`/masters/panchayats/${id}/`, d), [updateOne])
  const deletePanchayat = useCallback((id: number) =>
    deleteOne(`/masters/panchayats/${id}/`), [deleteOne])

  // ── Unions ────────────────────────────────────────────────────
  const fetchUnions = useCallback((blockId?: number) =>
    getList<Union>('/masters/unions/', blockId ? { block: blockId } : undefined), [getList])
  const createUnion = useCallback((d: Partial<Union>) =>
    createOne<Union>('/masters/unions/', d), [createOne])
  const updateUnion = useCallback((id: number, d: Partial<Union>) =>
    updateOne<Union>(`/masters/unions/${id}/`, d), [updateOne])
  const deleteUnion = useCallback((id: number) =>
    deleteOne(`/masters/unions/${id}/`), [deleteOne])

  // ── Bulk upload (shared) ──────────────────────────────────────
  const bulkUpload = useCallback(async (
    endpoint: string,
    file: File
  ): Promise<{ created: number; skipped: number; errors: {row: number; reason: string}[] } | null> => {
    setLoading(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await apiClient.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data
    } catch (err) { handleError(err, `bulk upload ${endpoint}`); return null }
    finally { setLoading(false) }
  }, [])

  // ── Volunteers (names for agent multiselect) ─────────────────
  const fetchVolunteerNames = useCallback(async (): Promise<VolunteerName[] | null> => {
    setLoading(true); setError(null)
    try {
      const { data } = await apiClient.get<VolunteerName[]>('/volunteers/volunteers/names/')
      return data
    } catch (err) { handleError(err, 'fetch volunteer names'); return null }
    finally { setLoading(false) }
  }, [])

  return {
    loading, error,
    fetchCountries, fetchStates, fetchDistricts, createDistrict, updateDistrict, deleteDistrict,
    fetchConstituencies, createConstituency, updateConstituency, deleteConstituency,
    fetchWards, fetchVillages, createWard, updateWard, deleteWard,
    fetchBooths, createBooth, updateBooth, deleteBooth,
    fetchAreas, createArea, updateArea, deleteArea,
    fetchParties, createParty, updateParty, deleteParty,
    fetchCandidates, createCandidate, updateCandidate, deleteCandidate,
    fetchSchemes, createScheme, updateScheme, deleteScheme,
    fetchAchievements, createAchievement, updateAchievement, deleteAchievement,
    fetchTaskCategories, createTaskCategory, updateTaskCategory, deleteTaskCategory,
    fetchCampaignActivityTypes, createCampaignActivityType, updateCampaignActivityType, deleteCampaignActivityType,
    fetchVolunteerNames,
    fetchVolunteerTypes, createVolunteerType, updateVolunteerType, deleteVolunteerType,
    fetchVolunteerRoles, createVolunteerRole, updateVolunteerRole, deleteVolunteerRole,
    fetchPanchayats, createPanchayat, updatePanchayat, deletePanchayat,
    fetchUnions, createUnion, updateUnion, deleteUnion,
    bulkUpload,
  }
}

export type Village = Ward
export type { Country, State, District, Constituency, Ward, Booth, Area, Party, Candidate, Scheme, Achievement, TaskCategory, CampaignActivityType, VolunteerName, VolunteerRole, VolunteerType, Panchayat, Union }
export type UseMasterAPIReturn = ReturnType<typeof useMasterAPI>
