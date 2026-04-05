import apiClient from '../../../utils/api'

export interface TaskDashboardFilters {
  from_date?: string
  to_date?: string
  task_type?: string
  task_category?: string
  module?: string
  limit?: number
}

export interface TaskDashboardBreakdownItem {
  key: string
  label: string
  count: number
  color?: string
}

export interface TaskDashboardSummaryResponse {
  filters: {
    from_date: string
    to_date: string
    task_type: string
    task_category: string
    module: string
    limit: number
  }
  counts: {
    today: number
    tomorrow: number
    overdue: number
    pending: number
    completed: number
    cancelled: number
    total: number
  }
  derived: {
    completion_rate_pct: number
    overdue_risk_pct: number
    campaign_task_ratio_pct: number
    avg_completion_time_hours: number
    avg_completion_time_label: string
  }
  status_breakdown: TaskDashboardBreakdownItem[]
  due_breakdown: TaskDashboardBreakdownItem[]
}

export interface UnifiedTaskRow {
  id: string
  source_id: number
  title: string
  task_type: string
  task_category: string
  status: string
  status_display: string
  raw_status: string
  due_date: string
  due_datetime: string
  created_at: string
  module: 'task' | 'campaign'
  module_label: string
  details: string
  location: string
  owner: string
  completion_hours: number | null
  due_bucket: string
}

export interface TaskDashboardListResponse {
  filters: TaskDashboardSummaryResponse['filters']
  total: number
  rows: UnifiedTaskRow[]
}

export interface TaskAnalyticsRow {
  label: string
  total: number
  pending: number
  completed: number
  cancelled: number
  today: number
  tomorrow: number
  overdue: number
  task_count: number
  campaign_count: number
  completion_rate_pct: number
}

export interface TaskDashboardTypeCategoryResponse {
  filters: TaskDashboardSummaryResponse['filters']
  type_distribution: TaskAnalyticsRow[]
  category_workload: TaskAnalyticsRow[]
}

export interface CampaignActivityStatusRow {
  activity_name: string
  event_type: string
  planned: number
  in_progress: number
  completed: number
  pending: number
  overdue: number
  total: number
  is_unmapped: boolean
}

export interface CampaignActivityStatusResponse {
  filters: TaskDashboardSummaryResponse['filters']
  rows: CampaignActivityStatusRow[]
}

export interface TaskDashboardFilterOptions {
  modules: { value: string; label: string }[]
  task_types: string[]
  task_categories: string[]
}

const buildParams = (filters: TaskDashboardFilters) => {
  const params: Record<string, string | number> = {}
  if (filters.from_date) params.from_date = filters.from_date
  if (filters.to_date) params.to_date = filters.to_date
  if (filters.task_type) params.task_type = filters.task_type
  if (filters.task_category) params.task_category = filters.task_category
  if (filters.module) params.module = filters.module
  if (filters.limit) params.limit = filters.limit
  return params
}

export async function getTaskDashboardSummary(filters: TaskDashboardFilters): Promise<TaskDashboardSummaryResponse> {
  const { data } = await apiClient.get<TaskDashboardSummaryResponse>('/dashboard/task-dashboard/summary/', {
    params: buildParams(filters),
  })
  return data
}

export async function getTaskDashboardList(filters: TaskDashboardFilters): Promise<TaskDashboardListResponse> {
  const { data } = await apiClient.get<TaskDashboardListResponse>('/dashboard/task-dashboard/list/', {
    params: buildParams(filters),
  })
  return data
}

export async function getTaskDashboardTypeCategory(filters: TaskDashboardFilters): Promise<TaskDashboardTypeCategoryResponse> {
  const { data } = await apiClient.get<TaskDashboardTypeCategoryResponse>('/dashboard/task-dashboard/type-category/', {
    params: buildParams(filters),
  })
  return data
}

export async function getCampaignActivityStatus(filters: TaskDashboardFilters): Promise<CampaignActivityStatusResponse> {
  const { data } = await apiClient.get<CampaignActivityStatusResponse>('/dashboard/task-dashboard/campaign-activity-status/', {
    params: buildParams(filters),
  })
  return data
}

export async function getTaskDashboardFilterOptions(): Promise<TaskDashboardFilterOptions> {
  const { data } = await apiClient.get<TaskDashboardFilterOptions>('/dashboard/task-dashboard/filters/')
  return data
}
