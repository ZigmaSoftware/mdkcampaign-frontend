import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { useEntryAPI } from '../../hooks/useEntryAPI'
import type { VoterRecord, VolunteerRecord, BoothRecord, FieldSurveyRecord } from '../../hooks/useEntryAPI'
import { useMasterAPI } from '../../hooks/useMasterAPI'
import type { Village, Party, Scheme, Ward, Panchayat, Union } from '../../hooks/useMasterAPI'
import EntryListHeader from '../../components/entry/EntryListHeader'
import BulkImportModal from '../../components/entry/BulkImportModal'
import EntrySearchToolbar from '../../components/entry/EntrySearchToolbar'
import RecordList from '../../components/entry/RecordList'
import EntryFormPanel from '../../components/entry/EntryFormPanel'
import FormRow from '../../components/entry/FormRow'
import { FormGroup, inputCls, selectCls, textareaCls } from '../../components/entry/FormGroup'
import FormActions from '../../components/entry/FormActions'
import { exportVotersCsv } from '../../utils/exportCsv'
import { printModule } from '../../utils/printModule'
import { useToast } from '../../context/ToastContext'
import { usePermissions } from '../../context/PermissionContext'
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
  const { canAdd, canEdit, canDelete } = usePermissions()

  const [voters,   setVoters]   = useState<VoterRecord[]>([])
  const [booths,   setBooths]   = useState<BoothRecord[]>([])
  const [villages,   setVillages]   = useState<Village[]>([])
  const [parties,    setParties]    = useState<Party[]>([])
  const [schemes,    setSchemes]    = useState<Scheme[]>([])
  const [surveys,    setSurveys]    = useState<FieldSurveyRecord[]>([])

  const [editing,    setEditing]   = useState<VoterRecord | null>(null)
  const [isFormOpen, setFormOpen]  = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [search,     setSearch]    = useState('')
  const [editKey,    setEditKey]   = useState(0)
  const [villageFilter, setVillageFilter] = useState('')
  const [casteVal,   setCasteVal]  = useState('')
  const [boothFilter,     setBoothFilter]     = useState<number | undefined>(undefined)
  const [wardFilter,      setWardFilter]      = useState<number | undefined>(undefined)
  const [pincodeFilter,   setPincodeFilter]   = useState('')
  const [panchayatFilter, setPanchayatFilter] = useState<number | undefined>(undefined)
  const [unionFilter,     setUnionFilter]     = useState<number | undefined>(undefined)
  const [wards,           setWards]           = useState<Ward[]>([])
  const [panchayats,      setPanchayats]      = useState<Panchayat[]>([])
  const [unions,          setUnions]          = useState<Union[]>([])
  const [page,         setPage]         = useState(1)
  const [totalCount,   setTotalCount]   = useState(0)
  const [exporting,    setExporting]    = useState(false)
  const PAGE_SIZE = 10

  const [volunteers,      setVolunteers]      = useState<VolunteerRecord[]>([])
  const [boothVolModal,   setBoothVolModal]   = useState<number | null>(null)       // boothId being viewed
  const [volDetailModal,  setVolDetailModal]  = useState<VolunteerRecord | null>(null) // volunteer badge click

  // Boolean flag state (can't use value refs for checkboxes)
  const [isContacted,      setIsContacted]      = useState(false)
  const [hasAttendedEvent, setHasAttendedEvent] = useState(false)
  const [isVolunteer,      setIsVolunteer]      = useState(false)

  const pendingFill = useRef<Record<string, string> | null>(null)
  const pendingBools = useRef<{ is_contacted: boolean; has_attended_event: boolean; is_volunteer: boolean } | null>(null)

  // Keep stable refs to avoid re-creating callbacks when api object reference changes
  const apiRef = useRef(api)
  apiRef.current = api
  const masterApiRef = useRef(masterApi)
  masterApiRef.current = masterApi

  const loadVoters = useCallback((p: number, q: string, boothId?: number, wId?: number, pin?: string, panId?: number, uId?: number) => {
    apiRef.current.fetchVoters(boothId, q || undefined, p, PAGE_SIZE, wId, pin || undefined, panId, uId).then(d => {
      setVoters(d?.results ?? [])
      setTotalCount(d?.count ?? 0)
    })
  }, [PAGE_SIZE])


  useEffect(() => {
    loadVoters(1, '')
    apiRef.current.fetchBooths().then(d => d && setBooths(d))
    masterApiRef.current.fetchWards().then(d => d && setWards(d))
    masterApiRef.current.fetchPanchayats().then(d => d && setPanchayats(d))
    masterApiRef.current.fetchUnions().then(d => d && setUnions(d))
    masterApiRef.current.fetchVillages().then(d => d && setVillages(d))
    masterApiRef.current.fetchParties().then(d => d && setParties(d))
    masterApiRef.current.fetchSchemes().then(d => d && setSchemes(d))
    apiRef.current.fetchFieldSurveys().then(d => d && setSurveys(d))
    apiRef.current.fetchVolunteers().then(d => d && setVolunteers(d))
  }, [loadVoters])

  // Debounced server-side search — skip the initial mount run (handled above)
  const isFirstSearchRender = useRef(true)
  useEffect(() => {
    if (isFirstSearchRender.current) { isFirstSearchRender.current = false; return }
    const t = setTimeout(() => { setPage(1); loadVoters(1, search, boothFilter, wardFilter, pincodeFilter, panchayatFilter, unionFilter) }, 400)
    return () => clearTimeout(t)
  }, [search, boothFilter, wardFilter, pincodeFilter, panchayatFilter, unionFilter, loadVoters])

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
    alt_phoneno2: useRef<HTMLInputElement>(null),
    alt_phoneno3: useRef<HTMLInputElement>(null),
    email:       useRef<HTMLInputElement>(null),
    vid:         useRef<HTMLInputElement>(null),
    aadhaar:     useRef<HTMLInputElement>(null),
    village:     useRef<HTMLSelectElement>(null),
    booth:       useRef<HTMLSelectElement>(null),
    address:     useRef<HTMLTextAreaElement>(null),
    pincode:     useRef<HTMLInputElement>(null),
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
      phone:        v.phone        || '',
      phone2:       v.phone2       || '',
      alt_phoneno2: v.alt_phoneno2 || '',
      alt_phoneno3: v.alt_phoneno3 || '',
      email:        v.email        || '',
      vid:         v.voter_id || '',
      aadhaar:     v.aadhaar || '',
      booth:       String(v.booth     || ''),
      village:     String(v.village   || ''),
      address:     v.address || '',
      pincode:     v.pincode || '',
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
    if (d.alt_phoneno2 && !isValidPhone(d.alt_phoneno2)) {
      showToast('<i class="ph ph-warning"></i> Alt phone 2 must be 10 digits starting with 6–9.', '#dc2626')
      return
    }
    if (d.alt_phoneno3 && !isValidPhone(d.alt_phoneno3)) {
      showToast('<i class="ph ph-warning"></i> Alt phone 3 must be 10 digits starting with 6–9.', '#dc2626')
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
      alt_phoneno2:    d.alt_phoneno2 || undefined,
      alt_phoneno3:    d.alt_phoneno3 || undefined,
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
      pincode:         d.pincode      || undefined,
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
  const boothMap     = useMemo(() => new Map(booths.map(b     => [b.id, b])),     [booths])
  const partyMap     = useMemo(() => new Map(parties.map(p    => [p.id, p])),    [parties])
  const villageMap   = useMemo(() => new Map(villages.map(v   => [v.id, v])),   [villages])
  const volunteerByVoterId = useMemo(
    () => new Map(volunteers.filter(v => v.voter_id).map(v => [v.voter_id!, v])),
    [volunteers]
  )

  const mapVoter = useMemo(() => (v: VoterRecord): EntryRecord => {
    const booth     = boothMap.get(v.booth)
    const party     = v.preferred_party ? partyMap.get(v.preferred_party)   : undefined
    const village   = v.village         ? villageMap.get(v.village)          : undefined
    const matchedVol = v.voter_id ? volunteerByVoterId.get(v.voter_id) : undefined
    const phones = [
      v.phone        ? `Aadhar:${v.phone}`        : '',
      v.phone2       ? `AC-100:${v.phone2}`        : '',
      v.alt_phoneno2 ? `Common:${v.alt_phoneno2}`  : '',
      v.alt_phoneno3 ? `Alt3:${v.alt_phoneno3}`    : '',
    ].filter(Boolean).join(' · ')
    return {
      id:       String(v.id),
      keyField: [
        v.voter_id              || '',
        v.name                  || '',
        v.age ? `Age:${v.age}` : '',
        phones,
      ].filter(Boolean).join(' · '),
      sub: [
        booth ? `Booth ${booth.number}` : '',
        booth?.constituency_name || '',
        v.address                || '',
        v.pincode                || '',
        matchedVol?.role           ? `Role: ${matchedVol.role}`           : '',
        matchedVol?.volunteer_type ? `Designation: ${matchedVol.volunteer_type}` : '',
      ].filter(Boolean).join(' · '),
      data: {
        name:              v.name               || '',
        voter_id:          v.voter_id            || '',
        father_name:       v.father_name        || '',
        aadhaar:           v.aadhaar             || '',
        phone:             v.phone               || '',
        phone_2:           v.phone2              || '',
        phone_3:           v.alt_phoneno2        || '',
        phone_4:           v.alt_phoneno3        || '',
        email:             v.email               || '',
        gender:            v.gender || '',
        age:               v.age                != null ? String(v.age) : '',
        date_of_birth:     v.date_of_birth       || '',
        address:           v.address             || '',
        pincode:           v.pincode             || '',
        religion:          v.religion            || '',
        caste:             v.caste               || '',
        sub_caste:         v.sub_caste           || '',
        education:         v.education_level     || '',
        occupation:        v.occupation          || '',
        current_location:  v.current_location    || '',
        sentiment:         v.sentiment || '',
        preferred_party:   party ? (party.abbreviation || party.name) : '',
        booth:             v.booth ? String(v.booth) : '',
        village:           village   ? village.name   : '',
        scheme_name:       v.scheme_name         || '',
        issue_name:        v.issue_name          || '',
        feedback_score:    v.feedback_score     != null ? String(v.feedback_score) : '',
        notes:             v.notes               || '',
        is_contacted:      v.is_contacted        ? 'Yes' : '',
        has_attended_event: v.has_attended_event ? 'Yes' : '',
        is_volunteer:      v.is_volunteer        ? 'Yes' : '',
        volunteer_match:       matchedVol              ? 'yes' : '',
        volunteer_role:        matchedVol?.role         || '',
        volunteer_designation: matchedVol?.volunteer_type || '',
      },
      createdAt: v.created_at || '',
      backendId: v.id,
    }
  }, [boothMap, partyMap, villageMap, volunteerByVoterId])

  const allVoterRecords = useMemo(() => (voters ?? []).map(mapVoter), [voters, mapVoter])

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const all: VoterRecord[] = []
      let p = 1
      const BATCH = 500
      while (true) {
        const d = await apiRef.current.fetchVoters(boothFilter, search || undefined, p, BATCH, wardFilter, pincodeFilter || undefined, panchayatFilter, unionFilter)
        if (!d) break
        all.push(...d.results)
        if (all.length >= d.count || d.results.length < BATCH) break
        p++
      }
      const boothNumMap = new Map(booths.map(b => [String(b.id), `Booth ${b.number}`]))
      exportVotersCsv(all.map(mapVoter), boothNumMap)
    } finally {
      setExporting(false)
    }
  }

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
    { key: 'religion', label: 'Religion', options: [
      { value: 'Hindu',     label: 'Hindu' },
      { value: 'Muslim',    label: 'Muslim' },
      { value: 'Christian', label: 'Christian' },
      { value: 'Other',     label: 'Other' },
    ]},
    { key: 'education', label: 'Education', options: EDU_CHOICES.map(e => ({ value: e.value, label: e.label })) },
    { key: 'current_location', label: 'Location', options: [
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
          count={totalCount}
          onAddNew={canAdd('voter') ? () => { setEditing(null); clear(); setFormOpen(true) } : undefined}
          addLabel="Add Voter"
          onImport={canAdd('voter') ? () => setShowImport(true) : undefined}
        />
        {showImport && (
          <BulkImportModal
            config={{
              title: 'Import Voters',
              uploadEndpoint: '/voters/voters/bulk-upload/',
              sampleColumns: ['voter_id', 'name', 'father_name', 'age', 'date_of_birth', 'gender', 'phone', 'alt_phone', 'alt_phoneno2', 'alt_phoneno3', 'booth_code', 'ward_code', 'caste', 'sentiment', 'religion', 'address'],
              sampleRow: {
                voter_id: 'VTR001', name: 'Rajesh Kumar', father_name: 'Suresh Kumar',
                age: '42', date_of_birth: '1982-06-15', gender: 'm', phone: '9876543210', alt_phone: '9123456780', alt_phoneno2: '9988776655', alt_phoneno3: '9876500001',
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
                alt_phoneno2: 'Second alternate mobile number',
                alt_phoneno3: 'Third alternate mobile number',
                booth_code: 'Booth code from master',
                ward_code: 'Ward code from master',
                caste: 'e.g. BC, MBC, SC, OC',
                sentiment: 'positive / neutral / negative',
                religion: 'Hindu / Muslim / Christian / Other',
                address: 'Full address',
              },
              onSuccess: () => { setPage(1); loadVoters(1, search, boothFilter, wardFilter, pincodeFilter, panchayatFilter, unionFilter) },
            }}
            onClose={() => setShowImport(false)}
          />
        )}
        <div className="px-[18px] py-[14px]">
          <EntrySearchToolbar
            placeholder="Search by name, voter ID, phone, Aadhaar, father name, address…"
            value={search}
            onChange={setSearch}
            onExport={handleExportCsv}
            exportLoading={exporting}
            onPrint={() => printModule(allVoterRecords, 'Voter Details')}
          />

          {/* Server-side filters: Panchayat · Union · Booth · Ward · Pincode */}
          <div className="flex items-center gap-2 mb-2 mt-1 flex-wrap">
            <i className="ph ph-map-pin text-saffron text-[13px]" />
            {/* Panchayat filter */}
            <select
              value={panchayatFilter ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : undefined
                setPanchayatFilter(val)
                setUnionFilter(undefined)
                setBoothFilter(undefined)
                setPage(1)
                loadVoters(1, search, undefined, wardFilter, pincodeFilter, val, undefined)
              }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[160px] w-auto ${panchayatFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Panchayat</option>
              {panchayats.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {/* Union filter */}
            <select
              value={unionFilter ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : undefined
                setUnionFilter(val)
                setPanchayatFilter(undefined)
                setBoothFilter(undefined)
                setPage(1)
                loadVoters(1, search, undefined, wardFilter, pincodeFilter, undefined, val)
              }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${unionFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Union</option>
              {unions.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {/* Booth filter */}
            <select
              value={boothFilter ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : undefined
                setBoothFilter(val)
                setPage(1)
                loadVoters(1, search, val, wardFilter, pincodeFilter, panchayatFilter, unionFilter)
              }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[180px] w-auto ${boothFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Booths</option>
              {booths.map(b => (
                <option key={b.id} value={b.id}>{b.number} — {b.name}</option>
              ))}
            </select>
            {/* Ward filter */}
            <select
              value={wardFilter ?? ''}
              onChange={e => {
                const val = e.target.value ? Number(e.target.value) : undefined
                setWardFilter(val)
                setPage(1)
                loadVoters(1, search, boothFilter, val, pincodeFilter, panchayatFilter, unionFilter)
              }}
              className={`form-input text-[11px] py-[4px] pr-7 min-w-[150px] w-auto ${wardFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            >
              <option value="">All Wards</option>
              {wards.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            {/* Pincode filter */}
            <input
              type="text"
              placeholder="Pincode"
              value={pincodeFilter}
              maxLength={10}
              onChange={e => {
                setPincodeFilter(e.target.value)
                setPage(1)
                loadVoters(1, search, boothFilter, wardFilter, e.target.value, panchayatFilter, unionFilter)
              }}
              className={`form-input text-[11px] py-[4px] w-[110px] ${pincodeFilter ? 'border-saffron bg-[#fffbeb] font-semibold text-navy' : ''}`}
            />
            {(boothFilter || wardFilter || pincodeFilter || panchayatFilter || unionFilter) && (
              <button
                onClick={() => {
                  setBoothFilter(undefined)
                  setWardFilter(undefined)
                  setPincodeFilter('')
                  setPanchayatFilter(undefined)
                  setUnionFilter(undefined)
                  setPage(1)
                  loadVoters(1, search, undefined, undefined, '')
                }}
                className="text-[10px] font-bold text-kampr flex items-center gap-1"
              >
                <i className="ph ph-x-circle" /> Clear Filters
              </button>
            )}
          </div>

          <RecordList
            records={filtered}
            editingId={editing ? String(editing.id) : null}
            emptyMsg='No voter records yet. Click "Add Voter" to begin.'
            icon="ph ph-user"
            iconBg="#fff3e0"
            iconColor="#e07010"
            onEdit={canEdit('voter') ? handleEdit : undefined}
            onDelete={canDelete('voter') ? handleDelete : undefined}
            getTag={rec => {
              if (rec.data.volunteer_match !== 'yes') return undefined
              const parts = [
                rec.data.volunteer_role,
                rec.data.volunteer_designation,
              ].filter(Boolean)
              const label = parts.length ? `Volunteer · ${parts.join(' · ')}` : 'Volunteer'
              return { label, bg: '#dcfce7', color: '#166534' }
            }}
            onTagClick={id => {
              const voter = voters.find(v => String(v.id) === id)
              if (voter?.voter_id) {
                const vol = volunteerByVoterId.get(voter.voter_id)
                if (vol) setVolDetailModal(vol)
              }
            }}
            onViewVolunteers={id => {
              const voter = voters.find(v => String(v.id) === id)
              if (voter?.booth) setBoothVolModal(voter.booth)
            }}
            filterConfig={voterFilterConfig}
            itemsPerPage={PAGE_SIZE}
            serverTotal={totalCount}
            startIndex={(page - 1) * PAGE_SIZE}
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
                  onClick={() => { const p = page - 1; setPage(p); loadVoters(p, search, boothFilter, wardFilter, pincodeFilter, panchayatFilter, unionFilter) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >← Prev</button>
                <span className="text-[11px] text-muted py-1">Page {page} / {Math.ceil(totalCount / PAGE_SIZE)}</span>
                <button
                  disabled={page >= Math.ceil(totalCount / PAGE_SIZE)}
                  onClick={() => { const p = page + 1; setPage(p); loadVoters(p, search, boothFilter, wardFilter, pincodeFilter, panchayatFilter, unionFilter) }}
                  className="text-[11px] font-bold px-3 py-1 rounded border border-border disabled:opacity-40 cursor-pointer"
                >Next →</button>
              </div>
            </div>
          )}

          {/* ── Volunteer detail modal (badge click) ──────────────── */}
          {volDetailModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.45)' }}
              onClick={() => setVolDetailModal(null)}
            >
              <div
                className="bg-surface rounded-card shadow-card w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-[#166534] text-white px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="ph ph-identification-badge text-[16px]" />
                    <div>
                      <div className="text-[12px] font-bold leading-tight">
                        {volDetailModal.name || volDetailModal.user_name || `Volunteer #${volDetailModal.id}`}
                      </div>
                      <div className="text-[9.5px] text-white/60 mt-[1px]">Volunteer Profile</div>
                    </div>
                  </div>
                  <button
                    onClick={() => setVolDetailModal(null)}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <i className="ph ph-x text-[14px]" />
                  </button>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-3">
                  {[
                    { label: 'Voter ID',     value: volDetailModal.voter_id    || '—' },
                    { label: 'Phone',        value: volDetailModal.phone        || '—' },
                    { label: 'Role',         value: volDetailModal.role         || '—' },
                    { label: 'Designation',  value: volDetailModal.volunteer_type || '—' },
                    { label: 'Status',       value: volDetailModal.status       || '—' },
                    { label: 'Joined Date',  value: volDetailModal.joined_date  || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-muted w-[90px] flex-shrink-0 pt-[1px]">
                        {label}
                      </span>
                      <span className="text-[12px] font-semibold text-body">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-5 py-3 flex justify-end">
                  <button
                    onClick={() => setVolDetailModal(null)}
                    className="px-4 py-[6px] rounded-md bg-[#166534] text-white text-[11px] font-bold hover:opacity-80 transition-all"
                  >Close</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Booth volunteers modal ─────────────────────────────── */}
          {boothVolModal != null && (() => {
            const booth = booths.find(b => b.id === boothVolModal)
            const vols  = volunteers.filter(v =>
              v.booth === boothVolModal || v.booths?.includes(boothVolModal)
            )
            const STATUS_COLOR: Record<string, string> = {
              active:   'bg-green-100 text-green-700',
              inactive: 'bg-gray-100 text-gray-500',
              on_leave: 'bg-yellow-100 text-yellow-700',
            }
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ background: 'rgba(0,0,0,0.45)' }}
                onClick={() => setBoothVolModal(null)}
              >
                <div
                  className="bg-surface rounded-card shadow-card w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="bg-navy text-white px-5 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <i className="ph ph-users text-saffron text-[14px]" />
                      <div>
                        <div className="text-[12px] font-bold leading-tight">
                          Volunteers — Booth {booth?.number}
                        </div>
                        <div className="text-[9.5px] text-white/60 mt-[1px]">{booth?.name}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setBoothVolModal(null)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all text-[14px]"
                    >
                      <i className="ph ph-x" />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="overflow-y-auto flex-1">
                    {vols.length === 0 ? (
                      <p className="text-muted text-[11px] text-center py-8 italic">
                        No volunteers assigned to this booth.
                      </p>
                    ) : (
                      <div className="divide-y divide-border">
                        {vols.map(v => {
                          const displayName = v.name || v.user_name || v.username || `Volunteer #${v.id}`
                          const statusCls   = STATUS_COLOR[v.status ?? ''] ?? 'bg-gray-100 text-gray-500'
                          return (
                            <div key={v.id} className="flex items-center gap-3 px-5 py-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: '#e8f0fe' }}>
                                <i className="ph ph-user text-[14px]" style={{ color: '#1a56db' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-body">{displayName}</p>
                                <p className="text-[10px] text-muted truncate">
                                  {[v.phone, v.role, v.volunteer_type].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              {v.status && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize flex-shrink-0 ${statusCls}`}>
                                  {v.status.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="border-t border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
                    <span className="text-[10px] text-muted">{vols.length} volunteer{vols.length !== 1 ? 's' : ''}</span>
                    <button
                      onClick={() => setBoothVolModal(null)}
                      className="px-4 py-[6px] rounded-md bg-navy text-white text-[11px] font-bold hover:bg-navy/80 transition-all"
                    >Close</button>
                  </div>
                </div>
              </div>
            )
          })()}
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
          <FormGroup label="Phone(Aadhar)">
            <input ref={r.phone} type="tel" className={inputCls} placeholder="9XXXXXXXXX" />
          </FormGroup>
          <FormGroup label="Alt. Phone(AC-100)">
            <input ref={r.phone2} type="tel" className={inputCls} placeholder="Optional" />
          </FormGroup>
          <FormGroup label="Alt. Phone 2(common)">
            <input ref={r.alt_phoneno2} type="tel" className={inputCls} placeholder="Optional" />
          </FormGroup>
        </FormRow>
        <FormRow cols={2}>
          <FormGroup label="Alt. Phone 3">
            <input ref={r.alt_phoneno3} type="tel" className={inputCls} placeholder="Optional" />
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
          <FormGroup label="Pincode">
            <input ref={r.pincode} className={inputCls} placeholder="6-digit pincode" maxLength={10} />
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
              {booths.map(b => (
                <option key={b.id} value={String(b.id)}>{b.number} — {b.name}</option>
              ))}
            </select>
          </FormGroup>
        </FormRow>
        <FormRow cols={1}>
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
