import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Icon } from '@iconify/react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { TextField } from '@/components/ui/form/TextField'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { cn } from '@/lib/cn'
import {
  useCleanupCandidatesQuery,
  useRunCleanup,
  useSettingsQuery,
  useTableUsageQuery,
  useUpdateSettings,
} from './api/useSettings'

interface SettingsFormValues {
  late_fee_percent: number
  daily_interest_percent: number
}

export function SettingsPage() {
  const { data: settings, isLoading: loadingSettings } = useSettingsQuery()
  const updateMutation = useUpdateSettings()
  const { showToast } = useToast()
  const confirm = useConfirm()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SettingsFormValues>({ defaultValues: { late_fee_percent: 2, daily_interest_percent: 0.1 } })

  useEffect(() => {
    if (settings) reset({ late_fee_percent: settings.late_fee_percent, daily_interest_percent: settings.daily_interest_percent })
  }, [settings, reset])

  const onSubmit = async (values: SettingsFormValues) => {
    try {
      await updateMutation.mutateAsync({
        late_fee_percent: Number(values.late_fee_percent),
        daily_interest_percent: Number(values.daily_interest_percent),
      })
      showToast('Parâmetros de cobrança atualizados.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao salvar parâmetros.', 'error')
    }
  }

  const { data: usage, isLoading: loadingUsage } = useTableUsageQuery()
  const { data: candidates, isLoading: loadingCandidates } = useCleanupCandidatesQuery()
  const runCleanupMutation = useRunCleanup()

  const handleCleanup = async (key: string, label: string, count: number) => {
    if (count === 0) return
    const ok = await confirm({
      title: label,
      description: `Isso excluirá permanentemente ${count} empréstimo(s) e suas parcelas/pagamentos. Essa ação não pode ser desfeita.`,
      confirmLabel: 'Excluir registros',
      variant: 'danger',
    })
    if (!ok) return
    try {
      await runCleanupMutation.mutateAsync(key)
      showToast('Limpeza concluída.', 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao executar limpeza.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Configurações" description="Parâmetros de cobrança e manutenção do banco de dados" />

      <Card>
        <CardHeader>
          <CardTitle>Multa e juros de mora</CardTitle>
          <CardDescription>
            Aplicados automaticamente sobre o saldo de qualquer parcela atrasada, em todos os empréstimos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSettings ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:max-w-md sm:grid-cols-2">
                <TextField
                  label="Multa por atraso (%)"
                  type="number"
                  step="0.01"
                  min={0}
                  hint="Aplicada uma vez, ao entrar em atraso"
                  {...register('late_fee_percent', { valueAsNumber: true })}
                />
                <TextField
                  label="Juros de mora (% ao dia)"
                  type="number"
                  step="0.01"
                  min={0}
                  hint="Aplicado por dia de atraso"
                  {...register('daily_interest_percent', { valueAsNumber: true })}
                />
              </div>
              <div>
                <Button type="submit" loading={isSubmitting}>
                  Salvar parâmetros
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uso estimado por tabela</CardTitle>
          <CardDescription>
            Contagem de linhas por tabela, comparada a limites internos de referência. Para uso real em MB, acesse o
            painel do Supabase em <span className="font-medium text-text-secondary">Settings → Usage → Database Size</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsage || !usage ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {usage.map((item) => {
                const percent = Math.min(100, Math.round((item.count / item.softLimit) * 100))
                const isWarning = percent >= 70
                return (
                  <div key={item.table}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="text-text-secondary">{item.label}</span>
                      <span className="text-text-muted">
                        {item.count.toLocaleString('pt-BR')} / {item.softLimit.toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-elevated">
                      <div
                        className={cn('h-full rounded-full', isWarning ? 'bg-warning' : 'bg-brand-500')}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rotinas de limpeza</CardTitle>
          <CardDescription>
            Remove permanentemente empréstimos quitados muito antigos. Sempre confirme antes de excluir — são
            registros financeiros reais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCandidates || !candidates ? (
            <Skeleton className="h-14 w-full" />
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {candidates.map((candidate) => (
                <div
                  key={candidate.key}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{candidate.label}</p>
                    <p className="text-xs text-text-muted">
                      {candidate.description} · {candidate.count} registro(s) encontrado(s)
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={candidate.count === 0}
                    loading={runCleanupMutation.isPending}
                    onClick={() => handleCleanup(candidate.key, candidate.label, candidate.count)}
                  >
                    <Icon icon="tabler:trash" className="size-4" />
                    Limpar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
