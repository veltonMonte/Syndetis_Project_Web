import { useRef, useState, type FormEvent } from 'react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Segmented } from '@/components/echo/segmented'
import { Stack } from '@/components/echo/layout'
import { errorMessage, loginWithCredentials, registerUserAccount } from '@/lib/api'

type Mode = 'register' | 'login'

/**
 * The shopper's access inside a storefront: e-mail and password created at the first purchase
 * and used again to find orders. It never sends anyone to the Syndetis site.
 */
export function BuyerAccess({ title, intro, modes = ['register', 'login'], onDone }: {
  title: string
  intro?: string
  modes?: Mode[]
  onDone?: () => void
}) {
  const [mode, setMode] = useState<Mode>(modes[0])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const register = mode === 'register'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (submitting.current) return
    const next: typeof errors = {}
    if (register && name.trim().length < 2) next.name = 'Informe seu nome.'
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) next.email = 'Informe um e-mail válido.'
    if (register && (password.length < 8 || new TextEncoder().encode(password).length > 72)) {
      next.password = 'Use de 8 a 72 caracteres.'
    } else if (!register && !password) next.password = 'Informe sua senha.'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return
    submitting.current = true
    setBusy(true)
    try {
      if (register) await registerUserAccount(name, email, password, undefined, 'buyer')
      else await loginWithCredentials(email, password)
      onDone?.()
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return <form className="buyer-access" onSubmit={submit} noValidate>
    <Stack gap={6}>
      <h3>{title}</h3>
      {intro && <p>{intro}</p>}
      {modes.length > 1 && <Segmented aria-label="Como você quer continuar" value={modes.indexOf(mode)}
        options={modes.map(item => item === 'register' ? 'Primeira compra' : 'Já comprei aqui')}
        onValueChange={index => { setMode(modes[index]); setErrors({}); setFormError('') }} />}
      {register && <Field label="Seu nome" autoComplete="name" value={name} onValueChange={setName}
        error={errors.name} disabled={busy} />}
      <Field label="E-mail" type="email" autoComplete="email" value={email} onValueChange={setEmail}
        error={errors.email} disabled={busy} />
      <Field label={register ? 'Crie uma senha' : 'Senha'} type="password"
        autoComplete={register ? 'new-password' : 'current-password'}
        description={register ? 'Com este e-mail e senha você acompanha seus pedidos depois.' : undefined}
        value={password} onValueChange={setPassword} error={errors.password} disabled={busy} />
      {formError && <p className="notice error" role="alert">{formError}</p>}
      <HardwareButton type="submit" variant="primary" loading={busy}>
        {register ? 'Continuar para o pagamento' : 'Entrar'}
      </HardwareButton>
    </Stack>
  </form>
}
