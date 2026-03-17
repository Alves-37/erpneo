import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token'),
  me: (() => {
    try {
      const raw = localStorage.getItem('me')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })(),
  establishment: (() => {
    try {
      const raw = localStorage.getItem('establishment')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })(),
  branch: (() => {
    try {
      const raw = localStorage.getItem('branch')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })(),
  contextVersion: 0,
  setToken: (token, options = { persist: true }) => {
    const persist = options?.persist !== false
    if (persist) {
      if (token) localStorage.setItem('token', token)
      else localStorage.removeItem('token')
    }
    set({ token })
  },
  setMe: (me, options = { persist: true }) => {
    const persist = options?.persist !== false
    if (persist) {
      if (me) localStorage.setItem('me', JSON.stringify(me))
      else localStorage.removeItem('me')
    }
    set({ me })
  },
  setEstablishment: (establishment, options = { persist: true }) => {
    const persist = options?.persist !== false
    if (persist) {
      if (establishment) localStorage.setItem('establishment', JSON.stringify(establishment))
      else localStorage.removeItem('establishment')
    }
    set({ establishment })
  },
  setBranch: (branch, options = { persist: true }) => {
    const persist = options?.persist !== false
    if (persist) {
      if (branch) localStorage.setItem('branch', JSON.stringify(branch))
      else localStorage.removeItem('branch')
    }
    set({ branch })
  },
  bumpContext: () => set((s) => ({ contextVersion: (s.contextVersion || 0) + 1 })),
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('me')
    localStorage.removeItem('establishment')
    localStorage.removeItem('branch')
    set({ token: null, me: null, establishment: null, branch: null, contextVersion: 0 })
  },
}))
