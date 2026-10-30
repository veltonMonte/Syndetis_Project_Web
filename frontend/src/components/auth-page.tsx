import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Check, Command, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles, Store, User } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Panel } from '@/components/echo/panel'
import { Stack } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import {
  errorMessage,
  exchangeOAuthCallbackCode,
  loginWithCredentials,
  registerUserAccount,
  startOAuthRedirect,
  type AuthSession,
} from '@/lib/api'

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12c0 4.64 3.01 8.57 7.18 9.96.53.1.72-.23.72-.5v-1.78c-2.92.64-3.54-1.41-3.54-1.41-.48-1.2-1.17-1.52-1.17-1.52-.95-.65.07-.64.07-.64 1.06.07 1.61 1.08 1.61 1.08.94 1.6 2.46 1.14 3.06.87.09-.68.37-1.14.67-1.4-2.33-.27-4.78-1.16-4.78-5.18 0-1.14.41-2.08 1.08-2.81-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.89 1.07a10.03 10.03 0 0 1 5.26 0c2.01-1.35 2.89-1.07 2.89-1.07.57 1.45.21 2.52.1 2.79.67.73 1.08 1.67 1.08 2.81 0 4.03-2.46 4.91-4.8 5.17.38.33.72.97.72 1.96v2.91c0 .28.19.61.73.5A10.51 10.51 0 0 0 22.5 12c0-5.8-4.7-10.5-10.5-10.5Z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21.8 12.23c0-.72-.06-1.41-.19-2.08H12v3.94h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.5Z"
        fill="currentColor"
        opacity="0.95"
      />
      <path
        d="M12 22.2c2.76 0 5.07-.91 6.76-2.47l-3.3-2.56c-.91.62-2.08.99-3.46.99-2.66 0-4.92-1.8-5.73-4.22H2.86v2.64A10.2 10.2 0 0 0 12 22.2Z"
        fill="currentColor"
        opacity="0.82"
      />
      <path
        d="M6.27 13.94a6.12 6.12 0 0 1 0-3.88V7.42H2.86a10.2 10.2 0 0 0 0 9.16l3.41-2.64Z"
        fill="currentColor"
        opacity="0.68"
      />
      <path
        d="M12 5.84c1.5 0 2.85.52 3.91 1.53l2.93-2.93C17.06 2.79 14.76 1.8 12 1.8 8.01 1.8 4.55 4.08 2.86 7.42l3.41 2.64c.81-2.42 3.07-4.22 5.73-4.22Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  )
}

interface AuthPageProps {
  mode: 'login' | 'register' | 'callback'
  onAuthenticated: (session: AuthSession, redirectTo: string) => void
}

export function AuthPage({ mode, onAuthenticated }: AuthPageProps) {
  const toast = useToast()
  const callbackStarted = useRef(false)
  const [firstName, setFirstName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null)
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState<{ firstName?: string; email?: string; password?: string }>({})

  useEffect(() => {
    if (mode !== 'callback' || callbackStarted.current) return
    callbackStarted.current = true
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '')
    const code = params.get('code') || ''
    // Strip the single-use code from the URL immediately per OAUTH2.md
    window.history.replaceState(null, '', '#/auth/callback')

    exchangeOAuthCallbackCode(code)
      .then(session => {
        toast({
          title: 'Autenticação concluída',
          body: `Bem-vindo de volta, ${session.user.firstName}.`,
        })
        onAuthenticated(session, '/criar')
      })
      .catch(err => {
        const msg = errorMessage(err)
        setFormError(msg)
        toast({
          title: 'Falha no login social',
          body: msg,
        })
      })
  }, [mode, onAuthenticated, toast])

  function handleOAuth(provider: 'github' | 'google') {
    setOauthLoading(provider)
    startOAuthRedirect(provider)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError('')
    const nextErrors: { firstName?: string; email?: string; password?: string } = {}
    if (mode === 'register' && firstName.trim().length < 2) {
      nextErrors.firstName = 'Informe seu nome ou nome do responsável (mínimo 2 caracteres).'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Informe um endereço de e-mail válido.'
    }
    if (mode === 'register' && password.length < 8) {
      nextErrors.password = 'A senha deve ter entre 8 e 72 caracteres.'
    } else if (mode === 'login' && password.length < 1) {
      nextErrors.password = 'Informe sua senha.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    setLoading(true)
    try {
      if (mode === 'register') {
        const session = await registerUserAccount(firstName, email, password, storeName)
        toast({
          title: 'Conta criada com sucesso',
          body: `Bem-vindo à Syndetis, ${session.user.firstName}! Vamos estruturar sua loja.`,
        })
        onAuthenticated(session, '/criar')
      } else {
        const session = await loginWithCredentials(email, password)
        toast({
          title: 'Sessão iniciada',
          body: `Bem-vindo de volta, ${session.user.firstName}.`,
        })
        onAuthenticated(session, '/criar')
      }
    } catch (err) {
      const msg = errorMessage(err)
      setFormError(msg)
      toast({
        title: mode === 'register' ? 'Não foi possível criar a conta' : 'Falha na autenticação',
        body: msg,
      })
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'callback') {
    return (
      <section className="shell auth-section">
        <Panel variant="screen" className="auth-callback-panel">
          <Sparkles size={28} />
          <h1>{formError ? 'Não foi possível concluir o login' : 'Validando sua identidade OAuth…'}</h1>
          <p>
            {formError ||
              'Trocando código de autorização único com o serviço de autenticação Syndetis.'}
          </p>
          {formError && (
            <HardwareButton href="#/entrar" variant="primary">
              Voltar ao login
            </HardwareButton>
          )}
        </Panel>
      </section>
    )
  }

  const isRegister = mode === 'register'

  return (
    <section className="shell auth-section">
      <div className="auth-grid">
        <div className="auth-pitch">
          <span className="eyebrow">Ecossistema Syndetis · Acesso do Criador</span>
          <h1>
            {isRegister ? (
              <>
                Crie sua conta.<br />
                <em>Construa sua loja.</em>
              </>
            ) : (
              <>
                Sua vitrine,<br />
                <em>sempre em movimento.</em>
              </>
            )}
          </h1>
          <p>
            {isRegister
              ? 'Do primeiro componente visual no Maker ao controle completo de vendas, chat com clientes e faturamento em um único lugar.'
              : 'Acesse a Sessão Maker para editar sua loja ao vivo ou acompanhe pedidos, mensagens de clientes e repasses no seu Dashboard.'}
          </p>

          <div className="auth-highlights">
            <div>
              <Sparkles size={16} />
              <div>
                <strong>Maker Visual Drag & Drop</strong>
                <span>Adicione, exclua e reordene componentes, categorias e produtos em tempo real.</span>
              </div>
            </div>
            <div>
              <Store size={16} />
              <div>
                <strong>Dashboard de Vendas + Chat ao Vivo</strong>
                <span>Converse diretamente com seus clientes junto aos pedidos e acompanhe o faturamento.</span>
              </div>
            </div>
            <div>
              <ShieldCheck size={16} />
              <div>
                <strong>Autenticação OAuth2 & JWT RS256</strong>
                <span>Login social seguro com GitHub e Google ou credenciais criptografadas.</span>
              </div>
            </div>
          </div>

          <div className="auth-flow-steps">
            <span>
              <Check size={12} /> 01 · Conta & OAuth
            </span>
            <span>
              <Check size={12} /> 02 · Maker Completo
            </span>
            <span>
              <Check size={12} /> 03 · Dashboard & Chat
            </span>
          </div>
        </div>

        <Panel variant="raised" className="auth-card">
          <div className="auth-card-header">
            <div className="auth-brand-pill">
              <Command size={15} />
              <span>syndetis.id</span>
            </div>
            <div className="auth-mode-switch" role="tablist" aria-label="Alternar entre entrar e criar conta">
              <HardwareButton
                size="sm"
                variant={!isRegister ? 'primary' : 'ghost'}
                href="#/entrar"
              >
                Entrar
              </HardwareButton>
              <HardwareButton
                size="sm"
                variant={isRegister ? 'primary' : 'ghost'}
                href="#/cadastro"
              >
                Criar conta
              </HardwareButton>
            </div>
          </div>

          <div className="auth-card-title">
            <h2>{isRegister ? 'Começar na Syndetis' : 'Entrar na sua conta'}</h2>
            <p>
              {isRegister
                ? 'Use sua conta GitHub ou Google para acesso instantâneo ou preencha seus dados.'
                : 'Conecte-se com um clique via OAuth ou utilize seu e-mail e senha.'}
            </p>
          </div>

          <div className="oauth-buttons-grid">
            <HardwareButton
              size="md"
              fullWidth
              icon={<GithubIcon />}
              loading={oauthLoading === 'github'}
              onClick={() => handleOAuth('github')}
            >
              Continuar com GitHub
            </HardwareButton>
            <HardwareButton
              size="md"
              fullWidth
              icon={<GoogleIcon />}
              loading={oauthLoading === 'google'}
              onClick={() => handleOAuth('google')}
            >
              Continuar com Google
            </HardwareButton>
          </div>

          <div className="auth-divider">
            <span>ou continue com seu e-mail</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <Stack gap={8}>
              {isRegister && (
                <>
                  <Field
                    label="Seu nome"
                    placeholder="Ex.: Marina Vasconcelos"
                    autoComplete="given-name"
                    start={<User size={15} />}
                    value={firstName}
                    onValueChange={v => {
                      setFirstName(v)
                      if (errors.firstName) setErrors({ ...errors, firstName: undefined })
                    }}
                    error={errors.firstName}
                  />
                  <Field
                    label="Nome da sua loja (opcional)"
                    placeholder="Ex.: Atelier Monolith"
                    start={<Store size={15} />}
                    value={storeName}
                    onValueChange={setStoreName}
                  />
                </>
              )}

              <Field
                label="E-mail profissional"
                type="email"
                placeholder="voce@sua-marca.com.br"
                autoComplete="email"
                start={<Mail size={15} />}
                value={email}
                onValueChange={v => {
                  setEmail(v)
                  if (errors.email) setErrors({ ...errors, email: undefined })
                }}
                error={errors.email}
              />

              <Field
                label="Senha de acesso"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo de 8 caracteres"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                start={<Lock size={15} />}
                end={
                  <HardwareButton
                    size="sm"
                    variant="ghost"
                    iconOnly
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    icon={showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    onClick={() => setShowPassword(s => !s)}
                  />
                }
                value={password}
                onValueChange={v => {
                  setPassword(v)
                  if (errors.password) setErrors({ ...errors, password: undefined })
                }}
                error={errors.password || (formError ? formError : undefined)}
              />

              <div className="auth-submit-row">
                <HardwareButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  trailingIcon={<ArrowRight size={16} />}
                  onClick={() => {
                    const form = document.querySelector('.auth-form') as HTMLFormElement | null
                    form?.requestSubmit()
                  }}
                >
                  {isRegister ? 'Criar conta e abrir o Maker' : 'Entrar e continuar para o Maker'}
                </HardwareButton>
              </div>
            </Stack>
          </form>

          <div className="auth-card-footer">
            {isRegister ? (
              <span>
                Já possui uma conta na Syndetis? <a href="#/entrar">Fazer login</a>
              </span>
            ) : (
              <span>
                Ainda não tem conta? <a href="#/cadastro">Criar conta grátis</a>
              </span>
            )}
          </div>
        </Panel>
      </div>
    </section>
  )
}
