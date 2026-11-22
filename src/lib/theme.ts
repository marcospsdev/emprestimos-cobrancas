import { useSyncExternalStore } from 'react'

/** 'system' segue o tema do aparelho (claro/escuro). */
export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// Mesma chave e mesma lógica do script inline do index.html (que aplica o
// tema antes do React carregar, para a tela não piscar).
const STORAGE_KEY = 'theme'
const THEME_COLOR: Record<ResolvedTheme, string> = { dark: '#08090b', light: '#f4f5f7' }

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: light)') : null
const listeners = new Set<() => void>()

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* armazenamento bloqueado: segue o aparelho */
  }
  return 'system'
}

let preference: ThemePreference = readPreference()

function resolve(pref: ThemePreference): ResolvedTheme {
  // Sem preferência do aparelho, fica no escuro (o visual original do app).
  if (pref === 'system') return media?.matches ? 'light' : 'dark'
  return pref
}

function apply() {
  const theme = resolve(preference)
  const root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme])
  listeners.forEach((l) => l())
}

media?.addEventListener('change', () => {
  if (preference === 'system') apply()
})

export function setThemePreference(next: ThemePreference) {
  preference = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  apply()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Preferência escolhida + tema efetivo (claro/escuro). */
export function useTheme() {
  const pref = useSyncExternalStore(subscribe, () => preference)
  const resolved = useSyncExternalStore(subscribe, () => resolve(preference))
  return { preference: pref, resolved, setPreference: setThemePreference }
}
