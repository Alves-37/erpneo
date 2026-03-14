import { useEffect, useState } from 'react'

import { toastBus } from '../services/toast.js'

function ToastIcon({ type }) {
  if (type === 'success') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (type === 'error') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-red-400" aria-hidden="true">
        <path d="M12 9v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-300" aria-hidden="true">
      <path
        d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 16v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function toastStyles(type) {
  if (type === 'success') return 'border-emerald-500/40 bg-emerald-600 text-white'
  if (type === 'error') return 'border-red-500/20 bg-slate-950/95'
  return 'border-slate-700 bg-slate-950/95'
}

export default function ToastHost() {
  const [items, setItems] = useState([])

  useEffect(() => {
    return toastBus.subscribe((t) => {
      const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())
      const toast = { id, type: t.type, message: t.message }
      setItems((prev) => [toast, ...prev].slice(0, 4))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id))
      }, 3500)
    })
  }, [])

  if (!items.length) return null

  return (
    <div className="fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur ${toastStyles(t.type)}`}
        >
          <div className="mt-0.5">
            <ToastIcon type={t.type} />
          </div>
          <div className={`text-sm leading-snug ${t.type === 'success' ? 'text-white' : 'text-slate-100'}`}>{t.message}</div>
        </div>
      ))}
    </div>
  )
}
