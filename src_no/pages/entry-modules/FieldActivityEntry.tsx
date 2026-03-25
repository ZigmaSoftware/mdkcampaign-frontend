import ActivityEntryBase from './ActivityEntryBase'

const ACTIVITY_TYPES = [
  'Voter Survey',
  'Door-to-Door Canvassing',
  'Material Distribution',
  'Voter Mobilisation',
  'Rally / Procession Support',
  'Posters / Banners Setup',
  'Street Corner Meeting',
  'Community Outreach',
  'Grievance Collection',
  'Field Reporting',
  'Other',
]

export default function FieldActivityEntry() {
  return (
    <ActivityEntryBase
      moduleId="field-activity"
      formId="field-activity-form"
      title="Field Activity"
      icon="ph ph-map-trifold"
      addLabel="Log Activity"
      saveLabel="Save Activity"
      listTitle="Field Activity Log"
      emptyMsg='No field activity logs yet. Click "Log Activity" to begin.'
      iconBg="#fff3e0"
      iconColor="#e07010"
      activityTypes={ACTIVITY_TYPES}
      userIdPrefix="FLD"
    />
  )
}
