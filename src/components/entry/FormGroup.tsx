import React from 'react'

interface FormGroupProps {
  label:      string
  required?:  boolean
  children:   React.ReactNode
}

export function FormGroup({ label, required, children }: FormGroupProps) {
  return (
    <div className="flex flex-col gap-[5px]">
      <label
        className="text-[9.5px] font-bold text-navy tracking-[0.5px] uppercase"
      >
        {label}{required && <span className="text-kampr ml-[2px]">*</span>}
      </label>
      {children}
    </div>
  )
}

/* ── Shared input class string ────────────────────────── */
export const inputCls = `
  form-input
`

export const selectCls = `
  form-input pr-8 appearance-none bg-white
  bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%2364748b' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")]
  bg-no-repeat bg-[right_10px_center]
`

export const textareaCls = `
  form-input resize-y min-h-[70px]
`
