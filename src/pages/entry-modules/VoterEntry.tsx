import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { VoterRecord, BoothRecord, FieldSurveyRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Village, Party, Scheme } from '../../hooks/useMasterAPI'
import EntryListHeader from '../../components/entry/EntryListHeader'
import BulkImportModal from '../../components/entry/BulkImportModal'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { exportRecordsToCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { useToast } from '../../context/ToastContext'
import type { EntryRecord } from '../../types/entry.types'

const FORM_ID = 'voter-form'

// ── Tamil Nadu Caste / Sub-caste master data ──────────────────────────
const TN_CASTE_DATA: Record<string, string[]> = {
  MBC: [
    'Vanniyar / Padayachi', 'Kallar', 'Maravar', 'Agamudaiyar',
    'Yadavar / Konar', 'Ezhavar', 'Naykar / Naicker', 'Kuravar / Kuruvar',
    'Ambalakarar', 'Kuyavar', 'Ottar', 'Arunthathiyar', 'Narikuravar',
    'Eruvalar', 'Paravar (MBC)', 'Tholkollar', 'Udaiyar (MBC)', 'Other MBC',
  ],
  BC: [
    'Chettiar – Nattukotai', 'Chettiar – Nagarathar', 'Chettiar – Vaniya',
    'Chettiar – Komati', 'Gounder / Kongu Vellala', 'Mudaliar – Sengunda',
    'Mudaliar – Kaikolar (Senguntha)', 'Mudaliar – Thuluva Vellala',
    'Nadar (BC)', 'Naicker (BC)', 'Pillai / Vellalar Pillai', 'Vellalar – Saiva',
    'Vellalar – Isai', 'Vellalar – Mudali', 'Reddy', 'Kamma', 'Udaiyar (BC)',
    'Padayachi (BC)', 'Ahamudiyar', 'Servai', 'Marakaiyar (BC Muslim)',
    'Labbai (BC Muslim)', 'Other BC',
  ],
  SC: [
    'Paraiyar / Adi Dravidar', 'Pallar / Devendra Kula Vellalar',
    'Chakkiliyar / Arundhatiyar', 'Mala', 'Madiga', 'Valluvar',
    'Adi Andhra', 'Arunthathiyar (SC)', 'Cheruman', 'Sambavar',
    'Mannan', 'Vettiyan', 'Other SC',
  ],
  ST: [
    'Irula', 'Toda', 'Kota', 'Kurumba / Kurumbas', 'Badaga',
    'Sholiga / Soliga', 'Kadar', 'Paniyan', 'Muduvar', 'Malayali Gounder',
    'Malai Arayan', 'Kattu Nayakan', 'Other ST',
  ],
  OC: [
    'Brahmin – Iyer (Smartha)', 'Brahmin – Iyengar (Vaishnava)',
    'Brahmin – Gurukkal', 'Brahmin – Others',
    'Mudaliar (OC)', 'Vellalar (OC)', 'Chettiar – Nattukotai (OC)',
    'Nadar (OC)', 'Pillai (OC)', 'Naicker (OC)', 'Other OC',
  ],
  Muslim: [
    'Rawther', 'Lebbai / Labbai', 'Marakaiyar', 'Deccan Muslim',
    'Sheik / Sheikh', 'Syed', 'Pathan', 'Urdu-speaking Muslim',
    'Tamil Muslim', 'Other Muslim',
  ],
  Christian: [
    'Roman Catholic', 'CSI (Church of South India)', 'Pentecostal',
    'Seventh-day Adventist', 'Lutheran', 'Methodist',
    'SC Convert (Dalit Christian)', 'BC Convert',
    'Anglo Indian', 'Other Christian',
  ],
  Other: ['Jain', 'Sikh', 'Buddhist', 'Parsi / Zoroastrian', 'Other'],
}
const CASTE_KEYS = Object.keys(TN_CASTE_DATA)

const GENDER_MAP: Record<string, string> = { Male: 'm', Female: 'f', Other: 'o' }
const GENDER_REVERSE: Record<string, string> = { m: 'Male', f: 'Female', o: 'Other' }

const SENTIMENT_MAP: Record<string, string> = {
  'Strongly Favourable': 'positive',
  'Favourable':          'positive',
  'Neutral / Undecided': 'neutral',
  'Against':             'negative',
  'Strongly Against':    'negative',
}
const SENTIMENT_REVERSE: Record<string, string> = {
  positive: 'Strongly Favourable',
  neutral:  'Neutral / Undecided',
  negative: 'Against',
}

const EDU_CHOICES = [
  { value: 'illiterate',    label: 'Illiterate' },
  { value: 'primary',       label: 'Primary' },
  { value: 'middle',        label: 'Middle' },
  { value: 'high_school',   label: 'High School' },
  { value: 'graduate',      label: 'Graduate' },
  { value: 'post_graduate', label: 'Post Graduate' },
]

const isValidPhone = (v: string) => v === '' || /^[6-9]\d{9}$/.test(v)
const isValidAadhaar = (v: string) => v === '' || /^\d{12}$/.test(v)

export default function VoterEntry() {
  const api       = useEntryAPI()
  const masterApi = useMasterAPI()
  const { showToast } = useToast()

  const [voters,   setVoters]   = useState<VoterRecord[]>([])
  const [booths,   setBooths]   = useState<BoothRecord[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [parties,  setParties]  = useState<Party[]>([])
  const [schemes,  setSchemes]  = useState<Scheme[]>([])
  const [surveys,  setSurveys]  = useState<FieldSurveyRecord[]>([])

  const [editing,    setEditing]   = useState<VoterRecord | null>(null)
  const [isFormOpen, setFormOpen]  = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search,     setSearch]    = useState('')
  const [editKey,    setEditKey]   = useState(0)
  const [villageFilter, setVillageFilter] = useState('')
  const [casteVal,   setCasteVal]  = useState('')
  const [page,       setPage]      = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const PAGE_SIZE = 200

  // Boolean flag state (can't use value refs for checkboxes)
  const [isContacted,      setIsContacted]      = useState(false)
  const [hasAttendedEvent, setHasAttendedEvent] = useState(false)
  const [isVolunteer,      setIsVolunteer]      = useState(false)

  const pendingFill = useRef<Record<string, string> | null>(null)
  const pendingBools = useRef<{ is_contacted: boolean; has_attended_event: boolean; is_volunteer: boolean } | null>(null)

  const loadVoters = useCallback((p: number, q: string) => {
    api.fetchVoters(undefined, q || undefined, p, PAGE_SIZE).then(d => {
      if (d) { setVoters(d.results); setTotalCount(d.count) }
    })
  }, [api, PAGE_SIZE])

  useEffect(() => {
    loadVoters(1, '')
    api.fetchBooths().then(d => d && setBooths(d))
    masterApi.fetchVillages().then(d => d && setVillages(d))
    masterApi.fetchParties().then(d => d && setParties(d))
    masterApi.fetchSchemes().then(d => d && setSchemes(d))
    api.fetchFieldSurveys().then(d => d && setSurveys(d))
  }, [])

  // Debounced server-side search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); loadVoters(1, search) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!pendingFill.current) return
    const data = pendingFill.current
    Object.entries(r).forEach(([k, ref]) => {
      if (ref.current) ref.current.value = data[k] ?? ''
    })
    if (data.village) setVillageFilter(data.village)
    if (data.caste)   setCasteVal(data.caste)
    if (pendingBools.current) {
      setIsContacted(pendingBools.current.is_contacted)
      setHasAttendedEvent(pendingBools.current.has_attended_event)
      setIsVolunteer(pendingBools.current.is_volunteer)
    }
    pendingFill.current  = null
    pendingBools.current = null
  }, [editKey])

  const r = {
    name:        useRef<HTMLInputElement>(null),
    father_name: useRef<HTMLInputElement>(null),
    gender:      useRef<HTMLSelectElement>(null),
    dob:         useRef<HTMLInputElement>(null),
    age:         useRef<HTMLInputElement>(null),
    phone:       useRef<HTMLInputElement>(null),
    phone2:      useRef<HTMLInputElement>(null),
    email:       useRef<HTMLInputElement>(null),
    vid:         useRef<HTMLInputElement>(null),
    aadhaar:     useRef<HTMLInputElement>(null),
    village:     useRef<HTMLSelectElement>(null),
    booth:       useRef<HTMLSelectElement>(null),
    address:     useRef<HTMLTextAreaElement>(null),
    religion:    useRef<HTMLSelectElement>(null),
    caste:       useRef<HTMLSelectElement>(null),
    sub_caste:   useRef<HTMLSelectElement>(null),
    current_location: useRef<HTMLSelectElement>(null),
    edu:         useRef<HTMLSelectElement>(null),
    occupation:  useRef<HTMLInputElement>(null),
    sentiment:   useRef<HTMLSelectElement>(null),
    party:       useRef<HTMLSelectElement>(null),
    scheme:      useRef<HTMLSelectElement>(null),
    issue_name:  useRef<HTMLInputElement>(null),
    feedback_score: useRef<HTMLInputElement>(null),
    lat:         useRef<HTMLInputElement>(null),
    lng:         useRef<HTMLInputElement>(null),
    notes:       useRef<HTMLTextAreaElement>(null),
  }

  const clear = () => {
    Object.values(r).forEach(ref => { if (ref.current) ref.current.value = '' })
    setVillageFilter('')
    setCasteVal('')
    setIsContacted(false)
    setHasAttendedEvent(false)
    setIsVolunteer(false)
  }

  const collect = () =>
    Object.fromEntries(Object.entries(r).map(([k, ref]) => [k, ref.current?.value ?? '']))

  const voterToFormData = (v: VoterRecord): Record<string, string> => {
    return {
      name:        v.name,
      father_name: v.father_name || '',
      phone:       v.phone  || '',
      phone2:      v.phone2 || '',
      email:       v.email  || '',
      vid:         v.voter_id || '',
      aadhaar:     v.aadhaar || '',
      booth:       String(v.booth   || ''),
      village:     String(v.village || ''),
      address:     v.address || '',
      sentiment:   SENTIMENT_REVERSE[v.sentiment || ''] || '',
      gender:      GENDER_REVERSE[v.gender || ''] || '',
      dob:         v.date_of_birth || '',
      age:         String(v.age || ''),
      religion:    v.religion || '',
      edu:         v.education_level || '',
      occupation:  v.occupation || '',
      party:       String(v.preferred_party || ''),
      scheme:      v.scheme_name || '',
      issue_name:  v.issue_name  || '',
      caste:       v.caste     || '',
      sub_caste:   v.sub_caste || '',
      current_location: v.current_location || '',
      feedback_score: String(v.feedback_score ?? ''),
      lat:         String(v.latitude  ?? ''),
      lng:         String(v.longitude ?? ''),
      notes:       v.notes || '',
    }
  }

  const handleSave = async () => {
    const d = collect()
    if (!d.name) return

    if (d.phone && !isValidPhone(d.phone)) {
      showToast('<i class="ph ph-warning"></i> Phone must be 10 digits starting with 6–9.', '#dc2626')
      return
    }
    if (d.phone2 && !isValidPhone(d.phone2)) {
      showToast('<i class="ph ph-warning"></i> Alt phone must be 10 digits starting with 6–9.', '#dc2626')
      return
    }
    if (d.aadhaar && !isValidAadhaar(d.aadhaar)) {
      showToast('<i class="ph ph-warning"></i> Aadhaar must be exactly 12 digits.', '#dc2626')
      return
    }

    const explicitAge = d.age ? Number(d.age) : null
    if (d.dob && !(explicitAge !== null && explicitAge >= 18)) {
      const birthDate = new Date(d.dob)
      const today     = new Date()
      const ageDiff   = today.getFullYear() - birthDate.getFullYear()
      const passed    = today.getMonth() > birthDate.getMonth() ||
        (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate())
      if ((passed ? ageDiff : ageDiff - 1) < 18) {
        showToast('<i class="ph ph-warning"></i> Voter must be at least 18 years old.', '#dc2626')
        return
      }
    }

    const boothId   = d.booth   ? Number(d.booth)   : undefined
    const villageId = d.village ? Number(d.village) : undefined

    if (!villageId) {
      showToast('<i class="ph ph-warning"></i> Select a Village first!', '#dc2626')
      return
    }
    if (!boothId) {
      showToast('<i class="ph ph-warning"></i> Select a booth!', '#dc2626')
      return
    }

    const selectedVillage = villages.find(w => w.id === villageId)
    const payload: Partial<VoterRecord> = {
      name:            d.name,
      father_name:     d.father_name  || undefined,
      voter_id:        d.vid          || undefined,
      aadhaar:         d.aadhaar      || undefined,
      phone:           d.phone        || undefined,
      phone2:          d.phone2       || undefined,
      email:           d.email        || undefined,
      booth:           boothId,
      village:         villageId,
      address:         [d.address, selectedVillage?.name || ''].filter(Boolean).join(', ') || '-',
      sentiment:       SENTIMENT_MAP[d.sentiment] || undefined,
      gender:          GENDER_MAP[d.gender]       || undefined,
      date_of_birth:   d.dob          || undefined,
      age:             d.age          ? Number(d.age) : undefined,
      religion:        d.religion     || undefined,
      education_level: d.edu          || undefined,
      occupation:      d.occupation   || undefined,
      caste:           d.caste        || undefined,
      sub_caste:       d.sub_caste    || undefined,
      current_location: d.current_location || undefined,
      preferred_party: d.party        ? Number(d.party) : undefined,
      scheme_name:     d.scheme       || undefined,
      issue_name:      d.issue_name   || undefined,
      feedback_score:  d.feedback_score !== '' ? Number(d.feedback_score) : undefined,
      latitude:        d.lat ? Number(d.lat) : undefined,
      longitude:       d.lng ? Number(d.lng) : undefined,
      is_contacted:    isContacted,
      has_attended_event: hasAttendedEvent,
      is_volunteer:    isVolunteer,
      notes:           d.notes        || undefined,
    }

    const SENTIMENT_TO_SUPPORT: Record<string, string> = {
      positive:  'Strong Support',
      neutral:   'Neutral',
      negative:  'Strong Against',
      undecided: 'Undecided',
    }

    if (editing) {
      const updated = await api.updateVoter(editing.id, payload)
      if (updated) {
        setVoters(prev => prev.map(v => v.id === editing.id ? { ...v, ...updated } : v))
        showToast('<i class="ph ph-check-circle"></i> Voter updated!', '#138808')
        setEditing(null)
        setFormOpen(false)
        clear()
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to update voter.', '#dc2626')
      }
    } else {
      const created = await api.createVoter({ ...payload, voter_id: payload.voter_id || `VID${Date.now()}` })
      if (created) {
        setVoters(prev => [...prev, created])
        showToast('<i class="ph ph-check-circle"></i> Voter saved!', '#138808')
        setFormOpen(false)
        clear()
        // Auto-create a feedback / survey entry from the new voter record
        const selectedBooth = boothMap.get(created.booth)
        api.createFieldSurvey({
          survey_date:    new Date().toISOString().slice(0, 10),
          voter_name:     created.name,
          village:        selectedVillage?.name || '',
          booth_no:       selectedBooth?.number || '',
          phone:          created.phone  || '',
          age:            created.age,
          gender:         GENDER_REVERSE[created.gender || ''] || '',
          address:        created.address || '',
          support_level:  SENTIMENT_TO_SUPPORT[created.sentiment || ''] || '',
          key_issues:     created.issue_name || '',
          response_status: 'interested',
        })
      } else {
        showToast('<i class="ph ph-x-circle"></i> Failed to save voter.', '#dc2626')
      }
    }
  }

  const handleEdit = async (id: string) => {
    const base = voters.find(v => String(v.id) === id)
    if (!base) return
    const full  = await api.fetchVoter(base.id)
    const voter = full ?? base
    pendingFill.current  = voterToFormData(voter)
    pendingBools.current = {
      is_contacted:      !!voter.is_contacted,
      has_attended_event: !!voter.has_attended_event,
      is_volunteer:      !!voter.is_volunteer,
    }
    setEditing(voter)
    setFormOpen(true)
    setEditKey(k => k + 1)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this voter record?')) return
    const voter = voters.find(v => String(v.id) === id)
    if (!voter) return
    const ok = await api.deleteVoter(voter.id)
    if (ok) {
      setVoters(prev => prev.filter(v => v.id !== voter.id))
      showToast('<i class="ph ph-trash"></i> Voter deleted.', '#dc2626')
    }
  }

  // ── O(1) lookup maps ─────────────────────────────────────────────
  const boothMap = useMemo(() => new Map(booths.map(b  => [b.id, b])),  [booths])
  const partyMap = useMemo(() => new Map(parties.map(p => [p.id, p])), [parties])

  const mapVoter = useMemo(() => (v: VoterRecord): EntryRecord => {
    const booth = boothMap.get(v.booth)
    const party = v.preferred_party ? partyMap.get(v.preferred_party) : undefined
    return {
      id:       String(v.id),
      keyField: v.name,
      sub:      `${booth ? `Booth ${booth.number}` : '—'} · ${v.phone || ''} · ${SENTIMENT_REVERSE[v.sentiment || ''] || v.sentiment || ''}${party ? ` · ${party.abbreviation || party.name}` : ''}`.replace(/ · $/, ''),
      data: {
        gender:    v.gender    || '',
        sentiment: v.sentiment || '',
        caste:     v.caste     || '',
        sub_caste: v.sub_caste || '',
        religion:  v.religion  || '',
        education: v.education_level  || '',
        location:  v.current_location || '',
        booth:     String(v.booth || ''),
      },
      createdAt: v.created_at || '',
      backendId: v.id,
    }
  }, [boothMap, partyMap])

  const allVoterRecords = useMemo(() => (voters ?? []).map(mapVoter), [voters, mapVoter])

  const filtered = useMemo(() => (voters ?? []).map(mapVoter), [voters, mapVoter])

  const usedSubCastes = useMemo(
    () => [...new Set((voters ?? []).map(v => v.sub_caste).filter(Boolean))].sort() as string[],
    [voters]
  )

  const voterFilterConfig = useMemo(() => [
    { key: 'gender', label: 'Gender', options: [
      { value: 'm', label: 'Male' },
      { value: 'f', label: 'Female' },
      { value: 'o', label: 'Other' },
    ]},
    { key: 'sentiment', label: 'Sentiment', options: [
      { value: 'positive', label: 'Favourable' },
      { value: 'neutral',  label: 'Neutral' },
      { value: 'negative', label: 'Against' },
    ]},
    { key: 'caste', label: 'Caste', options: CASTE_KEYS.map(c => ({ value: c, label: c })) },
    { key: 'sub_caste', label: 'Sub Caste', options: usedSubCastes.map(sc => ({ value: sc, label: sc })) },
    { key: 'booth', label: 'Booth', options: booths.map(b => ({ value: String(b.id), label: `${b.number} — ${b.name}` })) },
    { key: 'religion', label: 'Religion', options: [
      { value: 'Hindu',     label: 'Hindu' },
      { value: 'Muslim',    label: 'Muslim' },
      { value: 'Christian', label: 'Christian' },
      { value: 'Other',     label: 'Other' },
    ]},
    { key: 'education', label: 'Education', options: EDU_CHOICES.map(e => ({ value: e.value, label: e.label })) },
    { key: 'location', label: 'Location', options: [
      { value: 'home',           label: 'Home' },
      { value: 'out_of_station', label: 'Out of Station' },
    ]},
  ], [booths, usedSubCastes])

  /* ── checkbox style helper ───────────────────────────────────────── */
  const checkCls = 'flex items-center gap-2 cursor-pointer select-none text-[11px] text-body font-medium'
  const checkBoxCls = 'w-4 h-4 rounded border-2 border-border cursor-pointer accent-navy'

  return (
    <div className="page-enter">
      <div className="bg-surface rounded-card shadow-card overflow-hidden mb-[22px]">
        <EntryListHeader
          title="Voter Records"
          icon="ph ph-user"
          count={voters.length}
          onAddNew={() => { setEditing(null); clear(); setFormOpen(true) }}
          addLabel="Add Voter"
          onImport={() => setShowImport(true)}
        />
        {showImport && (
          <BulkImportModal
            config={{
              title: 'Import Voters',
              uploadEndpoint: '/voters/voters/bulk-upload/',
              sampleColumns: ['voter_id', 'name', 'father_name', 'age', 'date_of_birth', 'gender', 'phone', 'alt_phone', 'booth_code', 'ward_code', 'caste', 'sentiment', 'religion', 'address'],
              sampleRow: {
                voter_id: 'VTR001', name: 'Rajesh Kumar', father_name: 'Suresh Kumar',
                age: '42', date_of_birth: '1982-06-15', gender: 'm', phone: '9876543210', alt_phone: '9123456780',
                booth_code: 'B001', ward_code: 'W001', caste: 'BC', sentiment: 'positive',
                religion: 'Hindu', address: '12 Main Street, Erode',
              },
              columnNotes: {
                voter_id: 'Unique voter ID (required)',
                name: 'Full name of voter',
                father_name: 'Father or husband name',
                age: 'Age as number',
                date_of_birth: 'Format: YYYY-MM-DD (e.g. 1982-06-15)',
                gender: 'm / f / o',
                phone: '10-digit mobile',
                alt_phone: 'Alternate mobile number',
                booth_code: 'Booth code from master',
                ward_code: 'Ward code from master',
                caste: 'e.g. BC, MBC, SC, OC',
                sentiment: 'positive / neutral / negative',
                religion: 'Hindu / Muslim / Christian / Other',
                address: 'Full address',
              },
              onSuccess: () => { setPage(1); loadVoters(1, search) },
            }}
            onClose={() => setShowImport(false)}
          />
        )}
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search voters..."
            value={search}
            onChange={setSearch}
            onExport={() => exportRecordsToCsv(allVoterRecords, 'Voter_Details')}
            onPrint={() => printModule(allVoterRecords, 'Voter Details')}
          />
          <RecordList
            records={filtered}
            editingId={editing ? String(editing.id) : null}
            emptyMsg='No voter records yet. Click "Add Voter" to begin.'
            icon="ph ph-user"
            iconBg="#fff3e0"
            iconColor="#e07010"
            onEdit={handleEdit}
            onDelete={handleDelete}
            filterConfig={voterFilterConfig}
          />
          {/* Pagination */}
          {totalCount > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-[11px] text-muted">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString('en-IN')}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => { const p = page - 1; setPage(p); loadVoters(p, search) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >← Prev</button>
                <span className="text-[11px] text-muted py-1">Page {page} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
                <button
                  disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                  onClick={() => { const p = page + 1; setPage(p); loadVoters(p, search) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <EntryFormPanel
        id={FORM_ID}
        title="Voter Details"
        icon="ph ph-user"
        isOpen={isFormOpen}
        isEditing={!!editing}
        onClose={() => { setFormOpen(false); setEditing(null); clear() }}
      >
        {/* ── Section: Personal Identity ─────────────────────────── */}
        <FormRow cols={3}>
          <FormGroup label="Full Name" required>
            <input ref={r.name} className={inputCls} placeholder="Voter full name" />
          </FormGroup>
          <FormGroup label="Father / Husband Name">
            <input ref={r.father_name} className={inputCls} placeholder="Father or husband name" />
          </FormGroup>
          <FormGroup label="Gender">
            <select ref={r.gender} className={selectCls}>
              <option value="">Select</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={3}>
          <FormGroup label="Date of Birth">
            <input ref={r.dob} type="date" className={inputCls} />
          </FormGroup>
          <FormGroup label="Age">
            <input ref={r.age} type="number" min="18" max="120" className={inputCls} placeholder="e.g. 35" />
          </FormGroup>
          <FormGroup label="Voter ID (EPIC No.)">
            <input ref={r.vid} className={inputCls} placeholder="e.g. ABC1234567" />
          </FormGroup>
        </FormRow>

        {/* ── Section: Contact ───────────────────────────────────── */}
        <FormRow cols={3}>
          <FormGroup label="Phone">
            <input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" />
          </FormGroup>
          <FormGroup label="Alt. Phone">
            <input ref={r.phone2} type="tel" className={inputCls} placeholder="Optional" />
          </FormGroup>
          <FormGroup label="Email">
            <input ref={r.email} type="email" className={inputCls} placeholder="example@mail.com" />
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <FormGroup label="Aadhaar No.">
            <input ref={r.aadhaar} className={inputCls} placeholder="12-digit Aadhaar number" maxLength={12} />
          </FormGroup>
          <FormGroup label="Address">
            <textarea ref={r.address} className={textareaCls} rows={2} placeholder="Door no., Street name" />
          </FormGroup>
        </FormRow>

        {/* ── Section: Location ──────────────────────────────────── */}
        <FormRow cols={3}>
          <FormGroup label="Village" required>
            <select
              ref={r.village}
              className={selectCls}
              onChange={e => {
                setVillageFilter(e.target.value)
                if (r.booth.current) r.booth.current.value = ''
              }}
            >
              <option value="">Select Village</option>
              {villages.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Booth" required>
            <select ref={r.booth} className={selectCls}>
              <option value="">
                {villageFilter ? 'Select Booth' : 'Select Village first'}
              </option>
              {(villageFilter
                ? booths.filter(b => b.ward && String(b.ward) === villageFilter)
                : booths
              ).map(b => (
                <option key={b.id} value={String(b.id)}>{b.number} — {b.name}</option>
              ))}
            </select>
          </FormGroup>
          <FormGroup label="Current Location">
            <select ref={r.current_location} className={selectCls}>
              <option value="">Select</option>
              <option value="home">Home Location</option>
              <option value="out_of_station">Out of Station</option>
            </select>
          </FormGroup>
        </FormRow>

        {/* ── Section: Demographics ──────────────────────────────── */}
        <FormRow cols={3}>
          <FormGroup label="Religion">
            <select ref={r.religion} className={selectCls}>
              <option value="">Select</option>
              <option>Hindu</option><option>Muslim</option><option>Christian</option><option>Other</option>
            </select>
          </FormGroup>
          <FormGroup label="Caste Category">
            <select
              ref={r.caste}
              className={selectCls}
              onChange={e => { setCasteVal(e.target.value); if (r.sub_caste.current) r.sub_caste.current.value = '' }}
            >
              <option value="">Select Caste</option>
              {CASTE_KEYS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Sub Caste">
            <select ref={r.sub_caste} className={selectCls} disabled={!casteVal}>
              <option value="">{casteVal ? 'Select Sub Caste' : 'Select Caste first'}</option>
              {(TN_CASTE_DATA[casteVal] || []).map(sc => (
                <option key={sc} value={sc}>{sc}</option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        <FormRow cols={2}>
          <FormGroup label="Education">
            <select ref={r.edu} className={selectCls}>
              <option value="">Select</option>
              {EDU_CHOICES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Occupation">
            <input ref={r.occupation} className={inputCls} placeholder="e.g. Farmer, Teacher" />
          </FormGroup>
        </FormRow>

        {/* ── Section: Political ─────────────────────────────────── */}
        <FormRow cols={2}>
          <FormGroup label="Sentiment / Opinion">
            <select ref={r.sentiment} className={selectCls}>
              <option value="">Select</option>
              <option>Strongly Favourable</option><option>Favourable</option>
              <option>Neutral / Undecided</option><option>Against</option><option>Strongly Against</option>
            </select>
          </FormGroup>
          <FormGroup label="Preferred Party">
            <select ref={r.party} className={selectCls}>
              <option value="">Select Party</option>
              {parties.map(p => (
                <option key={p.id} value={String(p.id)}>
                  {p.abbreviation ? `${p.abbreviation} — ${p.name}` : p.name}
                </option>
              ))}
            </select>
          </FormGroup>
        </FormRow>

        {/* ── Section: Beneficiary / Issue ───────────────────────── */}
        <FormRow cols={2}>
          <FormGroup label="Scheme Beneficiary">
            <select ref={r.scheme} className={selectCls}>
              <option value="">Select Scheme</option>
              {schemes.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Issue / Grievance">
            <input ref={r.issue_name} className={inputCls} placeholder="e.g. Road, Water supply" />
          </FormGroup>
        </FormRow>

        {/* ── Section: Engagement Status ─────────────────────────── */}
        <FormRow cols={2}>
          <FormGroup label="Feedback Score (-5 to +5)">
            <input
              ref={r.feedback_score}
              type="number"
              min="-5"
              max="5"
              className={inputCls}
              placeholder="0"
            />
          </FormGroup>
          {/* empty column to balance layout */}
          <div />
        </FormRow>

        <FormRow cols={3}>
          <FormGroup label="Engagement Flags">
            <div className="flex flex-col gap-[10px] pt-[2px]">
              <label className={checkCls}>
                <input
                  type="checkbox"
                  className={checkBoxCls}
                  checked={isContacted}
                  onChange={e => setIsContacted(e.target.checked)}
                />
                Voter Contacted
              </label>
              <label className={checkCls}>
                <input
                  type="checkbox"
                  className={checkBoxCls}
                  checked={hasAttendedEvent}
                  onChange={e => setHasAttendedEvent(e.target.checked)}
                />
                Attended Campaign Event
              </label>
              <label className={checkCls}>
                <input
                  type="checkbox"
                  className={checkBoxCls}
                  checked={isVolunteer}
                  onChange={e => setIsVolunteer(e.target.checked)}
                />
                Is a Volunteer
              </label>
            </div>
          </FormGroup>
        </FormRow>

        {/* ── Section: GPS Coordinates ───────────────────────────── */}
        <FormRow cols={2}>
          <FormGroup label="Latitude">
            <input ref={r.lat} type="number" step="any" className={inputCls} placeholder="e.g. 11.340620" />
          </FormGroup>
          <FormGroup label="Longitude">
            <input ref={r.lng} type="number" step="any" className={inputCls} placeholder="e.g. 77.717735" />
          </FormGroup>
        </FormRow>

        {/* ── Section: Notes ─────────────────────────────────────── */}
        <FormRow cols={1}>
          <FormGroup label="Notes">
            <textarea ref={r.notes} className={textareaCls} placeholder="Any additional notes about this voter..." />
          </FormGroup>
        </FormRow>

        <FormActions onSave={handleSave} onClear={clear} saveLabel="Save Voter" isEditing={!!editing} />
      </EntryFormPanel>
    </div>
  )
}
