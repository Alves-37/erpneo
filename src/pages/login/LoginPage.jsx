import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { login } from '../../api/auth.js'
import { getMe } from '../../api/auth.js'
import { useAuthStore } from '../../store/authStore.js'
import { toast } from '../../services/toast.js'

export default function LoginPage() {
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const setMe = useAuthStore((s) => s.setMe)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(e) {
    e.preventDefault()

    if (!email.trim() || !password) {
      const msg = 'Preencha o email e a senha para continuar.'
      setError(msg)
      toast.error(msg)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await login({ email, password })
      setToken(data.access_token, { persist: remember })
      try {
        const me = await getMe()
        setMe(me, { persist: remember })
      } catch {
        setMe(null, { persist: remember })
      }
      navigate('/dashboard')
    } catch (err) {
      const status = err?.response?.status
      if (status === 401) {
        const msg = 'Email ou senha incorretos. Verifique e tente novamente.'
        setError(msg)
        toast.error(msg)
      } else if (err?.code === 'ERR_NETWORK' || !err?.response) {
        const msg = 'Sem conexão com o servidor. Verifique a internet e tente novamente.'
        setError(msg)
        toast.error(msg)
      } else {
        const msg = 'Não foi possível entrar agora. Tente novamente em instantes.'
        setError(msg)
        toast.error(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 sm:p-10">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-tight">Entrar</div>
          <div className="mt-1 text-sm text-slate-600">Acesse o painel do ERPCRM</div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          Online-first
        </div>
      </div>

      <form className="mt-8 flex flex-col gap-5" onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="text-sm font-medium text-slate-700">Email</div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M4 6h16v12H4V6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="m4 7 8 6 8-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type="email"
              placeholder="seuemail@empresa.com"
              autoComplete="email"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium text-slate-700">Senha</div>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path
                  d="M7 11V8a5 5 0 0 1 10 0v3"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 11h10v9H7v-9Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-12 py-3 pr-12 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              autoComplete="current-password"
            />

            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M3 3l18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10.7 10.7a3 3 0 004.24 4.24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.88 5.08A10.94 10.94 0 0112 5c7 0 10 7 10 7a17.49 17.49 0 01-4.06 5.1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.1 6.1A17.49 17.49 0 002 12s3 7 10 7a10.94 10.94 0 005.92-1.72"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path
                    d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 15a3 3 0 100-6 3 3 0 000 6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            Manter conectado
          </label>

          <button type="button" className="text-sm text-brand-700 hover:text-brand-800">
            Esqueci a senha
          </button>
        </div>

        <button
          disabled={loading}
          className="group relative inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-60"
          type="submit"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" aria-hidden="true">
                <circle cx="12" cy="12" r="10" className="opacity-25" fill="none" stroke="currentColor" strokeWidth="4" />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  className="opacity-75"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                />
              </svg>
              Entrando...
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              Entrar
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="m13 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </button>

        <div className="pt-2 text-xs text-slate-500">
          Ao entrar, você concorda com as políticas de uso do sistema.
        </div>
      </form>
    </div>
  )
}
