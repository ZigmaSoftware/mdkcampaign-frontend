import ActivityEntryBase from './ActivityEntryBase'

const ACTIVITY_TYPES = [
  'Door-to-Door Visit',
  'WhatsApp Campaign',
  'Event Support',
  'Data Entry',
  'Voter Awareness Drive',
  'Transportation / Logistics',
  'Booth Setup',
  'Pamphlet Distribution',
  'Women Wing Programme',
  'Youth Wing Programme',
  'Other',
]

export default function VolunteerActivityEntry() {
  return (
    <ActivityEntryBase
      moduleId="volunteer-activity"
      formId="volunteer-activity-form"
      title="Volunteer Activity"
      icon="ph ph-clipboard-text"
      addLabel="Log Activity"
      saveLabel="Save Activity"
      listTitle="Volunteer Activity Log"
      emptyMsg='No volunteer activity logs yet. Click "Log Activity" to begin.'
      iconBg="#dcfce7"
      iconColor="#138808"
      activityTypes={ACTIVITY_TYPES}
      userIdPrefix="VOL"
    />
  )
}
