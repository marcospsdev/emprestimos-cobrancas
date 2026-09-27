/**
 * true em celulares/tablets (tela de toque sem mouse). Usado para NÃO focar
 * campos automaticamente nesses aparelhos: foco automático abre o teclado
 * virtual sem a pessoa ter tocado em nenhum campo.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}
