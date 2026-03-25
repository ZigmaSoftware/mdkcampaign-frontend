export type BadgeVariant = 's' | 'g' | 'r' | 'p' | 'n' | 'blue' | 'pink' | 'custom'
export type ColorToken  = 's' | 'g' | 'r' | 'p' | 'n'
export type AlertType   = 'warning' | 'success' | 'danger'
export type BtnVariant  = 'primary' | 'secondary' | 'success' | 'danger'

export interface NavTab {
  id: string
  label: string
  icon: string
}
