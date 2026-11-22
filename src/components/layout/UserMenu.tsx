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

/** Menu da conta (avisos / alterar senha / sair). O gatilho visual muda entre celular e desktop. */
export function UserMenu({ trigger, side = 'bottom' }: { trigger: ReactNode; side?: 'top' | 'bottom' }) {
  const { user, signOut } = useAuth()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const pushState = usePushState()
  const pushOn = pushState === 'on'
  const { showToast } = useToast()

  const handleSignOut = async () => {
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
          <DropdownMenuItem onSelect={() => setPushOpen(true)}>
            <Icon icon={pushOn ? 'tabler:bell-check' : 'tabler:bell-off'} className={pushOn ? 'size-4 text-success' : 'size-4 text-warning'} />
            <span className="flex-1">Avisos de vencimento</span>
            <span className={pushOn ? 'text-xs text-success' : 'text-xs text-warning'}>{pushOn ? 'Ativados' : 'Desligados'}</span>
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
      <SimpleDialog open={pushOpen} onOpenChange={setPushOpen} title="Avisos de vencimento" size="sm">
        <PushSettings />
      </SimpleDialog>
    </>
  )
}
