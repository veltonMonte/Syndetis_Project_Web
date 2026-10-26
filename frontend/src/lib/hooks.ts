import { useEffect, useReducer, useState } from 'react'
import { core, errorMessage } from './api'

export function useResource<T>(path: string | null) {
  const [result, setResult] = useState<{ path: string | null; revision: number; data: T | null; error: string }>({ path: null, revision: -1, data: null, error: '' })
  const [revision, reload] = useReducer((value: number) => value + 1, 0)
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    core<T>(path, { signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setResult({ path, revision, data, error: '' })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ path, revision, data: null, error: errorMessage(error) })
    })
    return () => controller.abort()
  }, [path, revision])
  const loading = path !== null && (result.path !== path || result.revision !== revision)
  return { data: result.path === path ? result.data : null, error: loading ? '' : result.error, loading, reload }
}
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    setError('')
    try { await action() } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return { busy, error, run }
}
