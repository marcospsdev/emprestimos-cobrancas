import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary, fetchInterestByMonth, fetchUpcomingInstallments } from './dashboard'

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  })
}

export function useInterestByMonthQuery(monthsBack = 6) {
  return useQuery({
    queryKey: ['dashboard', 'interest-by-month', monthsBack],
    queryFn: () => fetchInterestByMonth(monthsBack),
  })
}

export function useUpcomingInstallmentsQuery(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'upcoming', limit],
    queryFn: () => fetchUpcomingInstallments(limit),
  })
}
