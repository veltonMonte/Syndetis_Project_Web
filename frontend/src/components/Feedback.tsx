import { Pagination as EchoPagination } from '@/components/echo/pagination'
import './feedback.css'

/** Error and loading states of a request, announced to assistive technology. */
export function Feedback({ error, loading }: { error?: string; loading?: boolean }) {
  return <div className="feedback" aria-live="polite">
    {error && <p className="notice error" role="alert">{error}</p>}
    {loading && <p className="muted feedback-loading" role="status">Carregando…</p>}
  </div>
}

/** Pages of an API listing (0-based, as the services count them) on Echo's pagination. */
export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null
  return <EchoPagination page={page + 1} count={totalPages} onPageChange={next => onChange(next - 1)}
    label="Paginação" previousLabel="Página anterior" nextLabel="Próxima página" />
}
