import { useEffect, useRef, useState } from 'react'
import { errorMessage, syncStoreLayout } from './api'
import { editorProblem } from './editor-document'
import type { LayoutConfig } from './maker'

export function syncSignature(config: LayoutConfig) {
  const settings = { ...config.settings, published: false, publishedAt: undefined }
  return JSON.stringify({ ...config, settings })
}
export function useMakerSync(config: LayoutConfig, userId: string, storeId: string | undefined, onStoreSaved: (id: string) => void, enabled: boolean) {
  const signature = syncSignature(config)
  const latest = useRef({ config, signature, storeId, onStoreSaved })
  latest.current = { config, signature, storeId, onStoreSaved }
  const observed = useRef(signature)
  const active = useRef(true)
  const queue = useRef(Promise.resolve())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<{ phase: 'local' | 'waiting' | 'saving' | 'synced' | 'error'; savedAt?: string; error?: string }>({ phase: 'local' })
  useEffect(() => { active.current = true; return () => { active.current = false; if (timer.current) clearTimeout(timer.current) } }, [])
  function save(publish = false) {
    if (timer.current) clearTimeout(timer.current)
    const snapshot = structuredClone(latest.current.config)
    const snapshotSignature = syncSignature(snapshot)
    const job = queue.current.then(async () => {
      if (!active.current) throw new Error('Editor fechado. Seu rascunho continua neste navegador.')
      setState({ phase: 'saving' })
      try {
        const result = await syncStoreLayout(snapshot, publish, { userId, storeId: latest.current.storeId })
        if (active.current) {
          if (result.storeId) {
            latest.current.storeId = result.storeId
            latest.current.onStoreSaved(result.storeId)
          }
          if (!result.syncedWithBackend) setState({ phase: 'error', error: result.error || 'O servidor não confirmou o salvamento.' })
          else if (latest.current.signature === snapshotSignature) setState({ phase: 'synced', savedAt: new Date().toISOString() })
          else setState({ phase: 'waiting' })
        }
        return result
      } catch (error) {
        if (active.current) setState({ phase: 'error', error: errorMessage(error) })
        throw error
      }
    })
    queue.current = job.then(() => undefined, () => undefined)
    return job
  }
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    if (signature === observed.current) return
    if (timer.current) clearTimeout(timer.current)
    if (!enabled) return
    observed.current = signature
    if (editorProblem(latest.current.config) || !latest.current.config.components?.some(section => section.visible)) {
      setState({ phase: 'local' })
      return
    }
    setState({ phase: 'waiting' })
    timer.current = setTimeout(() => { void saveRef.current().catch(() => undefined) }, 1800)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [signature, enabled])
  return { ...state, save }
}
