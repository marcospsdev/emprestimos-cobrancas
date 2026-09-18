// Paleta usada nos PDFs gerados pelo sistema. Documentos impressos usam fundo
// claro (economia de tinta / legibilidade), com verde e grafite como acento
// para manter a identidade visual da marca.
export const PDF_COLORS = {
  brand: [5, 150, 105] as [number, number, number],
  brandLight: [167, 243, 208] as [number, number, number],
  graphite: [30, 33, 41] as [number, number, number],
  textPrimary: [24, 24, 27] as [number, number, number],
  textSecondary: [90, 90, 97] as [number, number, number],
  border: [214, 211, 220] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
}

export const PDF_FONT = 'helvetica'
