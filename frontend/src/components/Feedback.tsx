export function Feedback({ error, loading }: { error?: string; loading?: boolean }) {
  return <div aria-live="polite">{error && <p className="notice error" role="alert">{error}</p>}{loading && <p className="muted">Carregando…</p>}</div>
}
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <nav className="actions" aria-label="Paginação">
    <button className="secondary" disabled={page === 0} onClick={() => onChange(page - 1)}>Anterior</button>
    <span>{page + 1} de {totalPages}</span>
    <button className="secondary" disabled={page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Próxima</button>
  </nav>
}
