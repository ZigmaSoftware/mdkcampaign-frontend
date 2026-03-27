import React, { useState, useEffect, useMemo } from 'react'
import apiClient from '../../utils/api'
import { getGroups, subscribe as storeSubscribe, removeVoterByName } from '../../utils/telecallingStore'
import type { AssignmentGroup } from '../../utils/telecallingStore'
import {
  getDecisions, setDecision, subscribe as reviewSubscribe,
  getDecisionByRecordId,
} from '../../utils/feedbackReviewStore'
import type { ReviewAction, ReviewDecision } from '../../utils/feedbackReviewStore'
import { selectCls, inputCls } from '../../components/entry/FormGroup'
import { useToast } from '../../context/ToastContext'

/* ── Types ── */
interface SurveyRecord {
  id:                number
  voter_name:        string
  phone?:            string
  booth_no?:         string
  support_level?:    string
  response_status?:  string
  aware_of_candidate?: string
  likely_to_vote?:   string
  remarks?:          string
  surveyed_by?:      string
  survey_date?:      string
}

/* ── Colour helpers ── */
const supportColor = (s?: string) => {
  if (!s) return 'bg-gray-100 text-gray-500'
  if (s.includes('Strong Support'))  return 'bg-green-100 text-green-700'
  if (s.includes('Leaning Support')) return 'bg-emerald-100 text-emerald-700'
  if (s.includes('Neutral'))         return 'bg-yellow-100 text-yellow-700'
  if (s.includes('Against'))         return 'bg-red-100 text-red-600'
  return 'bg-blue-100 text-blue-700'
}

const responseLabel = (s?: string) => {
  if (s === 'interested')      return 'Interested'
  if (s === 'not_reach')       return 'Not Reach'
  if (s === 'not_attend_call') return 'Not Attend Call'
  if (s === 'need_followups')  return 'Need Followup'
  return s || '—'
}

const responseColor = (s?: string) => {
  if (s === 'interested')      return 'bg-green-100 text-green-700'
  if (s === 'not_reach')       return 'bg-red-100 text-red-600'
  if (s === 'not_attend_call') return 'bg-orange-100 text-orange-600'
  if (s === 'need_followups')  return 'bg-purple-100 text-purple-700'
  return 'bg-gray-100 text-gray-500'
}

/* ── Section label ── */
function SectionLabel({ icon, label, count, color }: {
  icon: string; label: string; count: number; color: string
}) {
  return (
    <div className={`flex items-center gap-2 px-5 py-2 border-b border-border ${color}`}>
      <i className={icon} />
      <span className="text-[10px] font-bold uppercase tracking-[1px]">{label}</span>
      <span className="ml-auto text-[10px] font-semibold opacity-70">{count}</span>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════ */
export default function FeedbackReview() {
  const { showToast } = useToast()

  /* ── Telecalling store ── */
  const [groups, setGroups] = useState<AssignmentGroup[]>(getGroups())
  useEffect(() => storeSubscribe(() => setGroups(getGroups())), [])

  /* Build voter→telecaller map from assignments */
  const telecallerByVoterName = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string }>()
    groups.forEach(g =>
      g.voters.forEach(v =>
        map.set(v.name.toLowerCase(), { name: g.telecaller.name, phone: g.telecaller.phone })
      )
    )
    return map
  }, [groups])

  /* ── Submitted feedback records ── */
  const [surveys,  setSurveys]  = useState<SurveyRecord[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    setLoading(true)
    apiClient.get('/activities/surveys/', { params: { limit: 1000 } })
      .then(r => setSurveys(r.data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  /* ── Review decisions ── */
  const [decisions, setDecisions] = useState<ReviewDecision[]>(getDecisions())
  useEffect(() => reviewSubscribe(() => setDecisions(getDecisions())), [])

  const decisionMap = useMemo(() => {
    const m = new Map<number, ReviewDecision>()
    decisions.forEach(d => m.set(d.record_id, d))
    return m
  }, [decisions])

  /* ── Filters ── */
  const [filterTab,        setFilterTab]        = useState<'all' | 'pending' | 'followup_required' | 'followup_not_required'>('all')
  const [filterTelecaller, setFilterTelecaller] = useState('')
  const [search,           setSearch]           = useState('')

  /* Unique telecallers from assignments */
  const telecallerOptions = useMemo(() => {
    const seen = new Map<string, string>()
    groups.forEach(g => seen.set(g.telecaller.name, g.telecaller.name))
    return [...seen.entries()].map(([, name]) => name)
  }, [groups])

  /* ── Filtered list ── */
  const filteredSurveys = useMemo(() => {
    let list = surveys
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.voter_name?.toLowerCase().includes(q) ||
        s.surveyed_by?.toLowerCase().includes(q) ||
        s.booth_no?.includes(q)
      )
    }
    if (filterTelecaller) {
      list = list.filter(s => {
        const tc = telecallerByVoterName.get(s.voter_name?.toLowerCase() ?? '')
        return tc?.name === filterTelecaller
      })
    }
    if (filterTab !== 'all') {
      list = list.filter(s => {
        const dec = decisionMap.get(s.id)
        if (filterTab === 'pending')                 return !dec
        if (filterTab === 'followup_required')       return dec?.action === 'followup_required'
        if (filterTab === 'followup_not_required')   return dec?.action === 'followup_not_required'
        return true
      })
    }
    return list
  }, [surveys, search, filterTelecaller, filterTab, decisionMap, telecallerByVoterName])

  /* Counts for tab badges */
  const counts = useMemo(() => ({
    all:                  surveys.length,
    pending:              surveys.filter(s => !decisionMap.has(s.id)).length,
    followup_required:    surveys.filter(s => decisionMap.get(s.id)?.action === 'followup_required').length,
    followup_not_required: surveys.filter(s => decisionMap.get(s.id)?.action === 'followup_not_required').length,
  }), [surveys, decisionMap])

  /* ── Action handler ── */
  const handleAction = (survey: SurveyRecord, action: ReviewAction) => {
    const tc = telecallerByVoterName.get(survey.voter_name?.toLowerCase() ?? '')
    const decision: ReviewDecision = {
      record_id:       survey.id,
      voter_name:      survey.voter_name,
      telecaller_name: tc?.name ?? survey.surveyed_by ?? '—',
      action,
      date:            new Date().toISOString().slice(0, 10),
    }
    setDecision(decision)
    if (action === 'followup_required') {
      removeVoterByName(survey.voter_name)
    }
    showToast(
      `<i class="ph ph-check-circle"></i> ${action === 'followup_required' ? 'Followup Required — voter reset to assign list' : 'No Followup'} marked for ${survey.voter_name}`,
      action === 'followup_required' ? '#f59e0b' : '#138808'
    )
  }

  /* ── Survey row ── */
  const SurveyRow = ({ survey }: { survey: SurveyRecord }) => {
    const dec = decisionMap.get(survey.id)
    const tc  = telecallerByVoterName.get(survey.voter_name?.toLowerCase() ?? '')

    return (
      <div className={`border-b border-border transition-colors
        ${dec?.action === 'followup_required'     ? 'bg-orange-50/40' :
          dec?.action === 'followup_not_required' ? 'bg-green-50/30'  : ''}`}>

        {/* Main row */}
        <div className="flex items-start gap-3 px-5 py-3">

          {/* Status dot */}
          <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0
            ${dec?.action === 'followup_required'     ? 'bg-orange-400' :
              dec?.action === 'followup_not_required' ? 'bg-green-500'  : 'bg-border'}`}
          />

          {/* Voter + feedback info */}
          <div className="flex-1 min-w-0">
            {/* Row 1: name + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[13px] font-semibold text-heading">{survey.voter_name}</span>
              {survey.booth_no && (
                <span className="px-1.5 py-0.5 rounded-full bg-navy/10 text-navy text-[10px] font-medium">
                  {survey.booth_no}
                </span>
              )}
              {survey.support_level && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${supportColor(survey.support_level)}`}>
                  {survey.support_level}
                </span>
              )}
              {survey.response_status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${responseColor(survey.response_status)}`}>
                  {responseLabel(survey.response_status)}
                </span>
              )}
            </div>

            {/* Row 2: telecaller + survey date + extra info */}
            <div className="flex items-center gap-3 mt-0.5 flex-wrap text-[10px] text-muted">
              <span>
                <i className="ph ph-headset mr-0.5" />
                {tc?.name ?? survey.surveyed_by ?? '—'}
                {tc?.phone && <span className="ml-1">{tc.phone}</span>}
              </span>
              {survey.survey_date && <span><i className="ph ph-calendar mr-0.5" />{survey.survey_date}</span>}
              {survey.aware_of_candidate && survey.aware_of_candidate !== '' && (
                <span>Aware: <strong>{survey.aware_of_candidate}</strong></span>
              )}
              {survey.likely_to_vote && survey.likely_to_vote !== '' && (
                <span>Vote: <strong>{survey.likely_to_vote}</strong></span>
              )}
              {survey.remarks && (
                <span className="italic truncate max-w-[200px]">"{survey.remarks}"</span>
              )}
            </div>

            {/* Decision badge (if action already taken) */}
            {dec && (
              <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold
                ${dec.action === 'followup_required'
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : 'bg-green-100 text-green-700 border border-green-200'}`}>
                <i className={`${dec.action === 'followup_required' ? 'ph ph-arrow-clockwise' : 'ph ph-check-circle'} text-[11px]`} />
                {dec.action === 'followup_required' ? 'Followup Required' : 'Followup Not Required'}
                <span className="opacity-60 font-normal ml-1">· {dec.date}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={() => handleAction(survey, 'followup_required')}
              className={`flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold border transition-colors
                ${dec?.action === 'followup_required'
                  ? 'bg-orange-400 text-white border-orange-400'
                  : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'}`}
            >
              <i className="ph ph-arrow-clockwise text-[12px]" />
              Followup Required
            </button>
            <button
              onClick={() => handleAction(survey, 'followup_not_required')}
              className={`flex items-center gap-1.5 px-3 py-[5px] rounded-lg text-[11px] font-semibold border transition-colors
                ${dec?.action === 'followup_not_required'
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-green-700 border-green-300 hover:bg-green-50'}`}
            >
              <i className="ph ph-check-circle text-[12px]" />
              Followup Not Required
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* Split for section display */
  const pending         = filteredSurveys.filter(s => !decisionMap.has(s.id))
  const followupReq     = filteredSurveys.filter(s => decisionMap.get(s.id)?.action === 'followup_required')
  const followupNotReq  = filteredSurveys.filter(s => decisionMap.get(s.id)?.action === 'followup_not_required')

  /* ════════════════════════════════════════════════════════
     Render
  ════════════════════════════════════════════════════════ */
  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <i className="ph ph-git-branch text-[20px] text-navy" />
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold text-heading">Feedback Review</h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-border text-muted text-[10px] font-semibold">
                {counts.pending} Pending Review
              </span>
              <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-semibold">
                {counts.followup_required} Followup Required
              </span>
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                {counts.followup_not_required} Followup Not Required
              </span>
            </div>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-surface-alt border-b border-border">

          {/* Status tabs */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-semibold">
            {([
              { key: 'all',                   label: 'All',                    count: counts.all                   },
              { key: 'pending',               label: 'Pending Review',         count: counts.pending               },
              { key: 'followup_required',     label: 'Followup Required',      count: counts.followup_required     },
              { key: 'followup_not_required', label: 'Followup Not Required',  count: counts.followup_not_required },
            ] as const).map(tab => (
              <button key={tab.key}
                onClick={() => setFilterTab(tab.key)}
                className={`px-3 py-[6px] flex items-center gap-1.5 transition-colors border-r border-border last:border-r-0
                  ${filterTab === tab.key
                    ? tab.key === 'followup_required'     ? 'bg-orange-400 text-white'
                      : tab.key === 'followup_not_required' ? 'bg-green-500 text-white'
                      : tab.key === 'pending'               ? 'bg-gray-500 text-white'
                      : 'bg-navy text-white'
                    : 'bg-surface text-muted hover:bg-border'}`}>
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold
                  ${filterTab === tab.key ? 'bg-white/25 text-white' : 'bg-border text-muted'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Telecaller filter */}
          {telecallerOptions.length > 0 && (
            <select value={filterTelecaller} onChange={e => setFilterTelecaller(e.target.value)}
              className={`${selectCls} w-[180px]`}>
              <option value="">All Telecallers</option>
              {telecallerOptions.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-[260px]">
            <i className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[13px] text-muted pointer-events-none" />
            <input type="text" placeholder="Voter name, booth…"
              value={search} onChange={e => setSearch(e.target.value)}
              className={`${inputCls} pl-7 w-full`} />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading">
                <i className="ph ph-x text-[11px]" />
              </button>
            )}
          </div>

          {(filterTelecaller || search) && (
            <button onClick={() => { setFilterTelecaller(''); setSearch('') }}
              className="flex items-center gap-1 px-3 py-[6px] rounded-lg border border-rose-200 bg-rose-50 text-rose-500 text-[11px] font-medium hover:bg-rose-100 transition-colors">
              <i className="ph ph-x text-[11px]" /> Clear
            </button>
          )}
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className="px-5 py-14 text-center text-muted">
            <i className="ph ph-spinner-gap animate-spin text-[28px] block mb-2" />
            Loading feedback records…
          </div>
        ) : surveys.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <i className="ph ph-notepad text-[36px] text-border block mb-3" />
            <p className="text-[13px] font-semibold text-heading mb-1">No submitted feedback yet</p>
            <p className="text-[11px] text-muted">
              Submit feedback from the <strong>Feedback</strong> tab first.
            </p>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <i className="ph ph-funnel text-[28px] text-border block mb-2" />
            <p className="text-[12px] text-muted">No records match your filter.</p>
          </div>
        ) : (
          <>
            {/* Pending Review */}
            {(filterTab === 'all' || filterTab === 'pending') && pending.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-clock text-[13px] text-gray-500"
                  label="Pending Review"
                  count={pending.length}
                  color="bg-gray-50 text-gray-600"
                />
                {pending.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* Followup Required */}
            {(filterTab === 'all' || filterTab === 'followup_required') && followupReq.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-arrow-clockwise text-[13px] text-orange-500"
                  label="Followup Required"
                  count={followupReq.length}
                  color="bg-orange-50 text-orange-600"
                />
                {followupReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}

            {/* Followup Not Required */}
            {(filterTab === 'all' || filterTab === 'followup_not_required') && followupNotReq.length > 0 && (
              <>
                <SectionLabel
                  icon="ph ph-check-circle text-[13px] text-green-600"
                  label="Followup Not Required"
                  count={followupNotReq.length}
                  color="bg-green-50 text-green-700"
                />
                {followupNotReq.map(s => <SurveyRow key={s.id} survey={s} />)}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
