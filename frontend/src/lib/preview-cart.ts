import type { StoreProduct } from './maker'

export interface PreviewCartLine {
  key: string
  product: StoreProduct
  choices: Record<string, string>
  quantity: number
}
export function previewStockLeft(
  lines: PreviewCartLine[],
  product: StoreProduct,
  exceptKey?: string,
) {
  const used = lines
    .filter((line) => line.product.id === product.id && line.key !== exceptKey)
    .reduce((sum, line) => sum + line.quantity, 0)
  return Math.max(0, Math.floor(product.stock) - used)
}
export function addPreviewLine(
  lines: PreviewCartLine[],
  product: StoreProduct,
  choices: Record<string, string> = {},
) {
  if (previewStockLeft(lines, product) < 1) return lines
  const key = JSON.stringify([
    product.id,
    Object.entries(choices).sort(([a], [b]) => a.localeCompare(b)),
  ])
  const existing = lines.find((line) => line.key === key)
  return existing
    ? lines.map((line) =>
        line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
      )
    : [...lines, { key, product, choices, quantity: 1 }]
}
export function setPreviewQuantity(
  lines: PreviewCartLine[],
  key: string,
  quantity: number,
) {
  if (!Number.isFinite(quantity)) return lines
  if (quantity <= 0) return lines.filter((line) => line.key !== key)
  return lines
    .map((line) =>
      line.key === key
        ? {
            ...line,
            quantity: Math.min(
              previewStockLeft(lines, line.product, key),
              Math.floor(quantity),
            ),
          }
        : line,
    )
    .filter((line) => line.quantity > 0)
}
export function previewSubtotal(lines: PreviewCartLine[]) {
  return (
    lines.reduce(
      (sum, line) => sum + Math.round(line.product.price * 100) * line.quantity,
      0,
    ) / 100
  )
}
