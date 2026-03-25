import React from 'react'
import Btn from '../ui/Btn'
import type { BtnVariant } from '../../types/ui.types'

interface FormActionsProps {
  onSave:       () => void
  onClear:      () => void
  saveLabel:    string
  saveIcon?:    string
  saveVariant?: BtnVariant
  isEditing?:   boolean
}

export default function FormActions({
  onSave,
  onClear,
  saveLabel,
  saveIcon    = 'ph ph-floppy-disk',
  saveVariant = 'primary',
  isEditing,
}: FormActionsProps) {
  return (
    <div className="flex gap-[10px] mt-[18px] pt-[14px] border-t border-border flex-wrap">
      <Btn variant={saveVariant} onClick={onSave}>
        <i className={saveIcon} />
        {isEditing ? 'Update' : saveLabel}
      </Btn>
      <Btn variant="secondary" onClick={onClear}>
        <i className="ph ph-arrows-clockwise" />
        Clear
      </Btn>
    </div>
  )
}
