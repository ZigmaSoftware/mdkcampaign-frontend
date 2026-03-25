import React from 'react'

interface FormRowProps {
  cols?:     1 | 2 | 3 | 4
  children:  React.ReactNode
  className?: string
}

const colsMap: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export default function FormRow({ cols = 1, children, className = '' }: FormRowProps) {
  return (
    <div
      className={`grid gap-3 mb-[14px] ${colsMap[cols]} ${className}`}
    >
      {children}
    </div>
  )
}
