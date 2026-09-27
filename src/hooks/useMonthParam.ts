import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { format, isSameMonth, parse, startOfMonth } from 'date-fns'

const PARAM = 'mes'

/**
 * Mês selecionado guardado na URL (?mes=2026-09). Assim o Dashboard e a lista
 * de empréstimos abrem no mesmo mês, e voltar/avançar do navegador funciona.
 */
export function useMonthParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get(PARAM)

  const month = useMemo(() => {
    if (raw && /^\d{4}-\d{2}$/.test(raw)) return parse(raw, 'yyyy-MM', new Date())
    return startOfMonth(new Date())
  }, [raw])

  const setMonth = useCallback(
    (next: Date) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev)
          if (isSameMonth(next, new Date())) params.delete(PARAM)
          else params.set(PARAM, format(next, 'yyyy-MM'))
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [month, setMonth] as const
}

export function monthQueryString(month: Date) {
  return isSameMonth(month, new Date()) ? '' : `?${PARAM}=${format(month, 'yyyy-MM')}`
}
