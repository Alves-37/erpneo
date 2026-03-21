import { create } from 'zustand'

export function makeProductsCacheKey({ companyId, branchId, establishmentId, scope }) {
  const c = companyId != null ? String(companyId) : '0'
  const b = branchId != null ? String(branchId) : '0'
  const e = establishmentId != null ? String(establishmentId) : '0'
  const s = scope ? String(scope) : 'default'
  return `${s}:c${c}:b${b}:e${e}`
}

export const useProductStore = create((set) => ({
  cache: {},
  setCache: (key, value) =>
    set((s) => ({
      cache: {
        ...(s.cache || {}),
        [key]: value,
      },
    })),
  clearCache: (key) =>
    set((s) => {
      const next = { ...(s.cache || {}) }
      delete next[key]
      return { cache: next }
    }),
  clearAll: () => set({ cache: {} }),
}))
