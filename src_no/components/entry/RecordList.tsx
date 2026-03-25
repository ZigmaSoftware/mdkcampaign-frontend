import React from 'react'
import RecordItem from './RecordItem'
import type { EntryRecord } from '../../types/entry.types'

interface RecordListProps {
  records:     EntryRecord[]
  editingId?:  string | null
  emptyMsg:    string
  icon:        string
  iconBg:      string
  iconColor:   string
  onEdit:      (id: string) => void
  onDelete:    (id: string) => void
}

export default function RecordList({
  records,
  editingId,
  emptyMsg,
  icon,
  iconBg,
  iconColor,
  onEdit,
  onDelete,
}: RecordListProps) {
  if (!records.length) {
    return (
      <p className="text-muted text-[11px] text-center py-6 italic">
        {emptyMsg}
      </p>
    )
  }

  return (
    <div className="mt-[14px]">
      {records.map((rec, i) => (
        <RecordItem
          key={rec.id}
          index={i + 1}
          icon={icon}
          iconBg={iconBg}
          iconColor={iconColor}
          title={rec.keyField}
          sub={rec.sub}
          isEditing={rec.id === editingId}
          onEdit={() => onEdit(rec.id)}
          onDelete={() => onDelete(rec.id)}
        />
      ))}
    </div>
  )
}
