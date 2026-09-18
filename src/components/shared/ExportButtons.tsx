import { Icon } from '@iconify/react'
import { Button } from '@/components/ui/Button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'
import { exportTableToPdf } from '@/lib/pdf/tableExport'
import { exportTableToExcel } from '@/lib/excel/workbookExport'
import type { ReportColumn } from '@/lib/reportColumn'

interface ExportButtonsProps<T> {
  title: string
  sheetName: string
  filenameBase: string
  columns: ReportColumn<T>[]
  rows: T[]
  disabled?: boolean
}

export function ExportButtons<T>({ title, sheetName, filenameBase, columns, rows, disabled }: ExportButtonsProps<T>) {
  const { showToast } = useToast()

  const handlePdf = () => {
    exportTableToPdf(title, columns, rows, `${filenameBase}.pdf`)
  }

  const handleExcel = async () => {
    try {
      await exportTableToExcel(sheetName, columns, rows, `${filenameBase}.xlsx`)
    } catch {
      showToast('Erro ao gerar arquivo Excel.', 'error')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" disabled={disabled || rows.length === 0}>
          <Icon icon="tabler:download" className="size-4.5" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handlePdf}>
          <Icon icon="tabler:file-type-pdf" className="size-4" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleExcel}>
          <Icon icon="tabler:file-type-xls" className="size-4" />
          Exportar Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
