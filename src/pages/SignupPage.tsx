import React, { useState } from 'react'
import apiClient from '../utils/api'
import {
  CANDIDATE_NAME, CONSTITUENCY_NO, CONSTITUENCY_NAME, DISTRICT
} from '../constants/app.constants'

interface SignupPageProps {
  onGoToLogin: () => void
}

export default function SignupPage({ onGoToLogin }: SignupPageProps) {
  const [username,  setUsername]  = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [role,      setRole]      = useState<'volunteer' | 'booth_agent'>('volunteer')
  const [showPass,  setShowPass]  = useState(false)
  const [showConf,  setShowConf]  = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)

  const passwordStrength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 6)            score++
    if (password.length >= 10)           score++
    if (/[A-Z]/.test(password))          score++
    if (/[0-9]/.test(password))          score++
    if (/[^A-Za-z0-9]/.test(password))   score++
    return score
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][passwordStrength]
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#138808'][passwordStrength]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return }
    if (password !== confirm)        { setError('Passwords do not match.'); return }
    if (password.length < 8)         { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    try {
      await apiClient.post('/auth/users/register/', {
        username:         username.trim(),
        password,
        password_confirm: confirm,
        role,
      })
      setSuccess(true)
    } catch (err: any) {
      const data = err?.response?.data
      const msg  = data?.username?.[0] || data?.password?.[0] || data?.detail || 'Signup failed.'
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-[14px] shadow-[0_4px_32px_rgba(13,36,85,0.12)] px-8 py-10 text-center max-w-sm w-full">
            <i className="ph-fill ph-check-circle text-kampgreen text-[48px] mb-4 block" />
            <h2 className="font-inter font-bold text-navy text-[16px] mb-2">Account Created!</h2>
            <p className="text-muted text-[13px] mb-6">Your account has been submitted. An admin will activate it shortly.</p>
            <button
              onClick={onGoToLogin}
              className="w-full py-[11px] rounded-lg bg-navy text-white font-inter font-bold text-[13px] hover:bg-[#163070] transition-all"
            >
              <i className="ph ph-sign-in text-[15px] mr-2" />
              Back to Sign In
            </button>
          </div>
        </div>
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] page-enter">

          {/* Branding */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center w-[72px] h-[72px] rounded-full bg-navy mb-4 shadow-[0_4px_24px_rgba(13,36,85,0.25)]">
              <i className="ph ph-flower-lotus text-saffron text-[38px] leading-none"
                 style={{ filter: 'drop-shadow(0 0 10px rgba(255,153,51,0.7))' }} />
            </div>
            <h1 className="text-navy font-inter font-extrabold text-[20px] tracking-[1.5px] uppercase leading-tight">
              Campaign System
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
            <div className="bg-navy px-6 py-4 flex items-center gap-3">
              <i className="ph ph-user-plus text-saffron text-[18px]" />
              <span className="text-white font-inter font-extrabold text-[11px] tracking-[1.5px] uppercase">
                Create New Account
              </span>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-[12px] font-medium">
                  <i className="ph ph-warning-circle text-[16px] flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.8px] mb-1.5">Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <i className="ph ph-user text-[16px]" />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError('') }}
                    placeholder="Choose a username (min. 3 chars)"
                    autoComplete="username"
                    className="w-full pl-9 pr-4 py-[10px] rounded-lg border border-border bg-[#f8fafc] text-textMain text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition-all duration-150 placeholder:text-[#b0b8c4]"
                  />
                </div>
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.8px] mb-1.5">Account Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'volunteer',   label: 'Volunteer',   sub: 'Field access',   icon: 'ph-fill ph-user-circle'  },
                    { value: 'booth_agent', label: 'Booth Agent', sub: 'Booth access',   icon: 'ph-fill ph-map-pin'       },
                  ] as const).map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`
                        flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-inter
                        transition-all duration-150 cursor-pointer
                        ${role === r.value ? 'border-saffron bg-saffron/10 shadow-md' : 'border-border bg-[#f8fafc] hover:border-saffron/40'}
                      `}
                    >
                      <i className={`${r.icon} text-[26px] ${role === r.value ? 'text-saffron' : 'text-muted'}`} />
                      <div className="text-center">
                        <span className={`block text-[12px] font-bold ${role === r.value ? 'text-navy' : 'text-muted'}`}>{r.label}</span>
                        <span className="block text-[10px] text-muted mt-0.5">{r.sub}</span>
                      </div>
                      {role === r.value && (
                        <span className="w-5 h-5 rounded-full bg-saffron flex items-center justify-center">
                          <i className="ph-fill ph-check text-white text-[12px]" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.8px] mb-1.5">Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <i className="ph ph-lock text-[16px]" />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full pl-9 pr-10 py-[10px] rounded-lg border border-border bg-[#f8fafc] text-textMain text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition-all duration-150 placeholder:text-[#b0b8c4]"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy transition-colors" tabIndex={-1}>
                    <i className={`ph ${showPass ? 'ph-eye-slash' : 'ph-eye'} text-[16px]`} />
                  </button>
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
                          style={{ background: i <= passwordStrength ? strengthColor : '#e2e8f0' }} />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[11px] font-bold text-muted uppercase tracking-[0.8px] mb-1.5">Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                    <i className="ph ph-lock-key text-[16px]" />
                  </span>
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setError('') }}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={`w-full pl-9 pr-10 py-[10px] rounded-lg border text-[13px] font-medium bg-[#f8fafc] text-textMain focus:outline-none focus:ring-2 focus:ring-saffron/40 focus:border-saffron transition-all duration-150 placeholder:text-[#b0b8c4] ${confirm && confirm !== password ? 'border-red-400' : 'border-border'}`}
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy transition-colors" tabIndex={-1}>
                    <i className={`ph ${showConf ? 'ph-eye-slash' : 'ph-eye'} text-[16px]`} />
                  </button>
                  {confirm && confirm === password && (
                    <span className="absolute right-9 top-1/2 -translate-y-1/2 text-kampgreen">
                      <i className="ph-fill ph-check-circle text-[16px]" />
                    </span>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-[11px] rounded-lg bg-navy text-white font-inter font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 hover:bg-[#163070] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-md"
              >
                {loading
                  ? <><i className="ph ph-circle-notch animate-spin text-[16px]" /> Creating account…</>
                  : <><i className="ph ph-user-plus text-[16px]" /> Create Account</>
                }
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-muted text-[11px] font-medium">OR</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <p className="text-center text-[12px] text-muted">
                Already have an account?{' '}
                <button type="button" onClick={onGoToLogin}
                  className="text-saffron font-bold hover:text-saffron-dark underline underline-offset-2 transition-colors">
                  Sign In
                </button>
              </p>
            </form>
          </div>

          <p className="text-center text-[11px] text-muted mt-5">
            Authorised personnel only &nbsp;·&nbsp; All activity is logged
          </p>
        </div>
      </div>

      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#FF9933 33.33%,#fff 33.33% 66.66%,#138808 66.66%)' }} />
    </div>
  )
}
