import { useSearchParams } from 'react-router'
import type { NavItem } from '@/constants/nav'

/** Link do item de menu, levando junto o ?mes= quando a tela de destino também usa mês. */
export function useNavTarget() {
  const [searchParams] = useSearchParams()
  const mes = searchParams.get('mes')
  return (item: NavItem) => (item.keepsMonth && mes ? `${item.to}?mes=${mes}` : item.to)
}
