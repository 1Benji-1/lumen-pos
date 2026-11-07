const CODE39_PATTERNS: Record<string, string> = {
  '0': '000110100',
  '1': '100100001',
  '2': '001100001',
  '3': '101100000',
  '4': '000110001',
  '5': '100110000',
  '6': '001110000',
  '7': '000100101',
  '8': '100100100',
  '9': '001100100',
  'A': '100001001',
  'B': '001001001',
  'C': '101001000',
  'D': '000011001',
  'E': '100011000',
  'F': '001011000',
  'G': '000001101',
  'H': '100001100',
  'I': '001001100',
  'J': '000011100',
  'K': '100000011',
  'L': '001000011',
  'M': '101000010',
  'N': '000010011',
  'O': '100010010',
  'P': '001010010',
  'Q': '000000111',
  'R': '100000110',
  'S': '001000110',
  'T': '000010110',
  'U': '110000001',
  'V': '011000001',
  'W': '111000000',
  'X': '010010001',
  'Y': '110010000',
  'Z': '011010000',
  '-': '010000101',
  '.': '110000100',
  ' ': '011000100',
  '$': '010101000',
  '/': '010100010',
  '+': '010001010',
  '%': '000101010',
  '*': '010010100',
}

/**
 * Genera un código de barras interno con prefijo configurable (por defecto '200') + 8 dígitos aleatorios.
 */
export function generateInternalBarcode(prefix: string = '200'): string {
  const cleanPrefix = prefix.trim() || '200'
  const randomNum = Math.floor(10000000 + Math.random() * 90000000)
  return `${cleanPrefix}${randomNum}`
}

export interface BarcodeBar {
  x: number
  width: number
}

/**
 * Convierte una cadena en coordenadas de barras vectoriales (Code 39).
 */
export function encodeCode39(text: string): { bars: BarcodeBar[]; totalWidth: number } {
  const clean = (text || 'LP00000000').toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, '')
  const fullText = `*${clean}*`
  const narrowWidth = 2
  const wideWidth = 5
  const gapWidth = 2

  const bars: BarcodeBar[] = []
  let currentX = 10

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i]
    const pattern = CODE39_PATTERNS[char] ?? CODE39_PATTERNS['-']

    for (let p = 0; p < 9; p++) {
      const isBar = p % 2 === 0
      const isWide = pattern[p] === '1'
      const width = isWide ? wideWidth : narrowWidth

      if (isBar) {
        bars.push({ x: currentX, width })
      }
      currentX += width
    }
    currentX += gapWidth
  }

  return { bars, totalWidth: currentX + 10 }
}
