import { useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from '@iconify/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { ChangePasswordDialog } from '@/features/auth/ChangePasswordDialog'
import { SimpleDialog } from '@/components/ui/Dialog'
import { PushSettings } from '@/components/shared/PushStatus'
import { usePushState } from '@/lib/push'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { PixKeyDialog } from '@/features/settings/PixKeyDialog'

/** Menu da conta (avisos / alterar senha / sair). O gatilho visual muda entre celular e desktop. */
export function UserMenu({ trigger, side = 'bottom' }: { trigger: ReactNode; side?: 'top' | 'bottom' }) {
  const { user, signOut } = useAuth()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [pixOpen, setPixOpen] = useState(false)
  const pushState = usePushState()
  const pushOn = pushState === 'on'
  const pushAttention = !pushOn && pushState !== 'loading'
  const confirm = useConfirm()
  const { showToast } = useToast()

  const handleSignOut = async () => {
    const ok = await confirm({
      title: 'Sair da conta?',
      description: 'Para entrar de novo, você vai precisar do e-mail e da senha.',
      confirmLabel: 'Sair',
      variant: 'danger',
    })
    if (!ok) return
    await signOut()
    showToast('Você saiu da conta.', 'info')
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent side={side} align="end" className="w-64">
          <DropdownMenuLabel className="truncate normal-case tracking-normal">{user?.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {pushAttention ? (
            // Destaque: os avisos não estão funcionando neste aparelho.
            <DropdownMenuItem
              onSelect={() => setPushOpen(true)}
              className="mb-1 items-start border border-warning/40 bg-warning-muted text-text-primary data-[highlighted]:bg-warning/20"
            >
              <Icon icon="tabler:bell-off" className="mt-0.5 size-4 shrink-0 text-warning" />
              <span className="flex-1">
                <span className="block font-medium">Avisos de vencimento desligados</span>
                <span className="block text-xs text-text-secondary">Toque para ver o motivo e ativar</span>
              </span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setPushOpen(true)}>
              <Icon icon="tabler:bell-check" className="size-4 text-success" />
              <span className="flex-1">Avisos de vencimento</span>
              <span className="text-xs text-success">Ativados</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setPixOpen(true)}>
            <Icon icon="tabler:qrcode" className="size-4" />
            Chave Pix para cobrança
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setChangePasswordOpen(true)}>
            <Icon icon="tabler:key" className="size-4" />
            Alterar senha
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleSignOut} className="text-danger data-[highlighted]:text-danger">
            <Icon icon="tabler:logout" className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
      <PixKeyDialog open={pixOpen} onOpenChange={setPixOpen} />
      <SimpleDialog open={pushOpen} onOpenChange={setPushOpen} title="Avisos de vencimento" size="sm">
        <PushSettings />
      </SimpleDialog>
    </>
  )
}
