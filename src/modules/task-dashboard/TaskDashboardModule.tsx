import { useEffect, useMemo, useState } from 'react'

import { SearchableSelect } from '../../components/entry/SearchableSelect'
import { inputCls } from '../../components/entry/FormGroup'
import Badge from '../../components/ui/Badge'
import SectionHeader from '../../components/ui/SectionHeader'
import { useToast } from '../../context/ToastContext'
import CampaignActivityTable from './components/CampaignActivityTable'
import TaskListTable from './components/TaskListTable'
import TaskStatusChart from './components/TaskStatusChart'
import TaskSummaryCards from './components/TaskSummaryCards'
import TaskTypeCategoryChart from './components/TaskTypeCategoryChart'
import {
  getCampaignActivityStatus,
  getTaskDashboardFilterOptions,
  getTaskDashboardList,
  getTaskDashboardSummary,
  getTaskDashboardTypeCategory,
  type CampaignActivityStatusResponse,
  type TaskDashboardFilterOptions,
  type TaskDashboardFilters,
  type TaskDashboardListResponse,
  type TaskDashboardSummaryResponse,
  type TaskDashboardTypeCategoryResponse,
} from './services/taskDashboardApi'

const DEFAULT_FILTERS: TaskDashboardFilters = {
  from_date: '',
  to_date: '',
  task_type: '',
  task_category: '',
  module: '',
  limit: 200,
}

const EMPTY_SUMMARY: TaskDashboardSummaryResponse = {
  filters: { from_date: '', to_date: '', task_type: '', task_category: '', module: '', limit: 200 },
  counts: { today: 0, tomorrow: 0, overdue: 0, pending: 0, completed: 0, cancelled: 0, total: 0 },
  derived: {
    completion_rate_pct: 0,
    overdue_risk_pct: 0,
    campaign_task_ratio_pct: 0,
    avg_completion_time_hours: 0,
    avg_completion_time_label: '0h',
  },
  status_breakdown: [],
  due_breakdown: [],
}

const EMPTY_LIST: TaskDashboardListResponse = {
  filters: EMPTY_SUMMARY.filters,
  total: 0,
  rows: [],
}

const EMPTY_TYPE_CATEGORY: TaskDashboardTypeCategoryResponse = {
  filters: EMPTY_SUMMARY.filters,
  type_distribution: [],
  category_workload: [],
}

const EMPTY_ACTIVITY_STATUS: CampaignActivityStatusResponse = {
  filters: EMPTY_SUMMARY.filters,
  rows: [],
}

const EMPTY_OPTIONS: TaskDashboardFilterOptions = {
  modules: [],
  task_types: [],
  task_categories: [],
}

function ActiveFilterBadge({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-saffron/25 bg-saffron/10 px-[10px] py-[3px] text-[10px] font-semibold text-navy">
      <span className="text-muted">{label}:</span>
      {value}
    </span>
  )
}

export default function TaskDashboardModule() {
  const { showToast } = useToast()
  const [options, setOptions] = useState<TaskDashboardFilterOptions>(EMPTY_OPTIONS)
  const [draftFilters, setDraftFilters] = useState<TaskDashboardFilters>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<TaskDashboardFilters>(DEFAULT_FILTERS)
  const [summary, setSummary] = useState<TaskDashboardSummaryResponse>(EMPTY_SUMMARY)
  const [list, setList] = useState<TaskDashboardListResponse>(EMPTY_LIST)
  const [typeCategory, setTypeCategory] = useState<TaskDashboardTypeCategoryResponse>(EMPTY_TYPE_CATEGORY)
  const [activityStatus, setActivityStatus] = useState<CampaignActivityStatusResponse>(EMPTY_ACTIVITY_STATUS)
  const [loading, setLoading] = useState(true)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoadingOptions(true)
    getTaskDashboardFilterOptions()
      .then(data => setOptions(data || EMPTY_OPTIONS))
      .catch(() => setOptions(EMPTY_OPTIONS))
      .finally(() => setLoadingOptions(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      getTaskDashboardSummary(appliedFilters),
      getTaskDashboardList(appliedFilters),
      getTaskDashboardTypeCategory(appliedFilters),
      getCampaignActivityStatus(appliedFilters),
    ])
      .then(([summaryData, listData, typeCategoryData, activityData]) => {
        if (cancelled) return
        setSummary(summaryData || EMPTY_SUMMARY)
        setList(listData || EMPTY_LIST)
        setTypeCategory(typeCategoryData || EMPTY_TYPE_CATEGORY)
        setActivityStatus(activityData || EMPTY_ACTIVITY_STATUS)
      })
      .catch((err: any) => {
        if (cancelled) return
        console.error('[task-dashboard-module]', err)
        setSummary(EMPTY_SUMMARY)
        setList(EMPTY_LIST)
        setTypeCategory(EMPTY_TYPE_CATEGORY)
        setActivityStatus(EMPTY_ACTIVITY_STATUS)
        setError('Unable to load task intelligence right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [appliedFilters])

  const moduleOptions = useMemo(
    () => options.modules.map(item => ({ value: item.value, label: item.label })),
    [options.modules],
  )

  const typeOptions = useMemo(
    () => options.task_types.map(value => ({ value, label: value })),
    [options.task_types],
  )

  const categoryOptions = useMemo(
    () => options.task_categories.map(value => ({ value, label: value })),
    [options.task_categories],
  )

  const activeValues = useMemo(() => ({
    from_date: appliedFilters.from_date || '',
    to_date: appliedFilters.to_date || '',
    module: options.modules.find(item => item.value === appliedFilters.module)?.label || appliedFilters.module || '',
    task_type: appliedFilters.task_type || '',
    task_category: appliedFilters.task_category || '',
  }), [appliedFilters, options.modules])

  const handleApply = () => {
    setAppliedFilters({ ...draftFilters })
    showToast('<i class="ph ph-funnel"></i> Task dashboard filters applied', '#0d2455')
  }

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    showToast('<i class="ph ph-arrow-counter-clockwise"></i> Task dashboard filters reset', '#138808')
  }

  const handleRefresh = () => {
    setAppliedFilters({ ...appliedFilters })
    showToast('<i class="ph ph-arrows-clockwise"></i> Task dashboard refreshed', '#0d2455')
  }

  return (
    <div className="mb-6">
      <div className="bg-surface rounded-card shadow-card border border-border px-[18px] py-[16px] mb-5">
        <SectionHeader
          title="Unified Task Intelligence"
          icon="ph ph-chart-pie-slice"
          subtitle={loadingOptions ? 'Loading filter options…' : 'Read-only analytics across task management and campaign tasks'}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-3">
          <div>
            <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">From Date</label>
            <input
              type="date"
              value={draftFilters.from_date || ''}
              onChange={e => setDraftFilters(prev => ({ ...prev, from_date: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">To Date</label>
            <input
              type="date"
              value={draftFilters.to_date || ''}
              onChange={e => setDraftFilters(prev => ({ ...prev, to_date: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Module</label>
            <SearchableSelect
              value={draftFilters.module || ''}
              onChange={value => setDraftFilters(prev => ({ ...prev, module: value }))}
              options={moduleOptions}
              placeholder="All Modules"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Task Type</label>
            <SearchableSelect
              value={draftFilters.task_type || ''}
              onChange={value => setDraftFilters(prev => ({ ...prev, task_type: value }))}
              options={typeOptions}
              placeholder="All Task Types"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Task Category</label>
            <SearchableSelect
              value={draftFilters.task_category || ''}
              onChange={value => setDraftFilters(prev => ({ ...prev, task_category: value }))}
              options={categoryOptions}
              placeholder="All Categories"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex flex-wrap gap-2">
            <ActiveFilterBadge label="From" value={activeValues.from_date} />
            <ActiveFilterBadge label="To" value={activeValues.to_date} />
            <ActiveFilterBadge label="Module" value={activeValues.module} />
            <ActiveFilterBadge label="Type" value={activeValues.task_type} />
            <ActiveFilterBadge label="Category" value={activeValues.task_category} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-[7px] text-[10px] font-bold uppercase tracking-[0.7px] text-muted hover:text-navy hover:border-saffron transition-all"
            >
              <i className="ph ph-arrow-counter-clockwise" />
              Reset
            </button>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 rounded-md border border-navy/20 bg-navy-light px-3 py-[7px] text-[10px] font-bold uppercase tracking-[0.7px] text-navy hover:bg-navy hover:text-white transition-all"
            >
              <i className="ph ph-arrows-clockwise" />
              Refresh
            </button>
            <button
              onClick={handleApply}
              disabled={loadingOptions}
              className="inline-flex items-center gap-1 rounded-md border border-kampgreen/40 bg-kampgreen-light px-3 py-[7px] text-[10px] font-bold uppercase tracking-[0.7px] text-kampgreen-dark hover:bg-kampgreen hover:text-white transition-all disabled:opacity-60"
            >
              <i className="ph ph-funnel-simple" />
              Apply
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[11px] text-[#991b1b]">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-4">
        <SectionHeader
          title="Highlights"
          icon="ph ph-lightning"
          subtitle="Unified KPIs, status analytics, campaign activity tracking, and drilldown list"
        />
        <Badge label={`${summary.counts.total.toLocaleString('en-IN')} items`} variant="blue" />
      </div>

      <TaskSummaryCards summary={summary} />

      {loading ? (
        <div className="bg-surface rounded-card shadow-card px-[18px] py-[18px] text-[11px] text-muted italic">
          Loading task intelligence…
        </div>
      ) : (
        <>
          <TaskStatusChart
            statusItems={summary.status_breakdown}
            dueItems={summary.due_breakdown}
          />
          <TaskTypeCategoryChart
            typeRows={typeCategory.type_distribution}
            categoryRows={typeCategory.category_workload}
          />
          <CampaignActivityTable rows={activityStatus.rows} />
          <TaskListTable rows={list.rows} />
        </>
      )}
    </div>
  )
}
