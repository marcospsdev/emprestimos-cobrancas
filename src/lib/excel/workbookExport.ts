import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { ReportColumn } from '@/lib/reportColumn'
import { APP_INFO } from '@/constants/app'

export async function exportTableToExcel<T>(
  sheetName: string,
  columns: ReportColumn<T>[],
  rows: T[],
  filename: string,
) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = APP_INFO.name
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(sheetName)
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.header, width: c.width ?? 22 }))

  rows.forEach((row) => {
    sheet.addRow(Object.fromEntries(columns.map((c) => [c.header, c.accessor(row)])))
  })

  const headerRow = sheet.getRow(1)
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFA7F3D0' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E2129' } }
    cell.alignment = { vertical: 'middle' }
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, filename)
}
