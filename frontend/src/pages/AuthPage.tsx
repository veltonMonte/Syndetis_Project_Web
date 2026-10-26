import { useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Feedback } from '../components/Feedback'
import { json, request } from '../lib/api'
import { useAction } from '../lib/hooks'
import { saveSession } from '../lib/session'
import type { Tokens } from '../lib/types'

export function AuthPage({ register = false }: { register?: boolean }) {
  const action = useAction()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/'
  const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/'
  return <section className="panel narrow"><p className="eyebrow">Sua conta Syndetis</p><h1>{register ? 'Crie sua conta' : 'Bom ter você de volta'}</h1>
    <form onSubmit={(event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      void action.run(async () => {
        const credentials = { email: String(form.get('email')), password: String(form.get('password')) }
        if (register) await request('/api/auth/register', { method: 'POST', body: json({ ...credentials, firstName: form.get('firstName') }) })
        saveSession(await request<Tokens>('/api/auth/login', { method: 'POST', body: json(credentials) }))
        navigate(destination, { replace: true })
      })
    }}>
      {register && <label>Nome<input name="firstName" required maxLength={100} autoComplete="given-name" /></label>}
      <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
      <label>Senha<input name="password" type="password" required minLength={register ? 8 : 1} maxLength={72} autoComplete={register ? 'new-password' : 'current-password'} /></label>
      <Feedback error={action.error} /><button disabled={action.busy}>{action.busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button>
    </form><p className="muted">{register ? 'Já tem uma conta? ' : 'Primeira vez por aqui? '}<Link to={`${register ? '/entrar' : '/cadastro'}?next=${encodeURIComponent(destination)}`}>{register ? 'Entrar' : 'Criar conta'}</Link></p>
  </section>
}
export function OAuthCallback() {
  const action = useAction()
  const started = useRef(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    window.history.replaceState(null, '', '/auth/callback')
    void action.run(async () => {
      if (!code) throw new Error('Não foi possível concluir o login social. Entre novamente.')
      saveSession(await request<Tokens>('/api/auth/oauth2/exchange', { method: 'POST', body: json({ code }) }))
      navigate('/', { replace: true })
    })
  }, [action, navigate, params])
  return <section className="panel narrow"><h1>Conectando sua conta</h1><Feedback error={action.error} loading={action.busy} /><Link to="/entrar">Voltar ao login</Link></section>
}
