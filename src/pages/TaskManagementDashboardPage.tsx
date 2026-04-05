import SectionHeader from '../components/ui/SectionHeader'
import { usePermissions } from '../context/PermissionContext'
import TaskDashboardModule from '../modules/task-dashboard/TaskDashboardModule'

interface TaskManagementDashboardPageProps {
  onOpenTaskEntry?: () => void
}

export default function TaskManagementDashboardPage({
  onOpenTaskEntry,
}: TaskManagementDashboardPageProps) {
  const { canView, loaded } = usePermissions()

  return (
    <div className="max-w-[1440px] mx-auto px-6 py-5 md:px-[10px] sm:px-2">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <SectionHeader
          title="Task Dashboard"
          icon="ph ph-kanban"
          subtitle="Unified task and campaign intelligence"
        />

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

      {loaded && !canView('event') ? (
        <div className="bg-surface border border-border rounded-card p-6 text-[13px] text-muted">
          You do not have access to Task Management.
        </div>
      ) : (
        <TaskDashboardModule />
      )}
    </div>
  )
}
