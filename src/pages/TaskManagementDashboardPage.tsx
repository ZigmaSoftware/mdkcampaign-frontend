import { useEffect, useMemo, useRef, useState } from 'react'
import SectionHeader from '../components/ui/SectionHeader'
import { SearchableSelect } from '../components/entry/SearchableSelect'
import { inputCls } from '../components/entry/FormGroup'
import { usePermissions } from '../context/PermissionContext'
import { useEntryAPI } from '../hooks/useEntryAPI'
import type { TaskRecord } from '../hooks/useEntryAPI'
import { useMasterAPI } from '../hooks/useMasterAPI'
import type { Area, Booth, Panchayat, TaskCategory, TaskType, Union, Ward } from '../hooks/useMasterAPI'
import { exportTasksCsv } from '../utils/exportCsv'
import { formatTaskDateTime, getTaskStatusDisplay } from '../hooks/useDashboardData'

interface TaskManagementDashboardPageProps {
  onOpenTaskEntry?: () => void
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const ESTIMATED_DATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'due', label: 'Due' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
]

type DueBucket = 'due' | 'overdue' | 'completed' | 'other'

const getDueBucket = (task: TaskRecord): DueBucket => {
  if (task.status === 'completed') return 'completed'
  if (task.status === 'cancelled') return 'other'

  const expectedAt = new Date(task.expected_datetime).getTime()
  if (Number.isNaN(expectedAt)) return 'other'

  return expectedAt < Date.now() ? 'overdue' : 'due'
}

const getDueBadge = (bucket: DueBucket) => {
  if (bucket === 'overdue') {
    return { label: 'Overdue', bg: '#fee2e2', color: '#dc2626' }
  }
  if (bucket === 'completed') {
    return { label: 'Completed', bg: '#dcfce7', color: '#138808' }
  }
  return { label: 'Due', bg: '#fff3e0', color: '#e07010' }
}

const buildLocationLabel = (task: TaskRecord) => {
  return [
    task.venue,
    task.block_name,
    task.union_name,
    task.panchayat_name,
    task.booth_name,
    task.ward_name,
  ].filter(Boolean).join(' · ')
}

export default function TaskManagementDashboardPage({
  onOpenTaskEntry,
}: TaskManagementDashboardPageProps) {
  const { canView, loaded } = usePermissions()
  const api = useEntryAPI()
  const masterApi = useMasterAPI()

  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [allCategories, setAllCategories] = useState<TaskCategory[]>([])
  const [blocks, setBlocks] = useState<Area[]>([])
  const [allUnions, setAllUnions] = useState<Union[]>([])
  const [allPanchayats, setAllPanchayats] = useState<Panchayat[]>([])
  const [allBooths, setAllBooths] = useState<Booth[]>([])
  const [allWards, setAllWards] = useState<Ward[]>([])

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [listTaskTypeId, setListTaskTypeId] = useState('')
  const [listTaskCatId, setListTaskCatId] = useState('')
  const [estimatedDateStatus, setEstimatedDateStatus] = useState('')
  const [listStatus, setListStatus] = useState('')
  const [listBlockId, setListBlockId] = useState('')
  const [listUnionId, setListUnionId] = useState('')
  const [listPanchayatId, setListPanchayatId] = useState('')
  const [listBoothId, setListBoothId] = useState('')
  const [listWardId, setListWardId] = useState('')

  const firstTaskRender = useRef(true)

  useEffect(() => {
    let cancelled = false

    Promise.all([
      masterApi.fetchTaskTypes(),
      masterApi.fetchTaskCategories(),
      masterApi.fetchAreas(),
      masterApi.fetchUnions(),
      masterApi.fetchPanchayats(),
      masterApi.fetchBooths(),
      masterApi.fetchWards(),
    ]).then(([taskTypeRows, categoryRows, blockRows, unionRows, panchayatRows, boothRows, wardRows]) => {
      if (cancelled) return
      setTaskTypes(taskTypeRows ?? [])
      setAllCategories(categoryRows ?? [])
      setBlocks(blockRows ?? [])
      setAllUnions(unionRows ?? [])
      setAllPanchayats(panchayatRows ?? [])
      setAllBooths(boothRows ?? [])
      setAllWards(wardRows ?? [])
    })

    return () => {
      cancelled = true
    }
  }, [])

  const loadTasks = () => {
    setLoadingTasks(true)
    const filters: Record<string, string> = {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(listTaskTypeId ? { task_type: listTaskTypeId } : {}),
      ...(listTaskCatId ? { task_category: listTaskCatId } : {}),
      ...(listStatus ? { status: listStatus } : {}),
      ...(listBlockId ? { block: listBlockId } : {}),
      ...(listUnionId ? { union: listUnionId } : {}),
      ...(listPanchayatId ? { panchayat: listPanchayatId } : {}),
      ...(listBoothId ? { booth: listBoothId } : {}),
      ...(listWardId ? { ward: listWardId } : {}),
    }

    api.fetchTasks(filters)
      .then(rows => setTasks(rows ?? []))
      .finally(() => setLoadingTasks(false))
  }

  useEffect(() => {
    loadTasks()
  }, [])

  useEffect(() => {
    if (firstTaskRender.current) {
      firstTaskRender.current = false
      return
    }

    const timer = setTimeout(() => loadTasks(), 250)
    return () => clearTimeout(timer)
  }, [dateFrom, dateTo, listTaskTypeId, listTaskCatId, listStatus, listBlockId, listUnionId, listPanchayatId, listBoothId, listWardId])

  const filteredCategories = listTaskTypeId
    ? allCategories.filter(category => category.task_type != null && String(category.task_type) === listTaskTypeId)
    : allCategories

  const listUnions = listBlockId
    ? allUnions.filter(union => String(union.block ?? '') === listBlockId)
    : allUnions

  const listPanchayats = listUnionId
    ? allPanchayats.filter(panchayat => String(panchayat.union ?? '') === listUnionId)
    : listBlockId
      ? allPanchayats.filter(panchayat => listUnions.some(union => union.id === panchayat.union))
      : allPanchayats

  const listBooths = listPanchayatId
    ? allBooths.filter(booth => String(booth.panchayat ?? '') === listPanchayatId)
    : allBooths

  const listWards = listBoothId
    ? (() => {
        const booth = allBooths.find(row => String(row.id) === listBoothId)
        if (!booth?.ward) return [] as Ward[]
        return allWards.filter(ward => ward.id === booth.ward)
      })()
    : allWards

  const taskTypeOptions = taskTypes.map(taskType => ({
    value: String(taskType.id),
    label: taskType.name,
  }))

  const taskCategoryOptions = filteredCategories.map(category => ({
    value: String(category.id),
    label: category.name,
  }))

  const blockOptions = blocks.map(block => ({ value: String(block.id), label: block.name }))
  const unionOptions = listUnions.map(union => ({ value: String(union.id), label: union.name }))
  const panchayatOptions = listPanchayats.map(panchayat => ({ value: String(panchayat.id), label: panchayat.name }))
  const boothOptions = listBooths.map(booth => ({ value: String(booth.id), label: booth.name || booth.number }))
  const wardOptions = listWards.map(ward => ({ value: String(ward.id), label: ward.name }))

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return [...tasks]
      .filter(task => {
        if (!query) return true
        return (
          task.title.toLowerCase().includes(query) ||
          (task.task_type_name ?? '').toLowerCase().includes(query) ||
          (task.task_category_name ?? '').toLowerCase().includes(query) ||
          (task.venue ?? '').toLowerCase().includes(query) ||
          (task.delivery_incharge_name ?? '').toLowerCase().includes(query) ||
          (task.coordinator_name ?? '').toLowerCase().includes(query) ||
          (task.details ?? '').toLowerCase().includes(query)
        )
      })
      .filter(task => !estimatedDateStatus || getDueBucket(task) === estimatedDateStatus)
      .sort((left, right) => {
        const leftTime = new Date(left.expected_datetime).getTime()
        const rightTime = new Date(right.expected_datetime).getTime()
        return leftTime - rightTime
      })
  }, [tasks, search, estimatedDateStatus])

  const dueCount = filteredTasks.filter(task => getDueBucket(task) === 'due').length
  const overdueCount = filteredTasks.filter(task => getDueBucket(task) === 'overdue').length

  const hasTaskFilters = !!(
    dateFrom || dateTo || search || listTaskTypeId || listTaskCatId || estimatedDateStatus ||
    listStatus || listBlockId || listUnionId || listPanchayatId || listBoothId || listWardId
  )

  const clearTaskFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setListTaskTypeId('')
    setListTaskCatId('')
    setEstimatedDateStatus('')
    setListStatus('')
    setListBlockId('')
    setListUnionId('')
    setListPanchayatId('')
    setListBoothId('')
    setListWardId('')
  }

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <SectionHeader
          title="Task Management Dashboard"
          icon="ph ph-kanban"
          subtitle="Filter tasks by estimated date, status, and location"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportTasksCsv(filteredTasks)}
            disabled={filteredTasks.length === 0}
            className="inline-flex items-center gap-2 rounded-[10px] border border-kampgreen bg-kampgreen/10 px-4 py-[10px] text-[11px] font-bold uppercase tracking-[0.8px] text-kampgreen shadow-card hover:bg-kampgreen hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="ph ph-microsoft-excel-logo text-[14px]" />
            Export Excel
          </button>

          {onOpenTaskEntry && loaded && canView('event') && (
            <button
              type="button"
              onClick={onOpenTaskEntry}
              className="inline-flex items-center gap-2 rounded-[10px] bg-saffron px-4 py-[10px] text-[11px] font-bold uppercase tracking-[0.8px] text-navy shadow-card hover:bg-saffron-dark hover:text-white transition-colors"
            >
              <i className="ph ph-plus-circle text-[14px]" />
              Add Task
            </button>
          )}
        </div>
      </div>

      {loaded && !canView('event') ? (
        <div className="bg-surface border border-border rounded-card p-6 text-[13px] text-muted">
          You do not have access to Task Management.
        </div>
      ) : (
        <>
          <div className="bg-surface rounded-card shadow-card border border-border px-[18px] py-[16px] mb-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <i className="ph ph-faders-horizontal text-[16px] text-navy" />
                <span className="text-[11px] font-extrabold tracking-[1px] uppercase text-navy">
                  Task Filters
                </span>
              </div>
              {hasTaskFilters && (
                <button
                  type="button"
                  onClick={clearTaskFilters}
                  className="text-[10px] font-bold uppercase tracking-[0.6px] text-kampr hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-3">
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Search</label>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={inputCls}
                  placeholder="Search tasks..."
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Task Type</label>
                <SearchableSelect
                  value={listTaskTypeId}
                  onChange={value => {
                    setListTaskTypeId(value)
                    setListTaskCatId('')
                  }}
                  options={taskTypeOptions}
                  placeholder="All Task Types"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Task Category</label>
                <SearchableSelect
                  value={listTaskCatId}
                  onChange={setListTaskCatId}
                  options={taskCategoryOptions}
                  placeholder={listTaskTypeId ? 'All Categories' : 'Select Task Type first'}
                  disabled={!listTaskTypeId}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Estimated Date</label>
                <SearchableSelect
                  value={estimatedDateStatus}
                  onChange={setEstimatedDateStatus}
                  options={ESTIMATED_DATE_OPTIONS}
                  placeholder="All"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Status</label>
                <SearchableSelect
                  value={listStatus}
                  onChange={setListStatus}
                  options={STATUS_OPTIONS}
                  placeholder="All Status"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Block</label>
                <SearchableSelect
                  value={listBlockId}
                  onChange={value => {
                    setListBlockId(value)
                    setListUnionId('')
                    setListPanchayatId('')
                    setListBoothId('')
                    setListWardId('')
                  }}
                  options={blockOptions}
                  placeholder="All Blocks"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Union</label>
                <SearchableSelect
                  value={listUnionId}
                  onChange={value => {
                    setListUnionId(value)
                    setListPanchayatId('')
                    setListBoothId('')
                    setListWardId('')
                  }}
                  options={unionOptions}
                  placeholder="All Unions"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Panchayat</label>
                <SearchableSelect
                  value={listPanchayatId}
                  onChange={value => {
                    setListPanchayatId(value)
                    setListBoothId('')
                    setListWardId('')
                  }}
                  options={panchayatOptions}
                  placeholder="All Panchayats"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Booth</label>
                <SearchableSelect
                  value={listBoothId}
                  onChange={value => {
                    setListBoothId(value)
                    setListWardId('')
                  }}
                  options={boothOptions}
                  placeholder="All Booths"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-muted uppercase tracking-[0.7px] mb-1">Ward</label>
                <SearchableSelect
                  value={listWardId}
                  onChange={setListWardId}
                  options={wardOptions}
                  placeholder="All Wards"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="bg-surface rounded-card shadow-card border border-border border-l-[4px] border-l-saffron px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[1px] text-muted">Due</div>
              <div className="mt-1 text-[30px] font-black text-saffron">{dueCount}</div>
              <div className="text-[10px] text-muted">Tasks pending within estimated date</div>
            </div>

            <div className="bg-surface rounded-card shadow-card border border-border border-l-[4px] border-l-kampr px-5 py-4">
              <div className="text-[10px] font-bold uppercase tracking-[1px] text-muted">Overdue</div>
              <div className="mt-1 text-[30px] font-black text-kampr">{overdueCount}</div>
              <div className="text-[10px] text-muted">Tasks past estimated date and still open</div>
            </div>
          </div>

          <div className="bg-surface rounded-card shadow-card overflow-hidden">
            <div className="bg-navy text-white px-[18px] py-[11px] flex items-center justify-between gap-3">
              <h3 className="font-inter text-[11px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
                <i className="ph ph-list-checks" />
                Filtered Tasks
              </h3>
              <span className="inline-flex items-center gap-1 rounded-[10px] bg-saffron px-[10px] py-[4px] text-[9px] font-bold uppercase tracking-[0.5px] text-navy">
                {filteredTasks.length} Tasks
              </span>
            </div>

            <div className="px-[18px] py-[16px]">
              {loadingTasks ? (
                <div className="flex items-center justify-center py-16 text-muted">
                  <i className="ph ph-spinner-gap animate-spin text-[28px]" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted gap-2">
                  <i className="ph ph-list-checks text-[30px] opacity-30" />
                  <p className="text-[12px]">No tasks found for the selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[960px] text-left">
                    <thead>
                      <tr className="border-b border-border bg-navy-light/40">
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">#</th>
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">Task</th>
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">Type</th>
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">Category</th>
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">Estimated Date</th>
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">Due Status</th>
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">Task Status</th>
                        <th className="px-4 py-3 text-[10px] font-extrabold uppercase tracking-[1px] text-navy">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map((task, index) => {
                        const dueBadge = getDueBadge(getDueBucket(task))
                        const statusBadge = getTaskStatusDisplay(task.status)
                        const location = buildLocationLabel(task)

                        return (
                          <tr key={task.id} className="border-b border-border last:border-b-0 hover:bg-surface-alt transition-colors">
                            <td className="px-4 py-4 text-[12px] font-bold text-navy">{index + 1}</td>
                            <td className="px-4 py-4">
                              <div className="max-w-[280px]">
                                <p className="text-[12px] font-semibold text-heading">{task.title}</p>
                                {(task.delivery_incharge_name || task.coordinator_name) && (
                                  <p className="mt-1 text-[10px] text-muted">
                                    {task.delivery_incharge_name ? `Incharge: ${task.delivery_incharge_name}` : ''}
                                    {task.delivery_incharge_name && task.coordinator_name ? ' · ' : ''}
                                    {task.coordinator_name ? `Coord: ${task.coordinator_name}` : ''}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-[11px] text-muted">{task.task_type_name || '—'}</td>
                            <td className="px-4 py-4">
                              {task.task_category_name ? (
                                <span
                                  className="rounded-full px-2 py-[3px] text-[9px] font-bold"
                                  style={{
                                    background: task.task_category_color ? `${task.task_category_color}22` : '#ede9fe',
                                    color: task.task_category_color || '#7c3aed',
                                  }}
                                >
                                  {task.task_category_name}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-4 text-[11px] text-muted">{formatTaskDateTime(task.expected_datetime)}</td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-[4px] text-[10px] font-bold ${dueBadge.label === 'Due' ? 'animate-pulse' : ''}`}
                                style={{ background: dueBadge.bg, color: dueBadge.color }}
                              >
                                {dueBadge.label}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className="rounded-full px-3 py-[4px] text-[10px] font-bold"
                                style={{ background: statusBadge.bg, color: statusBadge.color }}
                              >
                                {statusBadge.text}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-[11px] text-muted">{location || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
