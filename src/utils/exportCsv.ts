import type { EntryRecord } from '../types/entry.types'
import type { BeneficiaryRecord, TaskRecord, VolunteerRecord } from '../hooks/useEntryAPI'

export function exportRecordsToCsv(records: EntryRecord[], moduleName: string): void {
  if (!records.length) return
  const rows: string[][] = [['#', 'Record', 'Details', 'Created']]
  records.forEach((r, i) => {
    rows.push([String(i + 1), r.keyField, r.sub, r.createdAt])
  })
  const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  downloadCsv(csv, `BJP_${moduleName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`)
}

const VOTER_COLUMNS: { key: string; label: string }[] = [
  { key: 'voter_id',         label: 'Voter ID' },
  { key: 'name',             label: 'Voter Name' },
  { key: 'father_name',      label: 'Father Name' },
  { key: 'phone',            label: 'Phone No' },
  { key: 'phone_2',          label: 'Alt Phone 1' },
  { key: 'phone_3',          label: 'Alt Phone 2' },
  { key: 'phone_4',          label: 'Alt Phone 3' },
  { key: 'gender',           label: 'Gender' },
  { key: 'age',              label: 'Age' },
  { key: 'date_of_birth',    label: 'Date of Birth' },
  { key: 'address',          label: 'Address' },
  { key: 'pincode',          label: 'Pincode' },
  { key: 'current_location', label: 'Current Location' },
  { key: 'booth',            label: 'Booth' },
  { key: 'village',          label: 'Village (Ward)' },
  { key: 'panchayat',        label: 'Panchayat' },
  { key: 'religion',         label: 'Religion' },
  { key: 'caste',            label: 'Caste' },
  { key: 'sub_caste',        label: 'Sub Caste' },
  { key: 'education',        label: 'Education' },
  { key: 'occupation',       label: 'Occupation' },
  { key: 'sentiment',        label: 'Sentiment' },
  { key: 'preferred_party',  label: 'Preferred Party' },
  { key: 'scheme_name',      label: 'Scheme' },
  { key: 'issue_name',       label: 'Issue' },
  { key: 'notes',            label: 'Notes' },
]

export function exportVotersCsv(records: EntryRecord[], boothNumberMap?: Map<string, string>): void {
  if (!records.length) return
  const header = VOTER_COLUMNS.map(c => c.label)
  const rows = records.map(r => {
    const d = r.data
    return VOTER_COLUMNS.map(c => {
      if (c.key === 'booth' && boothNumberMap) return boothNumberMap.get(d.booth) ?? d.booth ?? ''
      return d[c.key] ?? ''
    })
  })
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadCsv(csv, `BJP_Voter_Details_${new Date().toISOString().slice(0, 10)}.csv`)
}

const BENEFICIARY_COLUMNS: { key: keyof BeneficiaryRecord | 'gender_label' | 'benefit_status_label' | 'is_contacted_label'; label: string }[] = [
  { key: 'id',                    label: 'ID' },
  { key: 'name',                  label: 'Name' },
  { key: 'voter_id',              label: 'Voter ID' },
  { key: 'phone',                 label: 'Phone' },
  { key: 'phone2',                label: 'Alt Phone' },
  { key: 'age',                   label: 'Age' },
  { key: 'gender_label',          label: 'Gender' },
  { key: 'address',               label: 'Address' },
  { key: 'pincode',               label: 'Pincode' },
  { key: 'block',                 label: 'Block' },
  { key: 'union_name',            label: 'Union' },
  { key: 'panchayat_name',        label: 'Panchayat' },
  { key: 'ward',                  label: 'Ward ID' },
  { key: 'ward_name',             label: 'Ward Name' },
  { key: 'booth',                 label: 'Booth ID' },
  { key: 'booth_number',          label: 'Booth Number' },
  { key: 'booth_name',            label: 'Booth Name' },
  { key: 'scheme',                label: 'Scheme ID' },
  { key: 'scheme_display',        label: 'Scheme' },
  { key: 'scheme_name',           label: 'Scheme Name (Free Text)' },
  { key: 'benefit_type',          label: 'Benefit Type' },
  { key: 'benefit_status_label',  label: 'Benefit Status' },
  { key: 'benefit_amount',        label: 'Benefit Amount' },
  { key: 'source',                label: 'Source' },
  { key: 'is_contacted_label',    label: 'Beneficiary Contacted' },
  { key: 'notes',                 label: 'Notes' },
  { key: 'is_active',             label: 'Active' },
  { key: 'created_at',            label: 'Created At' },
  { key: 'updated_at',            label: 'Updated At' },
]

const BENEFICIARY_GENDER_LABELS: Record<string, string> = {
  m: 'Male',
  f: 'Female',
  o: 'Other',
}

const BENEFICIARY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  received: 'Received',
  rejected: 'Rejected',
}

export function exportBeneficiariesCsv(records: BeneficiaryRecord[]): void {
  if (!records.length) return

  const header = BENEFICIARY_COLUMNS.map(c => c.label)
  const rows = records.map(record =>
    BENEFICIARY_COLUMNS.map(column => {
      if (column.key === 'gender_label') {
        return BENEFICIARY_GENDER_LABELS[record.gender ?? ''] || record.gender || ''
      }
      if (column.key === 'benefit_status_label') {
        return BENEFICIARY_STATUS_LABELS[record.benefit_status ?? ''] || record.benefit_status || ''
      }
      if (column.key === 'is_contacted_label') {
        return record.is_contacted ? 'Yes' : 'No'
      }
      const value = record[column.key as keyof BeneficiaryRecord]
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      return value != null ? String(value) : ''
    })
  )

  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadCsv(csv, `BJP_Beneficiaries_${new Date().toISOString().slice(0, 10)}.csv`)
}

const VOLUNTEER_COLUMNS: { key: keyof VolunteerRecord | 'display_name' | 'status_label' | 'gender_label' | 'booths_label'; label: string }[] = [
  { key: 'id',                  label: 'ID' },
  { key: 'display_name',        label: 'Name' },
  { key: 'user_name',           label: 'User Name' },
  { key: 'username',            label: 'Username' },
  { key: 'voter_id',            label: 'Voter ID' },
  { key: 'phone',               label: 'Phone' },
  { key: 'phone2',              label: 'Alt Phone' },
  { key: 'block',               label: 'Block' },
  { key: 'ward',                label: 'Ward ID' },
  { key: 'panchayat',           label: 'Panchayat ID' },
  { key: 'panchayat_name',      label: 'Panchayat' },
  { key: 'union_name',          label: 'Union' },
  { key: 'booth',               label: 'Primary Booth ID' },
  { key: 'booth_name',          label: 'Primary Booth Name' },
  { key: 'booths_label',        label: 'Booths' },
  { key: 'role',                label: 'Role' },
  { key: 'volunteer_role',      label: 'Volunteer Role ID' },
  { key: 'volunteer_type',      label: 'Volunteer Type' },
  { key: 'status_label',        label: 'Status' },
  { key: 'age',                 label: 'Age' },
  { key: 'gender_label',        label: 'Gender' },
  { key: 'joined_date',         label: 'Joined Date' },
  { key: 'source',              label: 'Source' },
  { key: 'skills',              label: 'Designation / Skills' },
  { key: 'vehicle',             label: 'Vehicle' },
  { key: 'experience_months',   label: 'Experience Months' },
  { key: 'previous_campaigns',  label: 'Previous Campaigns' },
  { key: 'voters_contacted',    label: 'Voters Contacted' },
  { key: 'events_attended',     label: 'Events Attended' },
  { key: 'hours_contributed',   label: 'Hours Contributed' },
  { key: 'performance_score',   label: 'Performance Score' },
  { key: 'notes',               label: 'Notes' },
  { key: 'is_active',           label: 'Active' },
  { key: 'created_at',          label: 'Created At' },
]

const VOLUNTEER_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  inactive: 'Inactive',
  on_leave: 'Suspended',
}

const VOLUNTEER_GENDER_LABELS: Record<string, string> = {
  m: 'Male',
  f: 'Female',
  o: 'Other',
}

export function exportVolunteersCsv(records: VolunteerRecord[]): void {
  if (!records.length) return

  const header = VOLUNTEER_COLUMNS.map(c => c.label)
  const rows = records.map(record =>
    VOLUNTEER_COLUMNS.map(column => {
      if (column.key === 'display_name') {
        return record.name || record.user_name || record.username || `Volunteer #${record.id}`
      }
      if (column.key === 'status_label') {
        return VOLUNTEER_STATUS_LABELS[record.status ?? ''] || record.status || ''
      }
      if (column.key === 'gender_label') {
        return VOLUNTEER_GENDER_LABELS[record.gender ?? ''] || record.gender || ''
      }
      if (column.key === 'booths_label') {
        if (record.booth_names?.length) return record.booth_names.join(', ')
        if (record.booths?.length) return record.booths.join(', ')
        if (record.booth != null) return String(record.booth)
        return ''
      }
      const value = record[column.key as keyof VolunteerRecord]
      if (Array.isArray(value)) return value.join(', ')
      if (typeof value === 'boolean') return value ? 'Yes' : 'No'
      return value != null ? String(value) : ''
    })
  )

  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  downloadCsv(csv, `BJP_Volunteers_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportReportCsv(): void {
  const rows = [
    ['Metric', 'Value'],
    ['Total Voters', '2,42,185'],
    ['Booth Coverage', '67.9%'],
    ['Favourable', '61.4%'],
    ['Strongly Favourable', '40.2%'],
    ['Undecided', '24.8%'],
    ['Opposition', '13.8%'],
    ['Surveys', '38,420'],
    ['Volunteers', '1,248'],
    ['Modakkurichi', '65%'],
    ['Sivagiri', '54%'],
    ['Erode City', '48%'],
  ]
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  downloadCsv(csv, `BJP_Report_${new Date().toISOString().slice(0, 10)}.csv`)
}

const TASK_COLUMNS: { key: keyof TaskRecord; label: string }[] = [
  { key: 'id',                   label: 'ID' },
  { key: 'task_type_name',       label: 'Task Type' },
  { key: 'task_category_name',   label: 'Category' },
  { key: 'title',                label: 'Title' },
  { key: 'details',              label: 'Details' },
  { key: 'expected_datetime',    label: 'Expected Date/Time' },
  { key: 'venue',                label: 'Venue' },
  { key: 'block_name',           label: 'Block' },
  { key: 'union_name',           label: 'Union' },
  { key: 'panchayat_name',       label: 'Panchayat' },
  { key: 'booth_name',           label: 'Booth' },
  { key: 'ward_name',            label: 'Ward' },
  { key: 'volunteer_role_name',  label: 'Volunteer Role' },
  { key: 'delivery_incharge_name', label: 'Delivery Incharge' },
  { key: 'coordinator_name',     label: 'Coordinator' },
  { key: 'qty',                  label: 'Qty' },
  { key: 'status',               label: 'Status' },
  { key: 'completed_datetime',   label: 'Completed Date/Time' },
  { key: 'notes',                label: 'Notes' },
  { key: 'created_at',           label: 'Created At' },
]

export function exportTasksCsv(tasks: TaskRecord[]): void {
  if (!tasks.length) return
  const header = TASK_COLUMNS.map(c => c.label)
  const rows = tasks.map(t =>
    TASK_COLUMNS.map(c => {
      const v = t[c.key as keyof typeof t]
      return v != null ? String(v) : ''
    })
  )
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadCsv(csv, `BJP_Task_Management_${new Date().toISOString().slice(0, 10)}.csv`)
}

const CAMPAIGN_ACTIVITY_COLUMNS: { key: string; label: string }[] = [
  { key: 'type',     label: 'Activity Type' },
  { key: 'date',     label: 'Date' },
  { key: 'time',     label: 'Time' },
  { key: 'area',     label: 'Area / Block' },
  { key: 'ward',     label: 'Ward' },
  { key: 'booth',    label: 'Booth' },
  { key: 'team',     label: 'Team Lead' },
  { key: 'reach',    label: 'Reach (People)' },
  { key: 'material', label: 'Material' },
  { key: 'guest',    label: 'Special Guest' },
  { key: 'outcome',  label: 'Outcome' },
  { key: 'issues',   label: 'Issues' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'notes',    label: 'Notes' },
  { key: 'createdAt', label: 'Created At' },
]

export function exportCampaignActivitiesCsv(records: EntryRecord[]): void {
  if (!records.length) return
  const header = CAMPAIGN_ACTIVITY_COLUMNS.map(c => c.label)
  const rows = records.map(r => {
    const d = r.data ?? {}
    return CAMPAIGN_ACTIVITY_COLUMNS.map(c => {
      if (c.key === 'createdAt') return r.createdAt ?? ''
      return d[c.key] ?? ''
    })
  })
  const csv = [header, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadCsv(csv, `BJP_Campaign_Activities_${new Date().toISOString().slice(0, 10)}.csv`)
}

export function exportToCsv(headers: string[], rows: (string | number | null | undefined)[][], filename: string): void {
  const all = [headers, ...rows]
  const csv = all.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  downloadCsv(csv, filename)
}

function downloadCsv(csv: string, filename: string): void {
  // BOM makes Excel open UTF-8 CSV correctly
  const bom = '\uFEFF'
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
