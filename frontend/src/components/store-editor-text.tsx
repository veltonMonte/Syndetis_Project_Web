import { createContext, useContext, useEffect, useRef } from 'react'
import type { StoreComponent } from '@/lib/maker'

type TextKey = 'title' | 'subtitle' | 'ctaText'
export const StoreEditing = createContext<{ select: (id: string) => void; change: (id: string, patch: Partial<StoreComponent>) => void } | null>(null)

/** The editor alone opts in. Public pages keep plain React text and no editing handlers. */
export function StoreEditorText({ section, field, fallback = '' }: { section: StoreComponent; field: TextKey; fallback?: string }) {
  const editor = useContext(StoreEditing)
  const ref = useRef<HTMLSpanElement>(null)
  const value = section[field] || fallback
  const latest = useRef(value)
  const rendered = useRef(value)
  const started = useRef(value)
  latest.current = value
  if (!ref.current || document.activeElement !== ref.current) rendered.current = value
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) ref.current.textContent = value
  }, [value])
  if (!editor) return value
  const label = field === 'title' ? 'Título' : field === 'subtitle' ? 'Texto' : 'Texto do botão'
  return <span ref={ref} className="store-editor-text" role="textbox" aria-label={label + ' no canvas: ' + section.type} aria-multiline={field === 'subtitle'} contentEditable="plaintext-only" suppressContentEditableWarning tabIndex={0}
    onFocus={() => { started.current = latest.current; editor.select(section.id) }}
    onInput={event => {
      const next = event.currentTarget.innerText.replace(/\r/g, '').slice(0, field === 'subtitle' ? 2000 : 300)
      if (next !== latest.current) editor.change(section.id, { [field]: next })
    }}
    onClick={event => event.stopPropagation()}
    onBlur={event => {
      const next = event.currentTarget.innerText.replace(/\r/g, '').trim().slice(0, field === 'subtitle' ? 2000 : 300)
      event.currentTarget.textContent = next
      if (next !== latest.current) editor.change(section.id, { [field]: next })
    }}
    onKeyDown={event => {
      event.stopPropagation()
      if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.textContent = started.current; editor.change(section.id,{[field]:started.current}); event.currentTarget.blur() }
      if (event.key === 'Enter' && (!event.shiftKey || field !== 'subtitle')) { event.preventDefault(); event.currentTarget.blur() }
    }}>{rendered.current}</span>
}
