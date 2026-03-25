import React, { useState } from 'react'
import { TOP_NAV_TABS } from '../../constants/nav.constants'
import type { PageId } from '../../types/nav.types'

interface NavTabsProps {
  activePage:   PageId
  onPageChange: (id: PageId) => void
}

export default function NavTabs({ activePage, onPageChange }: NavTabsProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeTab = TOP_NAV_TABS.find(t => t.id === activePage)

  return (
    <div
      className="relative"
      style={{ background: 'linear-gradient(90deg,#0b1d45,#0d2455)' }}
    >
      {/* ── Desktop: horizontal tab strip ── */}
      <div className="scrollbar-none hidden md:flex overflow-x-auto border-b border-white/[0.08] px-3 gap-0">
        {TOP_NAV_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onPageChange(tab.id)}
            className={`
              px-5 py-[10px] text-[11px] font-bold tracking-[1.5px] uppercase
              border-b-[3px] whitespace-nowrap transition-all duration-200
              font-inter flex items-center gap-[6px] flex-shrink-0
              ${activePage === tab.id
                ? 'text-white border-saffron bg-saffron/[0.08]'
                : 'text-[#7090c0] border-transparent hover:text-white hover:border-saffron'
              }
            `}
          >
            <i className={`${tab.icon} text-[13px]`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Mobile: hamburger bar ── */}
      <div className="flex md:hidden items-center border-b border-white/[0.08] px-3 py-[8px] pr-24">
        <button
          onClick={() => setMobileOpen(v => !v)}
          className="flex items-center justify-center w-8 h-8 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label="Toggle navigation"
        >
          <i className={`ph ${mobileOpen ? 'ph-x' : 'ph-list'} text-[20px]`} />
        </button>
        {activeTab && (
          <div className="ml-3 flex items-center gap-2">
            <i className={`${activeTab.icon} text-[13px] text-saffron`} />
            <span className="text-[11px] font-bold tracking-[1.5px] uppercase text-white">
              {activeTab.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Mobile: dropdown menu ── */}
      {mobileOpen && (
        <div
          className="md:hidden absolute left-0 right-0 top-full z-50 flex flex-col shadow-xl"
          style={{ background: 'linear-gradient(135deg,#0b1d45,#0d2455)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {TOP_NAV_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { onPageChange(tab.id); setMobileOpen(false) }}
              className={`
                flex items-center gap-3 px-5 py-[13px] text-[12px] font-bold tracking-[1px] uppercase
                transition-all duration-150 border-l-[3px]
                ${activePage === tab.id
                  ? 'text-white border-saffron bg-saffron/[0.1]'
                  : 'text-[#7090c0] border-transparent hover:text-white hover:bg-white/[0.05]'
                }
              `}
            >
              <i className={`${tab.icon} text-[16px]`} />
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
