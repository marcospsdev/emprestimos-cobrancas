import { useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Avisos de vencimento por push (Firebase Cloud Messaging).
 *
 * Situações possíveis neste aparelho — cada uma tem uma explicação na tela,
 * para o usuário entender por que não está recebendo os avisos:
 * - on:             ativado (permissão dada e aparelho cadastrado)
 * - off:            ainda não ativou (ou ativou e depois desativou no app)
 * - denied:         bloqueou no navegador (só dá para liberar nas configurações)
 * - ios-install:    iPhone/iPad fora do app instalado (lá só funciona instalado)
 * - unsupported:    navegador sem suporte a push
 * - not-configured: faltam as chaves do Firebase no build (problema de instalação)
 * - loading:        verificando
 */
export type PushState = 'loading' | 'on' | 'off' | 'denied' | 'ios-install' | 'unsupported' | 'not-configured'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined
const TOKEN_KEY = 'push-token'

// ---------- store (vários componentes leem o mesmo estado) ----------
let state: PushState = 'loading'
const listeners = new Set<() => void>()
function setState(next: PushState) {
  state = next
  listeners.forEach((l) => l())
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* sem armazenamento: o estado é recalculado na próxima abertura */
  }
}

function isConfigured() {
  return Object.values(firebaseConfig).every(Boolean) && !!VAPID_KEY
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function deviceLabel(): string {
  const ua = navigator.userAgent
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox/.test(ua) ? 'Firefox' : /Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Navegador'
  const os = /Android/.test(ua) ? 'Android' : isIOS() ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : ''
  return os ? `${browser} no ${os}` : browser
}

// O SDK do Firebase (~100 KB) só é baixado quando algo de push é usado.
async function loadMessaging() {
  const [{ initializeApp, getApps }, messaging] = await Promise.all([import('firebase/app'), import('firebase/messaging')])
  const app = getApps()[0] ?? initializeApp(firebaseConfig as Record<string, string>)
  return { messaging: messaging.getMessaging(app), lib: messaging }
}

async function getRegistration() {
  await navigator.serviceWorker.register('/sw.js')
  return navigator.serviceWorker.ready
}

async function basicSupport(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false
  try {
    const { isSupported } = await import('firebase/messaging')
    return await isSupported()
  } catch {
    return false
  }
}

/** Gera (ou renova) o token deste aparelho e cadastra no Supabase. */
async function registerDevice(): Promise<void> {
  const registration = await getRegistration()
  const { messaging, lib } = await loadMessaging()
  const token = await lib.getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) throw new Error('Não foi possível ativar os avisos neste aparelho.')
  const { error } = await supabase.rpc('fn_register_push_device', {
    p_token: token,
    p_platform: 'web',
    p_label: deviceLabel(),
  })
  if (error) throw new Error(error.message)
  const previous = readToken()
  // Token mudou (o navegador renova de tempos em tempos): remove o antigo.
  if (previous && previous !== token) await supabase.from('push_devices').delete().eq('token', previous)
  writeToken(token)
}

/** Descobre a situação atual. Se já estava ativado, renova o cadastro em silêncio. */
export async function refreshPushState(): Promise<PushState> {
  if (!isConfigured()) return finish('not-configured')
  if (isIOS() && !isStandalone()) return finish('ios-install')
  if (!(await basicSupport())) return finish('unsupported')
  if (Notification.permission === 'denied') return finish('denied')
  if (Notification.permission !== 'granted' || !readToken()) return finish('off')
  try {
    await registerDevice()
    return finish('on')
  } catch {
    return finish('off')
  }
}

function finish(next: PushState) {
  setState(next)
  return next
}

/** Pede permissão e ativa. Precisa ser chamado num toque do usuário. */
export async function enablePush(): Promise<PushState> {
  if (!isConfigured()) return finish('not-configured')
  const permission = await Notification.requestPermission()
  if (permission === 'denied') return finish('denied')
  if (permission !== 'granted') return finish('off')
  await registerDevice()
  return finish('on')
}

/** Desativa só neste aparelho (os outros continuam recebendo). */
export async function disablePush(): Promise<PushState> {
  const token = readToken()
  try {
    const { messaging, lib } = await loadMessaging()
    await lib.deleteToken(messaging)
  } catch {
    /* segue removendo do servidor mesmo assim */
  }
  if (token) await supabase.from('push_devices').delete().eq('token', token)
  writeToken(null)
  return finish('off')
}

/** Ao sair da conta: este aparelho para de receber os avisos dela. */
export async function forgetDeviceOnSignOut(): Promise<void> {
  const token = readToken()
  if (!token) return
  await supabase.from('push_devices').delete().eq('token', token)
  writeToken(null)
  setState('off')
}

/** Pede ao servidor um aviso de teste para os aparelhos desta conta. */
export async function sendTestPush(): Promise<number> {
  const { data, error } = await supabase.functions.invoke<{ sent: number }>('notify-due-loans', { body: { mode: 'test' } })
  if (error) throw new Error('Não foi possível enviar o teste agora. Tente de novo em instantes.')
  return data?.sent ?? 0
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePushState(): PushState {
  return useSyncExternalStore(subscribe, () => state)
}
