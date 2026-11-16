import type { CartLine } from './types'

const MAX_LINES = 100
const MAX_QUANTITY = 99

const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max

/**
 * Reads the cart a shopper left in this tab. The stored text is not trusted: anything that is not
 * a well-formed line is dropped, so tampered or outdated data cannot break the page. Prices here
 * are only for display — the order service recalculates every total.
 */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const lines: CartLine[] = []
  const seen = new Set<string>()
  for (const item of parsed.slice(0, MAX_LINES)) {
    const product = (item as { product?: Record<string, unknown> } | null)?.product
    const quantity = (item as { quantity?: unknown } | null)?.quantity
    if (!product || typeof product !== 'object') continue
    const { id, name, price, sku, description, imageUrl, categoryId, available } = product
    if (!text(id, 64) || seen.has(id) || !text(name, 200)) continue
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) continue
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1) continue
    seen.add(id)
    lines.push({
      product: {
        id,
        name,
        price,
        sku: typeof sku === 'string' ? sku.slice(0, 100) : '',
        description: typeof description === 'string' ? description.slice(0, 10000) : null,
        imageUrl: typeof imageUrl === 'string' ? imageUrl.slice(0, 2048) : null,
        categoryId: typeof categoryId === 'string' ? categoryId : null,
        ...(typeof available === 'number' && Number.isFinite(available) ? { available } : {}),
      },
      quantity: Math.min(MAX_QUANTITY, quantity),
    })
  }
  return lines
}
