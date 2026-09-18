import { useQuery } from '@tanstack/react-query'
import { fetchLoansReport, fetchPaymentsReport } from './reports'

export function usePaymentsReportQuery(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'payments', from, to],
    queryFn: () => fetchPaymentsReport(from, to),
  })
}

export function useLoansReportQuery(from: string, to: string) {
  return useQuery({
    queryKey: ['reports', 'loans', from, to],
    queryFn: () => fetchLoansReport(from, to),
  })
}
