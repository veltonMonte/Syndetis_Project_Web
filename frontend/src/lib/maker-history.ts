import { isKnownTemplate, type LayoutConfig } from './maker'
import { editorProblem } from './editor-document'

/** Bounded snapshots. Typing in one field is one action; a new edit discards redo. */
export class MakerHistory {
  past: LayoutConfig[] = []
  future: LayoutConfig[] = []
  private current: LayoutConfig
  private group = ''
  private changedAt = 0
  constructor(config: LayoutConfig) { this.current = structuredClone(config) }
  record(next: LayoutConfig, group = '', now = Date.now()) {
    if (JSON.stringify(this.current) === JSON.stringify(next)) return false
    if (!group || group !== this.group || now - this.changedAt > 800 || !this.past.length) {
      this.past = [...this.past, structuredClone(this.current)].slice(-50)
    }
    this.current = structuredClone(next)
    this.future = []
    this.group = group
    this.changedAt = now
    return true
  }
  undo() {
    const previous = this.past.pop()
    if (!previous) return null
    this.future.push(structuredClone(this.current))
    this.current = previous
    this.group = ''
    return structuredClone(previous)
  }
  redo() {
    const next = this.future.pop()
    if (!next) return null
    this.past.push(structuredClone(this.current))
    this.current = next
    this.group = ''
    return structuredClone(next)
  }
  /** Publication metadata does not undo an already confirmed publication. */
  synchronize(config: LayoutConfig) { this.current = structuredClone(config) }
}

export interface MakerVersion { id: string; savedAt: string; label: string; config: LayoutConfig }
const versionKey = (userId: string, storeId?: string) => 'syndetis-maker-versions:' + encodeURIComponent(userId) + ':' + encodeURIComponent(storeId || 'draft')
export function readMakerVersions(userId: string, storeId?: string): MakerVersion[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(versionKey(userId, storeId)) || '[]')
    return Array.isArray(value) ? value.filter((item): item is MakerVersion => !!item && typeof item.id === 'string' && typeof item.savedAt === 'string' && Number.isFinite(Date.parse(item.savedAt)) && typeof item.label === 'string' && item.config?.version === 1 && isKnownTemplate(item.config.template) && typeof item.config.description === 'string' && Array.isArray(item.config.components) && Array.isArray(item.config.products) && Array.isArray(item.config.categories) && !editorProblem(item.config)).slice(0, 10) : []
  } catch { return [] }
}
export function saveMakerVersion(userId: string, storeId: string | undefined, config: LayoutConfig, label: string) {
  const versions = readMakerVersions(userId, storeId)
  const savedAt = new Date().toISOString()
  const next = [{ id: crypto.randomUUID(), savedAt, label, config }, ...versions].slice(0, 10)
  try { localStorage.setItem(versionKey(userId, storeId), JSON.stringify(next)); return true }
  catch { return false }
}
