import { useState } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { disablePush, enablePush, sendTestPush, usePushState, type PushState } from '@/lib/push'

/** Texto de cada situação — linguagem simples, dizendo o porquê e o que fazer. */
const COPY: Record<Exclude<PushState, 'loading'>, { title: string; text: string; icon: string }> = {
  on: {
    title: 'Avisos ativados neste aparelho',
    text: 'Você recebe um aviso um dia antes e outro no dia de cada vencimento, às 8h.',
    icon: 'tabler:bell-check',
  },
  off: {
    title: 'Avisos de vencimento desligados',
    text: 'Você não vai receber aviso um dia antes nem no dia em que um empréstimo vence.',
    icon: 'tabler:bell-off',
  },
  denied: {
    title: 'Os avisos estão bloqueados neste aparelho',
    text: 'Para liberar: toque no cadeado ao lado do endereço do site → Permissões → Notificações → Permitir. Se usa o app instalado: Configurações do celular → Apps → Empréstimos → Notificações. Depois, abra o sistema de novo.',
    icon: 'tabler:bell-x',
  },
  'ios-install': {
    title: 'No iPhone, os avisos só funcionam com o app instalado',
    text: 'Toque em Compartilhar (o quadrado com a seta para cima) → "Adicionar à Tela de Início". Depois abra o sistema pelo ícone na tela inicial e ative os avisos.',
    icon: 'tabler:device-mobile',
  },
  unsupported: {
    title: 'Este navegador não recebe avisos',
    text: 'Para receber os avisos de vencimento, abra o sistema no Google Chrome.',
    icon: 'tabler:bell-off',
  },
  'not-configured': {
    title: 'Avisos indisponíveis',
    text: 'Os avisos não foram configurados nesta instalação do sistema.',
    icon: 'tabler:bell-off',
  },
}

function useEnable() {
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)
  const enable = async () => {
    setBusy(true)
    try {
      const result = await enablePush()
      if (result === 'on') showToast('Avisos ativados! Você será avisado dos vencimentos.', 'success')
      else if (result === 'denied') showToast('Os avisos foram bloqueados. Veja como liberar logo acima.', 'warning')
      else showToast('Os avisos não foram ativados.', 'info')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível ativar os avisos.', 'error')
    } finally {
      setBusy(false)
    }
  }
  return { enable, busy }
}

/**
 * Faixa no topo do Resumo quando os avisos NÃO estão funcionando neste
 * aparelho, explicando o motivo. Some quando estão ativados.
 */
export function PushStatusBanner({ className }: { className?: string }) {
  const state = usePushState()
  const { enable, busy } = useEnable()
  if (state === 'loading' || state === 'on' || state === 'not-configured') return null
  const copy = COPY[state]

  return (
    <div
      role="status"
      className={cn('flex flex-col gap-3 rounded-2xl border border-warning/40 bg-warning-muted p-4 sm:flex-row sm:items-center', className)}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
          <Icon icon={copy.icon} className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-base font-semibold text-text-primary sm:text-sm">{copy.title}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{copy.text}</p>
        </div>
      </div>
      {state === 'off' && (
        <Button onClick={enable} loading={busy} className="w-full shrink-0 sm:w-auto">
          <Icon icon="tabler:bell-ringing" className="size-5 sm:size-4.5" />
          Ativar avisos
        </Button>
      )}
    </div>
  )
}

/** Painel completo (na Conta): situação + ativar / testar / desativar. */
export function PushSettings() {
  const state = usePushState()
  const { showToast } = useToast()
  const { enable, busy } = useEnable()
  const [testing, setTesting] = useState(false)
  const [disabling, setDisabling] = useState(false)

  if (state === 'loading') {
    return <p className="text-sm text-text-muted">Verificando os avisos…</p>
  }
  const copy = COPY[state]
  const on = state === 'on'

  const test = async () => {
    setTesting(true)
    try {
      const sent = await sendTestPush()
      showToast(sent > 0 ? 'Aviso de teste enviado. Deve chegar em alguns segundos.' : 'Nenhum aparelho com avisos ativados.', sent > 0 ? 'success' : 'warning')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao enviar o teste.', 'error')
    } finally {
      setTesting(false)
    }
  }

  const disable = async () => {
    setDisabling(true)
    try {
      await disablePush()
      showToast('Avisos desativados neste aparelho.', 'info')
    } finally {
      setDisabling(false)
    }
  }

  return (
    <div className={cn('rounded-xl border p-4', on ? 'border-success/40 bg-success-muted' : 'border-warning/40 bg-warning-muted')}>
      <div className="flex items-start gap-3">
        <Icon icon={copy.icon} className={cn('mt-0.5 size-5 shrink-0', on ? 'text-success' : 'text-warning')} />
        <div className="min-w-0">
          <p className="text-base font-semibold text-text-primary sm:text-sm">{copy.title}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{copy.text}</p>
        </div>
      </div>
      {state === 'off' && (
        <Button onClick={enable} loading={busy} className="mt-3 w-full">
          <Icon icon="tabler:bell-ringing" className="size-5 sm:size-4.5" />
          Ativar avisos
        </Button>
      )}
      {on && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={test} loading={testing}>
            <Icon icon="tabler:send" className="size-4.5" />
            Enviar teste
          </Button>
          <Button variant="ghost" onClick={disable} loading={disabling} className="text-text-secondary">
            Desativar
          </Button>
        </div>
      )}
    </div>
  )
}
