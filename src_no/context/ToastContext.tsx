import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'

interface ToastState {
  message:  string
  color:    string
  visible:  boolean
  leaving:  boolean
}

type ToastAction =
  | { type: 'SHOW'; message: string; color: string }
  | { type: 'HIDE' }
  | { type: 'LEAVE' }

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'SHOW':
      return { message: action.message, color: action.color, visible: true, leaving: false }
    case 'LEAVE':
      return { ...state, leaving: true }
    case 'HIDE':
      return { ...state, visible: false, leaving: false }
    default:
      return state
  }
}

interface ToastContextValue {
  showToast: (message: string, color?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, {
    message: '', color: '#FF9933', visible: false, leaving: false,
  })
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, color = '#FF9933') => {
    if (timerRef.current)   clearTimeout(timerRef.current)
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    dispatch({ type: 'SHOW', message, color })
    leaveTimer.current = setTimeout(() => dispatch({ type: 'LEAVE' }), 2700)
    timerRef.current   = setTimeout(() => dispatch({ type: 'HIDE' }),  3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {state.visible && (
        <div
          className={`
            fixed bottom-6 right-6 z-[9999] flex items-center gap-3
            bg-white rounded-[10px] px-4 py-3 min-w-[260px] max-w-[380px]
            shadow-card2 border-l-4 text-[12px] font-semibold text-textMain
            ${state.leaving ? 'toast-hide' : 'toast-show'}
          `}
          style={{ borderLeftColor: state.color }}
          dangerouslySetInnerHTML={{ __html: state.message }}
        />
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
