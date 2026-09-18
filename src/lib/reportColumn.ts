export interface ReportColumn<T> {
  header: string
  accessor: (row: T) => string | number
  width?: number
  align?: 'left' | 'right' | 'center'
}
