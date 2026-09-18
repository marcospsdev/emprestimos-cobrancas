import jsPDF from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { PDF_COLORS, PDF_FONT } from './pdfTheme'
import { APP_INFO } from '@/constants/app'
import { formatDateTime } from '@/lib/format'
import type { ReportColumn } from '@/lib/reportColumn'

export function exportTableToPdf<T>(title: string, columns: ReportColumn<T>[], rows: T[], filename: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: columns.length > 5 ? 'landscape' : 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14

  doc.setFillColor(...PDF_COLORS.graphite)
  doc.rect(0, 0, pageWidth, 22, 'F')
  doc.setFont(PDF_FONT, 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...PDF_COLORS.brandLight)
  doc.text(APP_INFO.name, margin, 14)
  doc.setFont(PDF_FONT, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.white)
  doc.text(title, pageWidth - margin, 14, { align: 'right' })

  autoTable(doc, {
    startY: 30,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(c.accessor(row)))),
    styles: { font: PDF_FONT, fontSize: 9, textColor: PDF_COLORS.textPrimary },
    headStyles: { fillColor: PDF_COLORS.graphite, textColor: PDF_COLORS.brandLight, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 244, 252] },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, { halign: c.align ?? 'left' }]),
    ),
    margin: { left: margin, right: margin },
  })

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.textSecondary)
  doc.text(`Gerado em ${formatDateTime(new Date().toISOString())} · ${rows.length} registro(s)`, margin, finalY + 8)

  doc.save(filename)
}
