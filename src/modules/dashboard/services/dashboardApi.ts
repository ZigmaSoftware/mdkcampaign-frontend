import apiClient from '../../../utils/api'

export interface DashboardQueryFilters {
  date?: string
  block?: string
  union?: string
  panchayat?: string
  booth?: string
  telecaller?: string
  volunteer_role?: string
  limit?: number
}

export interface DashboardBreakdownItem {
  key: string
  label: string
  count: number
  pct?: number
  overall_count?: number
  positive_count?: number
  neutral_count?: number
  negative_count?: number
}

export interface DashboardKpis {
  total_voters: number
  surveyed_voters: number
  total_surveyed: number
  assigned_voters: number
  coverage_pct: number
  positive_pct: number
  positive_percent: number
  negative_risk_pct: number
  not_reachable_pct: number
  followup_pct: number
  followup_not_required_pct: number
  telecaller_count: number
}

export interface DashboardSummaryResponse {
  filters: {
    date: string
    block: string
    union: string
    panchayat: string
    booth: string
    telecaller: string
    volunteer_role: string
  }
  kpis: DashboardKpis
  support_breakdown: DashboardBreakdownItem[]
  gender_breakdown: DashboardBreakdownItem[]
  age_breakdown: DashboardBreakdownItem[]
  awareness_breakdown: DashboardBreakdownItem[]
  vote_likelihood_breakdown: DashboardBreakdownItem[]
  response_breakdown: DashboardBreakdownItem[]
  party_preference_breakdown: DashboardBreakdownItem[]
}

export interface BoothRankingRow {
  id: number
  rank: number
  booth_number: string
  booth_name: string
  panchayat: string
  union: string
  block: string
  total_voters: number
  surveyed_voters: number
  positive: number
  negative: number
  neutral: number
  followup: number
  coverage_pct: number
  positive_pct: number
  negative_pct: number
  followup_pct: number
  score: number
}

export interface BoothRankingResponse {
  rows: BoothRankingRow[]
}

export interface TelecallerEfficiencyRow {
  rank: number
  telecaller_id: number | null
  telecaller_name: string
  phone: string
  role: string
  assigned_voters: number
  surveyed_voters: number
  positive: number
  negative: number
  neutral: number
  followups: number
  closed_followups: number
  assigned_booths: number
  reach_pct: number
  positive_pct: number
  followup_pct: number
  followup_not_required_pct: number
  efficiency_score: number
}

export interface TelecallerEfficiencyResponse {
  rows: TelecallerEfficiencyRow[]
}

export interface TaskPanelSummary {
  total: number
  pending: number
  in_progress: number
  completed: number
  cancelled: number
  overdue: number
  open: number
  completion_pct: number
}

export interface TaskPanelItem {
  id: number
  title: string
  status: string
  expected_datetime: string
  task_category: string
  task_category_color: string
  volunteer_role: string
  coordinator: string
  delivery_incharge: string
  booth: string
  booth_number: string
  ward: string
  venue: string
  notes: string
}

export interface TaskPanelResponse {
  summary: TaskPanelSummary
  items: TaskPanelItem[]
}

export interface DashboardFilterOptions {
  blocks: { id: number; label: string; name: string }[]
  unions: { id: number; label: string; name: string; block_id: number | null; block_name: string }[]
  panchayats: {
    id: number
    label: string
    name: string
    union_id: number | null
    union_name: string
    block_id: number | null
    block_name: string
  }[]
  booths: {
    id: number
    label: string
    number: string
    name: string
    panchayat_id: number | null
    panchayat_name: string
    union_id: number | null
    union_name: string
    block_id: number | null
    block_name: string
  }[]
  telecallers: { id: number; name: string; phone: string; role: string }[]
  volunteer_roles: string[]
}

const buildParams = (filters: DashboardQueryFilters) => {
  const params: Record<string, string | number> = {}
  if (filters.date) params.date = filters.date
  if (filters.block) params.block = filters.block
  if (filters.union) params.union = filters.union
  if (filters.panchayat) params.panchayat = filters.panchayat
  if (filters.booth) params.booth = filters.booth
  if (filters.telecaller) params.telecaller = filters.telecaller
  if (filters.volunteer_role) params.volunteer_role = filters.volunteer_role
  if (filters.limit) params.limit = filters.limit
  return params
}

export async function getSummary(filters: DashboardQueryFilters): Promise<DashboardSummaryResponse> {
  const { data } = await apiClient.get<DashboardSummaryResponse>('/dashboard/summary/', {
    params: buildParams(filters),
  })
  return data
}

export async function getBoothRanking(filters: DashboardQueryFilters): Promise<BoothRankingResponse> {
  const { data } = await apiClient.get<BoothRankingResponse>('/dashboard/booths/', {
    params: buildParams(filters),
  })
  return data
}

export async function getTelecallerEfficiency(filters: DashboardQueryFilters): Promise<TelecallerEfficiencyResponse> {
  const { data } = await apiClient.get<TelecallerEfficiencyResponse>('/dashboard/telecallers/', {
    params: buildParams(filters),
  })
  return data
}

export async function getFilterOptions(): Promise<DashboardFilterOptions> {
  const { data } = await apiClient.get<DashboardFilterOptions>('/dashboard/filters/')
  return data
}
