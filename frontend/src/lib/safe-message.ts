const GENERIC_ERROR = 'Não foi possível concluir a operação.'

/**
 * What a failed response may show to a person. An unexpected server fault (500) never surfaces
 * its own text: it can carry internals. Other statuses keep the explanation the services write
 * for people (including 502/503 such as "A reserva expirou."), as plain text of bounded length;
 * React escapes it on render.
 */
export function safeServerMessage(
  status: number,
  body: { detail?: unknown; message?: unknown } | null,
): string {
  if (status === 500) return 'O serviço encontrou um erro inesperado. Tente novamente em instantes.'
  const raw = body?.detail ?? (Array.isArray(body?.message) ? body.message.join('; ') : body?.message)
  if (typeof raw !== 'string') return GENERIC_ERROR
  const text = raw.replace(/\s+/g, ' ').trim()
  return text ? (text.length > 300 ? text.slice(0, 299) + '…' : text) : GENERIC_ERROR
}
