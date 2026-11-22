import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Icon } from '@iconify/react'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { PushSettings } from '@/components/shared/PushStatus'
import { ChangePasswordDialog } from './ChangePasswordDialog'

interface AccountSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "Conta" no celular: folha que sobe de baixo com botões grandes e escritos
 * (no lugar de um menu suspenso pequeno atrás de um ícone). Sair pede confirmação.
 */
export function AccountSheet({ open, onOpenChange }: AccountSheetProps) {
  const { user, signOut } = useAuth()
  const confirm = useConfirm()
  const { showToast } = useToast()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const navigate = useNavigate()

  const openStorage = () => {
    onOpenChange(false)
    navigate('/armazenamento')
  }

  const openChangePassword = () => {
    onOpenChange(false)
    setChangePasswordOpen(true)
  }

  const handleSignOut = async () => {
    onOpenChange(false)
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
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Minha conta</DialogTitle>
            <DialogDescription className="truncate">{user?.email}</DialogDescription>
          </DialogHeader>
          <DialogBody className="pb-6">
            <p className="mb-2 text-sm font-medium text-text-secondary">Avisos de vencimento</p>
            <PushSettings />
            <p className="mt-5 mb-2 text-sm font-medium text-text-secondary">Conta</p>
            <div className="flex flex-col gap-2">
              <SheetButton icon="tabler:database" label="Armazenamento" onClick={openStorage} />
              <SheetButton icon="tabler:key" label="Alterar senha" onClick={openChangePassword} />
              <SheetButton icon="tabler:logout" label="Sair da conta" onClick={handleSignOut} danger />
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  )
}

function SheetButton({ icon, label, onClick, danger }: { icon: string; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 text-left text-base font-medium transition-colors',
        danger
          ? 'border-danger/30 bg-danger-muted text-danger active:bg-danger/20'
          : 'border-border-strong bg-surface-elevated text-text-primary active:bg-surface-hover',
      )}
    >
      <Icon icon={icon} className="size-5 shrink-0" />
      <span className="flex-1">{label}</span>
      {!danger && <Icon icon="tabler:chevron-right" className="size-5 text-text-muted" />}
    </button>
  )
}
