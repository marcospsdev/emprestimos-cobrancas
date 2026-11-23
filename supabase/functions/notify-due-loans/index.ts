// Supabase Edge Function: avisos de vencimento por push (Firebase Cloud Messaging).
//
// Dois modos:
// - Agendado (todo dia às 8h, pelo pg_cron): header "x-cron-secret" = CRON_SECRET.
//   Para cada empréstimo NÃO pago que vence amanhã ("vespera") ou hoje ("dia"),
//   manda UM aviso por empréstimo para todos os aparelhos do dono. O
//   notification_log garante que o mesmo aviso nunca sai duas vezes.
// - Teste (botão "Enviar teste" no app): body { mode: "test" } com o login do
//   usuário; manda um aviso de teste só para os aparelhos dele.
//
// Secrets (Supabase → Edge Functions → Secrets):
// - FIREBASE_SERVICE_ACCOUNT: conteúdo do JSON da conta de serviço do Firebase.
// - CRON_SECRET: texto aleatório; o mesmo vai no agendamento (pg_cron).
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já vêm prontos no ambiente.

import { createClient } from 'npm:@supabase/supabase-js@2'

const TIME_ZONE = 'America/Fortaleza'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

/** Data (yyyy-MM-dd) no fuso de Fortaleza, com deslocamento em dias. */
function localDate(offsetDays = 0): string {
  // Fortaleza não tem horário de verão: somar 24h é seguro.
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

// ---------------- Firebase: token de acesso (OAuth com a conta de serviço) ----------------

interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

function b64url(data: ArrayBuffer | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): ArrayBuffer {
  const base64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes.buffer
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${b64url(signature)}`,
    }),
  })
  if (!res.ok) throw new Error(`Falha ao autenticar no Firebase: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token
}

interface PushMessage {
  title: string
  body: string
  url: string
  tag: string
}

/** Envia para um aparelho. Retorna 'ok', 'gone' (token inválido: apagar) ou 'error'. */
async function sendToDevice(sa: ServiceAccount, accessToken: string, token: string, msg: PushMessage) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: msg.title, body: msg.body },
        data: { url: msg.url, tag: msg.tag },
        // Navegador: o service worker do app (public/sw.js) mostra e trata o toque.
        webpush: { headers: { Urgency: 'high', TTL: '86400' } },
        // App Android (futuro): mesmo aviso, agrupado por empréstimo.
        android: { priority: 'high', notification: { tag: msg.tag, channel_id: 'vencimentos' } },
      },
    }),
  })
  if (res.ok) return 'ok' as const
  const text = await res.text()
  // Aparelho desinstalou / limpou dados / token expirou: não adianta tentar de novo.
  if (res.status === 404 || text.includes('UNREGISTERED') || text.includes('registration-token-not-registered')) {
    return 'gone' as const
  }
  console.error('FCM erro', res.status, text)
  return 'error' as const
}

// ---------------- Modos ----------------

interface Device {
  id: string
  user_id: string
  token: string
}

async function sendToUser(sa: ServiceAccount, accessToken: string, devices: Device[], msg: PushMessage): Promise<number> {
  let sent = 0
  for (const device of devices) {
    const result = await sendToDevice(sa, accessToken, device.token, msg)
    if (result === 'ok') sent++
    if (result === 'gone') await admin.from('push_devices').delete().eq('id', device.id)
  }
  return sent
}

async function runTest(req: Request, sa: ServiceAccount) {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  const { data, error } = await admin.auth.getUser(jwt)
  if (error || !data.user) return json({ error: 'Faça login de novo.' }, 401)

  const { data: devices } = await admin.from('push_devices').select('id, user_id, token').eq('user_id', data.user.id)
  if (!devices?.length) return json({ sent: 0 })

  const accessToken = await getAccessToken(sa)
  const sent = await sendToUser(sa, accessToken, devices, {
    title: 'Aviso de teste',
    body: 'Se você está vendo isto, os avisos de vencimento estão funcionando.',
    url: '/',
    tag: 'teste',
  })
  return json({ sent })
}

interface DueLoan {
  id: string
  user_id: string
  amount_lent: number
  amount_to_receive: number
  due_date: string
  /** Parcelado (pode faltar enquanto a migração de parcelamento não roda). */
  installments?: number
  installments_paid?: number
  person: { name: string } | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** O que vence agora: o total, ou só a parcela da vez (a última acerta os centavos). */
function dueNow(loan: DueLoan): { amount: number; installment: string | null } {
  const n = loan.installments ?? 1
  if (n <= 1) return { amount: loan.amount_to_receive, installment: null }
  const paid = loan.installments_paid ?? 0
  const each = round2(loan.amount_to_receive / n)
  const amount = paid + 1 >= n ? round2(loan.amount_to_receive - paid * each) : each
  return { amount, installment: `parcela ${paid + 1} de ${n}` }
}

async function runDaily(sa: ServiceAccount) {
  const today = localDate(0)
  const tomorrow = localDate(1)

  const { data: loans, error } = await admin
    .from('loans')
    .select('*, person:people(name)')
    .is('paid_at', null)
    .in('due_date', [today, tomorrow])
  if (error) throw error
  if (!loans?.length) return json({ today, loans: 0, sent: 0 })

  // Base compartilhada: todo usuário vê todos os empréstimos, então cada aviso
  // vai para todos os aparelhos cadastrados (de qualquer usuário).
  const { data: devices } = await admin.from('push_devices').select('id, user_id, token')
  const allDevices = (devices ?? []) as Device[]

  const accessToken = await getAccessToken(sa)
  let sent = 0
  let skipped = 0

  for (const loan of loans as unknown as DueLoan[]) {
    const userDevices = allDevices
    if (!userDevices.length) {
      skipped++
      continue
    }
    const kind = loan.due_date === today ? 'dia' : 'vespera'

    // "Reserva" o aviso. Se já existia (rodou 2x no dia), não manda de novo.
    const { data: claimed, error: logError } = await admin
      .from('notification_log')
      .upsert({ user_id: loan.user_id, loan_id: loan.id, kind, due_date: loan.due_date }, { onConflict: 'loan_id,kind,due_date', ignoreDuplicates: true })
      .select('id')
    if (logError) throw logError
    if (!claimed?.length) {
      skipped++
      continue
    }

    const name = loan.person?.name?.trim() || 'Cliente'
    const due = dueNow(loan)
    const interest = due.installment ? 0 : Math.max(0, round2(loan.amount_to_receive - loan.amount_lent))
    const when = kind === 'dia' ? 'vence hoje' : 'vence amanhã'
    const ok = await sendToUser(sa, accessToken, userDevices, {
      title: `${name}: ${currency.format(due.amount)} ${when}`,
      body: due.installment
        ? `É a ${due.installment}. Toque para ver e cobrar.`
        : interest > 0
          ? `Ou ${currency.format(interest)} se pagar só os juros. Toque para ver e cobrar.`
          : 'Toque para ver e cobrar.',
      url: `/emprestimos?mes=${loan.due_date.slice(0, 7)}`,
      tag: `${loan.id}-${kind}`,
    })
    sent += ok
    // Nenhum aparelho recebeu: libera a "reserva" para não marcar como avisado.
    if (ok === 0) await admin.from('notification_log').delete().eq('id', claimed[0].id)
  }

  return json({ today, loans: loans.length, sent, skipped })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  try {
    const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!raw) return json({ error: 'FIREBASE_SERVICE_ACCOUNT não configurado.' }, 500)
    const sa = JSON.parse(raw) as ServiceAccount

    const body = await req.json().catch(() => ({}))
    if (body?.mode === 'test') return await runTest(req, sa)

    const cronSecret = Deno.env.get('CRON_SECRET')
    if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) return json({ error: 'Não autorizado.' }, 401)
    return await runDaily(sa)
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
