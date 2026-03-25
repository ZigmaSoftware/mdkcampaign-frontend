import React from 'react'
import Badge from '../ui/Badge'
import MasterRow from './MasterRow'
import type { MasterRecord } from '../../types/master.types'

interface MasterListCardProps {
  title:     string
  icon:      string
  records:   MasterRecord[]
  onEdit:    (id: string, currentKey: string) => void
  onDelete:  (id: string) => void
}

export default function MasterListCard({
  title,
  icon,
  records,
  onEdit,
  onDelete,
}: MasterListCardProps) {
  return (
    <div className="bg-surface rounded-card shadow-card overflow-hidden">
      <div className="bg-navy text-white px-[18px] py-[11px] flex items-center justify-between">
        <h3 className="font-inter text-[11px] font-extrabold tracking-[1px] uppercase flex items-center gap-2">
          <i className={`${icon}`} />
          {title}
        </h3>
        <Badge label={String(records.length)} variant="s" />
      </div>
      <div className="px-[18px] py-[16px]">
        {records.length === 0 ? (
          <p className="text-muted text-[11px] text-center py-6 italic">
            No entries yet.
          </p>
        ) : (
          records.map(rec => (
            <MasterRow
              key={rec.id}
              id={rec.id}
              label={rec.key}
              meta={rec.meta}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  )
}
