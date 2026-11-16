/**
 * Addresses written by merchants (links, logos, photos) reach every shopper's browser, so only
 * web addresses are rendered: `javascript:`, `data:` and protocol-relative values are refused.
 */

/** An absolute http(s) link, the only kind a storefront button may point to outside the shop. */
export const isHttpUrl = (value: string | null | undefined): value is string =>
  !!value && /^https?:\/\/[^\s]+$/i.test(value)

/** An image source: absolute http(s), or a path on this origin (`/images/...`, never `//host`). */
export const isSafeImageSrc = (value: string | null | undefined): value is string =>
  !!value && /^(https?:\/\/|\/(?!\/))[^\s]*$/i.test(value)
