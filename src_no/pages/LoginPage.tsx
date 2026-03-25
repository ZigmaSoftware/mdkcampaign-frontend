import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import bjpLogo from '../assets/logo/logo.png'
import {
  CANDIDATE_NAME, CONSTITUENCY_NO, CONSTITUENCY_NAME, DISTRICT
} from '../constants/app.constants'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) {
      setError('Please enter both username and password.')
      return
    }
    setLoading(true)
    setTimeout(() => {
      const result = login(username, password)
      if (!result.ok) setError(result.error || 'Login failed.')
      setLoading(false)
    }, 400)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      {/* Tricolor bar */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] page-enter">

          {/* Logo / branding */}
          <div className="text-center mb-7">
            {/* BJP Logo */}
            <div className="inline-flex items-center justify-center mb-4">
              <img
                src={bjpLogo}
                alt="BJP Logo"
                className="w-[80px] h-[80px] object-contain drop-shadow-lg"
              />
            </div>

            <h1 className="text-navy font-inter font-extrabold text-[20px] tracking-[1.5px] uppercase leading-tight">
              BJP Campaign System
            </h1>
            <p className="font-tamil text-[11px] text-muted mt-[3px]">
              பா.ஜ.க. தேர்தல் மேலாண்மை அமைப்பு
            </p>
            <p className="text-[10px] text-muted mt-2 tracking-wide">
              {CANDIDATE_NAME} &nbsp;·&nbsp; Con.&nbsp;{CONSTITUENCY_NO} – {CONSTITUENCY_NAME} &nbsp;·&nbsp; {DISTRICT}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-[14px] shadow-[0_4px_32px_rgba(13,36,85,0.12)] overflow-hidden">
            {/* Card header */}
            <div className="bg-navy px-6 py-4 flex items-center gap-3">
              <i className="ph ph-sign-in text-saffron text-[18px]" />
              <span className="text-white font-inter font-extrabold text-[11px] tracking-[1.5px] uppercase">
                Sign In to Your Account
              </span>
            </div>

            {/* Card body */}
            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-[12px] font-medium">
                  <i className="ph ph-warning-circle text-[16px] flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.8px] mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <i className="ph ph-user text-[16px]" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError('') }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="
                      w-full pl-9 pr-4 py-[10px] rounded-lg border border-border
                      bg-[#f8fafc] text-textMain text-[13px] font-medium
                      focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron
                      transition-all duration-150 placeholder:text-[#b0b8c4]
                    "
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.8px] mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <i className="ph ph-lock text-[16px]" />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="
                      w-full pl-9 pr-10 py-[10px] rounded-lg border border-border
                      bg-[#f8fafc] text-textMain text-[13px] font-medium
                      focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron
                      transition-all duration-150 placeholder:text-[#b0b8c4]
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy transition-colors"
                    tabIndex={-1}
                  >
                    <i className={`ph ${showPass ? 'ph-eye-slash' : 'ph-eye'} text-[16px]`} />
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full mt-2 py-[11px] rounded-lg bg-navy text-white
                  font-inter font-bold text-[13px] tracking-wide
                  flex items-center justify-center gap-2
                  hover:bg-[#163070] active:scale-[0.99]
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-all duration-150 shadow-md
                "
              >
                {loading ? (
                  <>
                    <i className="ph ph-circle-notch animate-spin text-[16px]" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <i className="ph ph-sign-in text-[16px]" />
                    Sign In
                  </>
                )}
              </button>

            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-[11px] text-muted mt-5">
            Authorised personnel only &nbsp;·&nbsp; All activity is logged
          </p>
        </div>
      </div>

      {/* Bottom tricolor */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
    </div>
  )
}
