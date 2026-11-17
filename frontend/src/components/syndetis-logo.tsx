import './syndetis-logo.css'

/**
 * Syndetis mark, direction "Bloco livre": three modules joined by bridges, and a fourth one
 * moved out of its slot, the way a block moves freely in the Sessão Maker.
 * Geometry lives on a 48-unit grid; the viewBox crops it to the drawing (4..44).
 * Usage rules: docs/product/marca.md.
 */
export const SYMBOL_BASE_PATH =
  'M8 8h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4v4a4 4 0 0 1 4 4h4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4h-4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4v-4a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4Z'

type SymbolProps = {
  /** Side of the square symbol. Defaults to 1em so it follows the surrounding text. */
  size?: number | string
  className?: string
  /** Accessible name. Leave empty when a parent already names the brand (a link, a heading). */
  title?: string
}

export function SyndetisSymbol({ size = '1em', className, title }: SymbolProps) {
  return (
    <svg
      className={className ? `syndetis-symbol ${className}` : 'syndetis-symbol'}
      viewBox="4 4 40 40"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <path className="syndetis-symbol__base" d={SYMBOL_BASE_PATH} />
      <rect className="syndetis-symbol__block" x="28" y="4" width="16" height="16" rx="4" />
    </svg>
  )
}

/**
 * Symbol + wordmark. Decorative by itself: give the link or heading around it aria-label="Syndetis".
 * Its size follows font-size (the wordmark is 1em, the symbol 1.11em).
 */
export function SyndetisLogo({ className }: { className?: string }) {
  return (
    <span className={className ? `syndetis-logo ${className}` : 'syndetis-logo'} aria-hidden="true">
      <SyndetisSymbol size="1.11em" />
      <span className="syndetis-logo__word">syndetis</span>
    </span>
  )
}
