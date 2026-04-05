import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import Badge from '../../components/ui/Badge'
import SectionHeader from '../../components/ui/SectionHeader'
import { useToast } from '../../context/ToastContext'
import {
  getBoothRanking,
  getFilterOptions,
  getSummary,
  getTelecallerEfficiency,
  type BoothRankingResponse,
  type DashboardFilterOptions,
  type DashboardKpis,
  type DashboardQueryFilters,
  type DashboardSummaryResponse,
  type TelecallerEfficiencyResponse,
} from './services/dashboardApi'

const SummaryCards = lazy(() => import('./components/SummaryCards'))
const SurveyCharts = lazy(() => import('./components/SurveyCharts'))
const BoothTable = lazy(() => import('./components/BoothTable'))
const TelecallingTable = lazy(() => import('./components/TelecallingTable'))

const DEFAULT_FILTERS: DashboardQueryFilters = {
  date: '',
  block: '',
  union: '',
  panchayat: '',
  booth: '',
  telecaller: '',
  volunteer_role: '',
  limit: 500,
}

const EMPTY_SUMMARY: DashboardSummaryResponse = {
  filters: { date: '', block: '', union: '', panchayat: '', booth: '', telecaller: '', volunteer_role: '' },
  kpis: {
    total_voters: 0,
    surveyed_voters: 0,
    total_surveyed: 0,
    assigned_voters: 0,
    coverage_pct: 0,
    positive_pct: 0,
    positive_percent: 0,
    negative_risk_pct: 0,
    not_reachable_pct: 0,
    followup_pct: 0,
    followup_not_required_pct: 0,
    telecaller_count: 0,
  },
  support_breakdown: [],
  awareness_breakdown: [],
  vote_likelihood_breakdown: [],
  response_breakdown: [],
  party_preference_breakdown: [],
}

const EMPTY_OPTIONS: DashboardFilterOptions = {
  blocks: [],
  unions: [],
  panchayats: [],
  booths: [],
  telecallers: [],
  volunteer_roles: [],
}

const EMPTY_BOOTHS: BoothRankingResponse = { rows: [] }
const EMPTY_TELECALLERS: TelecallerEfficiencyResponse = { rows: [] }

function LoadingPanel() {
  return (
    <div className="bg-surface rounded-card shadow-card px-[18px] py-[18px] text-[11px] text-muted italic">
      Loading dashboard insights…
    </div>
  )
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

export default function CampaignDashboardPage() {
  const { showToast } = useToast()
  const [options, setOptions] = useState<DashboardFilterOptions>(EMPTY_OPTIONS)
  const [draftFilters, setDraftFilters] = useState<DashboardQueryFilters>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<DashboardQueryFilters>(DEFAULT_FILTERS)
  const [summary, setSummary] = useState<DashboardSummaryResponse>(EMPTY_SUMMARY)
  const [booths, setBooths] = useState<BoothRankingResponse>(EMPTY_BOOTHS)
  const [telecallers, setTelecallers] = useState<TelecallerEfficiencyResponse>(EMPTY_TELECALLERS)
  const [loading, setLoading] = useState(true)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoadingOptions(true)
    getFilterOptions()
      .then(setOptions)
      .catch(() => setOptions(EMPTY_OPTIONS))
      .finally(() => setLoadingOptions(false))
  }, [])

  const filteredUnions = useMemo(
    () => options.unions.filter(union =>
      !draftFilters.block || String(union.block_id) === draftFilters.block
    ),
    [options.unions, draftFilters.block],
  )

  const filteredPanchayats = useMemo(
    () => options.panchayats.filter(panchayat => {
      if (draftFilters.union) return String(panchayat.union_id) === draftFilters.union
      if (draftFilters.block) return String(panchayat.block_id) === draftFilters.block
      return true
    }),
    [options.panchayats, draftFilters.block, draftFilters.union],
  )

  const filteredBooths = useMemo(
    () => options.booths.filter(booth => {
      if (draftFilters.panchayat) return String(booth.panchayat_id) === draftFilters.panchayat
      if (draftFilters.union) return String(booth.union_id) === draftFilters.union
      if (draftFilters.block) return String(booth.block_id) === draftFilters.block
      return true
    }),
    [options.booths, draftFilters.block, draftFilters.union, draftFilters.panchayat],
  )

  const filteredVolunteers = useMemo(
    () => options.telecallers.filter(volunteer =>
      !draftFilters.volunteer_role || (volunteer.role || '').toLowerCase() === draftFilters.volunteer_role?.toLowerCase()
    ),
    [options.telecallers, draftFilters.volunteer_role],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      getSummary(appliedFilters),
      getBoothRanking(appliedFilters),
      getTelecallerEfficiency(appliedFilters),
    ])
      .then(([summaryData, boothData, telecallerData]) => {
        if (cancelled) return
        setSummary(summaryData || EMPTY_SUMMARY)
        setBooths(boothData || EMPTY_BOOTHS)
        setTelecallers(telecallerData || EMPTY_TELECALLERS)
      })
      .catch((err: any) => {
        if (cancelled) return
        console.error('[activity-dashboard]', err)
        setSummary(EMPTY_SUMMARY)
        setBooths(EMPTY_BOOTHS)
        setTelecallers(EMPTY_TELECALLERS)
        setError('Unable to load dashboard data right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [appliedFilters])

  const activeFilterValues = useMemo(() => ({
    date: appliedFilters.date || '',
    block: options.blocks.find(item => String(item.id) === appliedFilters.block)?.label || appliedFilters.block || '',
    union: options.unions.find(item => String(item.id) === appliedFilters.union)?.label || appliedFilters.union || '',
    panchayat: options.panchayats.find(item => String(item.id) === appliedFilters.panchayat)?.label || appliedFilters.panchayat || '',
    booth: options.booths.find(item => String(item.id) === appliedFilters.booth)?.label || appliedFilters.booth || '',
    telecaller: options.telecallers.find(item => String(item.id) === appliedFilters.telecaller)?.name || appliedFilters.telecaller || '',
    volunteerRole: appliedFilters.volunteer_role || '',
  }), [appliedFilters, options])

  const handleApply = () => {
    setAppliedFilters({ ...draftFilters })
    showToast('<i class="ph ph-funnel"></i> Activity dashboard filters applied', '#0d2455')
  }

  const handleReset = () => {
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
    showToast('<i class="ph ph-arrow-counter-clockwise"></i> Dashboard filters reset', '#138808')
  }

  const handleRefresh = () => {
    setAppliedFilters({ ...appliedFilters })
    showToast('<i class="ph ph-arrows-clockwise"></i> Dashboard refreshed', '#0d2455')
  }

  const kpis: DashboardKpis = summary.kpis || EMPTY_SUMMARY.kpis

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2 page-enter">
      <div className="mb-4 rounded-[18px] overflow-hidden border border-[#d6e2f6] shadow-card">
        <div
          className="px-6 py-5"
          style={{ background: 'linear-gradient(135deg,#071a3f 0%,#0d2455 55%,#12357b 100%)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[1.4px] text-white/45 mb-[8px]">Analytics / Activity Dashboard</div>
              <h1 className="text-white text-[26px] font-black tracking-[-0.4px] leading-tight">
                Activity Dashboard
              </h1>
              <p className="text-[12px] text-white/65 mt-[8px] max-w-[720px] leading-relaxed">
                Read-only campaign intelligence across voter surveys, telecalling flow, and booth performance.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge label={`Surveyed ${kpis.surveyed_voters.toLocaleString('en-IN')}`} variant="s" />
              <Badge label={`Coverage ${kpis.coverage_pct}%`} variant="blue" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-card shadow-card px-[18px] py-[16px] mb-5">
        <SectionHeader title="Filters" icon="ph ph-funnel" subtitle={loadingOptions ? 'Loading filter options…' : 'Read-only scope controls'} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
          <label className="flex flex-col gap-[6px]">
            <span className="text-[10px] uppercase tracking-[0.6px] text-muted">Date</span>
            <input
              type="date"
              value={draftFilters.date || ''}
              onChange={e => setDraftFilters(prev => ({ ...prev, date: e.target.value }))}
              className="form-input text-[11px]"
            />
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[10px] uppercase tracking-[0.6px] text-muted">Block</span>
            <select
              value={draftFilters.block || ''}
              onChange={e => setDraftFilters(prev => ({
                ...prev,
                block: e.target.value,
                union: '',
                panchayat: '',
                booth: '',
              }))}
              className="form-input text-[11px]"
            >
              <option value="">All Blocks</option>
              {options.blocks.map(block => (
                <option key={block.id} value={String(block.id)}>{block.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[10px] uppercase tracking-[0.6px] text-muted">Union</span>
            <select
              value={draftFilters.union || ''}
              onChange={e => setDraftFilters(prev => ({
                ...prev,
                union: e.target.value,
                panchayat: '',
                booth: '',
              }))}
              className="form-input text-[11px]"
            >
              <option value="">All Unions</option>
              {filteredUnions.map(union => (
                <option key={union.id} value={String(union.id)}>{union.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[10px] uppercase tracking-[0.6px] text-muted">Panchayat</span>
            <select
              value={draftFilters.panchayat || ''}
              onChange={e => setDraftFilters(prev => ({
                ...prev,
                panchayat: e.target.value,
                booth: '',
              }))}
              className="form-input text-[11px]"
            >
              <option value="">All Panchayats</option>
              {filteredPanchayats.map(panchayat => (
                <option key={panchayat.id} value={String(panchayat.id)}>{panchayat.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[10px] uppercase tracking-[0.6px] text-muted">Booth</span>
            <select
              value={draftFilters.booth || ''}
              onChange={e => setDraftFilters(prev => ({ ...prev, booth: e.target.value }))}
              className="form-input text-[11px]"
            >
              <option value="">All Booths</option>
              {filteredBooths.map(booth => (
                <option key={booth.id} value={String(booth.id)}>{booth.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[10px] uppercase tracking-[0.6px] text-muted">Volunteer Role</span>
            <select
              value={draftFilters.volunteer_role || ''}
              onChange={e => setDraftFilters(prev => ({
                ...prev,
                volunteer_role: e.target.value,
                telecaller: '',
              }))}
              className="form-input text-[11px]"
            >
              <option value="">All Roles</option>
              {options.volunteer_roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[10px] uppercase tracking-[0.6px] text-muted">Volunteer</span>
            <select
              value={draftFilters.telecaller || ''}
              onChange={e => setDraftFilters(prev => ({ ...prev, telecaller: e.target.value }))}
              className="form-input text-[11px]"
            >
              <option value="">All Volunteers</option>
              {filteredVolunteers.map(volunteer => (
                <option key={volunteer.id} value={String(volunteer.id)}>
                  {volunteer.name}{volunteer.role ? ` · ${volunteer.role}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
          <div className="flex flex-wrap gap-2">
            <ActiveFilterBadge label="Date" value={activeFilterValues.date} />
            <ActiveFilterBadge label="Block" value={activeFilterValues.block} />
            <ActiveFilterBadge label="Union" value={activeFilterValues.union} />
            <ActiveFilterBadge label="Panchayat" value={activeFilterValues.panchayat} />
            <ActiveFilterBadge label="Booth" value={activeFilterValues.booth} />
            <ActiveFilterBadge label="Role" value={activeFilterValues.volunteerRole} />
            <ActiveFilterBadge label="Volunteer" value={activeFilterValues.telecaller} />
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

      <Suspense fallback={<LoadingPanel />}>
        <SummaryCards kpis={kpis} />
        {loading ? (
          <LoadingPanel />
        ) : (
          <>
            <SurveyCharts
              support={summary.support_breakdown}
              awareness={summary.awareness_breakdown}
              voteLikelihood={summary.vote_likelihood_breakdown}
              response={summary.response_breakdown}
              partyPreference={summary.party_preference_breakdown}
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
              <BoothTable rows={booths.rows} />
              <TelecallingTable rows={telecallers.rows} />
            </div>
          </>
        )}
      </Suspense>
    </div>
  )
}
