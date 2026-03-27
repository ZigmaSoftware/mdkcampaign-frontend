import React from 'react'
import { CANDIDATE_NAME, CONSTITUENCY_NO, CONSTITUENCY_NAME, DISTRICT, ELECTION_YEAR } from '../../constants/app.constants'

export default function Footer() {
  return (
    <footer
      className="text-center text-[9px] text-muted py-4 px-6 border-t border-border mt-6
                 bg-white font-inter tracking-wide"
    >
      Campaign System · {CANDIDATE_NAME} · Constituency {CONSTITUENCY_NO} – {CONSTITUENCY_NAME}
      &nbsp;· {DISTRICT} · TN Assembly Election {ELECTION_YEAR} ·{' '}
      <span className="font-bold text-kampr">CONFIDENTIAL</span>
    </footer>
  )
}
