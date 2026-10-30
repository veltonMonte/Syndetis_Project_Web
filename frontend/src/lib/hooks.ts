import { useEffect, useReducer, useRef, useState } from 'react'
import { core, errorMessage } from './api'

export function useResource<T>(path: string | null, scope = '') {
  const key = JSON.stringify([scope, path])
  const [result, setResult] = useState<{
    key: string
    revision: number
    data: T | null
    error: string
  }>({ key: '', revision: -1, data: null, error: '' })
  const [revision, reload] = useReducer((value: number) => value + 1, 0)
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    core<T>(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, revision, data, error: '' })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setResult({ key, revision, data: null, error: errorMessage(error) })
      })
    return () => controller.abort()
  }, [path, key, revision])
  const loading = path !== null && (result.key !== key || result.revision !== revision)
  return {
    data: path && result.key === key ? result.data : null,
    error: loading || !path ? '' : result.error,
    loading,
    reload,
  }
}
export function useAction() {
  const active = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(action: () => Promise<void>) {
    if (active.current) return
    active.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      active.current = false
      setBusy(false)
    }
  }
  return { busy, error, run }
}
