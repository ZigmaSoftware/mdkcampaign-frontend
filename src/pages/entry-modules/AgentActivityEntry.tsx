import ActivityEntryBase from './ActivityEntryBase'

const ACTIVITY_TYPES = [
  'Booth Monitoring',
  'Voter List Verification',
  'Agent Coordination Meeting',
  'Voter Slip Distribution',
  'Absent Voter Follow-up',
  'Polling Day Duty',
  'Mock Poll',
  'Agent Training',
  'Issue Escalation',
  'Daily Reporting',
  'Other',
]

export default function AgentActivityEntry() {
  return (
    <ActivityEntryBase
      moduleId="agent-activity"
      title="Agent Activity"
      icon="ph ph-identification-card"
      addLabel="Log Activity"
      saveLabel="Save Activity"
      listTitle="Booth Agent Activity Log"
      emptyMsg='No agent activity logs yet. Click "Log Activity" to begin.'
      iconBg="#dbeafe"
      iconColor="#0d2455"
      activityTypes={ACTIVITY_TYPES}
      userIdPrefix="AGT"
    />
  )
}
