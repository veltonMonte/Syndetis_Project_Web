import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Store,
  User,
} from 'lucide-react'
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
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [recoveringPassword, setRecoveringPassword] = useState(false)
  const [recoverySent, setRecoverySent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'github' | 'google' | null>(null)
  const [formError, setFormError] = useState('')
  const [errors, setErrors] = useState<{ firstName?: string; email?: string; password?: string }>({})

  useEffect(() => {
    setRecoveringPassword(false)
    setRecoverySent(false)
    setFormError('')
    setErrors({})
  }, [mode])

  useEffect(() => {
    if (mode !== 'callback' || callbackStarted.current) return
    callbackStarted.current = true
    const params = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '')
    const code = params.get('code') || ''
    window.history.replaceState(null, '', '#/auth/callback')

    exchangeOAuthCallbackCode(code)
      .then(session => {
        toast({
          title: 'Autenticação concluída',
          body: `Sessão iniciada como ${session.user.email}.`,
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

  function validateFirstName(val: string): string | undefined {
    if (mode !== 'register') return undefined
    if (val.trim().length < 2) {
      return 'Informe seu nome completo ou nome do responsável (mínimo 2 caracteres).'
    }
    return undefined
  }

  function validateEmail(val: string): string | undefined {
    if (!val.trim()) {
      return 'Informe seu endereço de e-mail comercial.'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      return 'Formato de e-mail inválido. Exemplo: nome@empresa.com.br'
    }
    return undefined
  }

  function validatePassword(val: string): string | undefined {
    if (recoveringPassword) return undefined
    if (mode === 'register' && val.length < 8) {
      return 'A senha deve ter no mínimo 8 caracteres (letras e números).'
    }
    if (mode === 'login' && val.length < 1) {
      return 'Informe sua senha de acesso.'
    }
    return undefined
  }

  function handleOAuth(provider: 'github' | 'google') {
    setOauthLoading(provider)
    startOAuthRedirect(provider)
  }

  function handleRecoverySubmit(e: FormEvent) {
    e.preventDefault()
    const emailErr = validateEmail(email)
    if (emailErr) {
      setErrors({ email: emailErr })
      return
    }
    setErrors({})
    setRecoverySent(true)
    toast({
      title: 'Instruções enviadas por e-mail',
      body: `Se houver uma conta associada a ${email.trim()}, você receberá o link de redefinição em instantes.`,
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (recoveringPassword) {
      handleRecoverySubmit(e)
      return
    }
    setFormError('')
    const nextErrors: { firstName?: string; email?: string; password?: string } = {}
    const nameErr = validateFirstName(firstName)
    const emailErr = validateEmail(email)
    const passErr = validatePassword(password)
    if (nameErr) nextErrors.firstName = nameErr
    if (emailErr) nextErrors.email = emailErr
    if (passErr) nextErrors.password = passErr

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
          body: `Bem-vindo à Syndetis, ${session.user.firstName}.`,
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
          <ShieldCheck size={24} />
          <h1>{formError ? 'Não foi possível concluir a autenticação' : 'Validando credencial OAuth 2.0…'}</h1>
          <p>
            {formError ||
              'Trocando código de autorização de uso único com o serviço de identidade Syndetis.'}
          </p>
          {formError && (
            <HardwareButton href="#/entrar" variant="primary">
              Voltar para a tela de login
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
          <span className="eyebrow">Acesso seguro · Syndetis SaaS</span>
          <h1>
            {isRegister
              ? 'Crie sua conta e configure sua loja em minutos'
              : 'Acesse o painel de operação da sua loja'}
          </h1>
          <p>
            {isRegister
              ? 'Estruture páginas, cadastre produtos com controle de estoque, configure recebimentos via Pix e cartão e atenda clientes no mesmo ambiente.'
              : 'Gerencie sua vitrine no Maker, acompanhe pedidos pagos, responda clientes no chat integrado e consulte seus repasses.'}
          </p>

          <div className="auth-highlights">
            <div>
              <Store size={16} />
              <div>
                <strong>Planos claros e sem taxa oculta</strong>
                <span>Standard por R$ 29/mês (até 100 produtos) ou Maker por R$ 49/mês (até 500 produtos + edição estrutural e IA).</span>
              </div>
            </div>
            <div>
              <ShieldCheck size={16} />
              <div>
                <strong>Segurança de sessão e conformidade LGPD</strong>
                <span>Tokens JWT assinados com chave assimétrica RS256, conexão HTTPS/TLS 1.3 e exportação integral dos seus dados a qualquer momento.</span>
              </div>
            </div>
            <div>
              <Lock size={16} />
              <div>
                <strong>Login social OAuth 2.0 ou credencial direta</strong>
                <span>Autentique com sua conta verificada do Google ou GitHub ou utilize e-mail comercial com validação em duas etapas opcional.</span>
              </div>
            </div>
          </div>

          <div className="auth-trust-meta">
            <span>Conexão criptografada (TLS)</span>
            <span>·</span>
            <a href="#/seguranca">Segurança e LGPD</a>
            <span>·</span>
            <a href="#/status">Status do sistema: Operacional</a>
          </div>
        </div>

        <Panel variant="raised" className="auth-card">
          <div className="auth-card-header">
            <span className="auth-brand-pill">
              <Lock size={13} />
              <span>Autenticação Syndetis</span>
            </span>
            <div className="auth-mode-tabs" role="tablist" aria-label="Alternar entre entrar e criar conta">
              <a
                href="#/entrar"
                role="tab"
                aria-selected={!isRegister}
                className={!isRegister ? 'auth-mode-tab active' : 'auth-mode-tab'}
              >
                Entrar
              </a>
              <a
                href="#/cadastro"
                role="tab"
                aria-selected={isRegister}
                className={isRegister ? 'auth-mode-tab active' : 'auth-mode-tab'}
              >
                Criar conta
              </a>
            </div>
          </div>

          {recoveringPassword ? (
            <div className="auth-recovery-box">
              <div className="auth-card-title">
                <h2>Recuperar senha de acesso</h2>
                <p>
                  Informe o e-mail cadastrado na sua conta. Enviaremos um link temporário com validade de 30 minutos para redefinir sua senha.
                </p>
              </div>

              {recoverySent ? (
                <div className="saas-status-banner saas-status-banner--success" role="status">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>E-mail de recuperação enviado</strong>
                    <p>Verifique sua caixa de entrada e a pasta de spam para o endereço {email}.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="auth-form" noValidate>
                  <Stack gap={6}>
                    <Field
                      label="E-mail cadastrado"
                      type="email"
                      placeholder="nome@suaempresa.com.br"
                      autoComplete="email"
                      start={<Mail size={15} />}
                      value={email}
                      onValueChange={v => {
                        setEmail(v)
                        if (errors.email) setErrors({ ...errors, email: undefined })
                      }}
                      onBlur={() => {
                        const err = validateEmail(email)
                        if (err) setErrors(prev => ({ ...prev, email: err }))
                      }}
                      description="Você receberá um link seguro para criar uma nova senha."
                      error={errors.email}
                    />
                    <div className="auth-submit-row">
                      <HardwareButton
                        type="submit"
                        variant="primary"
                        size="md"
                        fullWidth
                        trailingIcon={<ArrowRight size={15} />}
                      >
                        Enviar link de recuperação
                      </HardwareButton>
                    </div>
                  </Stack>
                </form>
              )}

              <div className="auth-card-footer">
                <button
                  type="button"
                  className="saas-text-button"
                  onClick={() => {
                    setRecoveringPassword(false)
                    setRecoverySent(false)
                  }}
                >
                  <ArrowLeft size={14} /> Voltar para o login
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="auth-card-title">
                <h2>{isRegister ? 'Criar nova conta comercial' : 'Entrar na sua conta'}</h2>
                <p>
                  {isRegister
                    ? 'Preencha seus dados abaixo ou utilize sua conta Google ou GitHub.'
                    : 'Utilize suas credenciais cadastradas ou acesse via provedor OAuth.'}
                </p>
              </div>

              {formError && (
                <div className="saas-status-banner saas-status-banner--danger" role="alert">
                  <AlertCircle size={16} />
                  <div>
                    <strong>Não foi possível autenticar</strong>
                    <p>{formError}</p>
                  </div>
                </div>
              )}

              <div className="oauth-buttons-grid">
                <HardwareButton
                  size="md"
                  variant="secondary"
                  fullWidth
                  icon={<GoogleIcon />}
                  loading={oauthLoading === 'google'}
                  onClick={() => handleOAuth('google')}
                >
                  Continuar com Google
                </HardwareButton>
                <HardwareButton
                  size="md"
                  variant="secondary"
                  fullWidth
                  icon={<GithubIcon />}
                  loading={oauthLoading === 'github'}
                  onClick={() => handleOAuth('github')}
                >
                  Continuar com GitHub
                </HardwareButton>
              </div>

              <div className="auth-divider">
                <span>ou preencha com seu e-mail</span>
              </div>

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <Stack gap={6}>
                  {isRegister && (
                    <>
                      <Field
                        label="Nome completo do responsável"
                        placeholder="Ex.: Marina Vasconcelos"
                        autoComplete="name"
                        start={<User size={15} />}
                        value={firstName}
                        onValueChange={v => {
                          setFirstName(v)
                          if (errors.firstName) setErrors(prev => ({ ...prev, firstName: undefined }))
                        }}
                        onBlur={() => {
                          const err = validateFirstName(firstName)
                          if (err) setErrors(prev => ({ ...prev, firstName: err }))
                        }}
                        description="Usado na identificação do titular da conta e notas fiscais."
                        error={errors.firstName}
                      />
                      <Field
                        label="Nome da loja (opcional)"
                        placeholder="Ex.: Estúdio Monolith"
                        start={<Store size={15} />}
                        value={storeName}
                        onValueChange={setStoreName}
                        description="Você poderá alterar o nome e o domínio a qualquer momento nas configurações."
                      />
                    </>
                  )}

                  <Field
                    label="E-mail comercial"
                    type="email"
                    placeholder="voce@suaempresa.com.br"
                    autoComplete="email"
                    start={<Mail size={15} />}
                    value={email}
                    onValueChange={v => {
                      setEmail(v)
                      if (errors.email) setErrors(prev => ({ ...prev, email: undefined }))
                    }}
                    onBlur={() => {
                      const err = validateEmail(email)
                      if (err) setErrors(prev => ({ ...prev, email: err }))
                    }}
                    description="Enviaremos comprovantes de publicação e alertas de pedidos para este endereço."
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
                      if (errors.password) setErrors(prev => ({ ...prev, password: undefined }))
                    }}
                    onBlur={() => {
                      const err = validatePassword(password)
                      if (err) setErrors(prev => ({ ...prev, password: err }))
                    }}
                    description={
                      isRegister
                        ? 'Use pelo menos 8 caracteres combinando letras e números.'
                        : 'Sua senha nunca é armazenada em texto puro (hash bcrypt).'
                    }
                    error={errors.password}
                  />

                  {!isRegister && (
                    <div className="auth-aux-row">
                      <button
                        type="button"
                        className="saas-text-button"
                        onClick={() => setShowTwoFactor(v => !v)}
                      >
                        {showTwoFactor ? 'Ocultar código 2FA' : 'Possui código 2FA (autenticador)?'}
                      </button>
                      <button
                        type="button"
                        className="saas-text-button"
                        onClick={() => setRecoveringPassword(true)}
                      >
                        Esqueceu a senha?
                      </button>
                    </div>
                  )}

                  {!isRegister && showTwoFactor && (
                    <Field
                      label="Código de verificação em duas etapas (2FA)"
                      placeholder="000 000"
                      autoComplete="one-time-code"
                      mono
                      value={twoFactorCode}
                      onValueChange={setTwoFactorCode}
                      description="Informe o código de 6 dígitos gerado pelo seu aplicativo autenticador."
                    />
                  )}

                  <div className="auth-submit-row">
                    <HardwareButton
                      type="submit"
                      variant="primary"
                      size="md"
                      fullWidth
                      loading={loading}
                      trailingIcon={<ArrowRight size={15} />}
                    >
                      {isRegister ? 'Criar conta e acessar painel' : 'Entrar na conta'}
                    </HardwareButton>
                  </div>
                </Stack>
              </form>

              <p className="auth-microcopy">
                {isRegister
                  ? 'Nenhum cartão de crédito é solicitado agora. Seus dados são tratados conforme a LGPD (Lei nº 13.709/2018) e você pode exportar ou excluir sua conta a qualquer momento.'
                  : 'Sessão protegida por token JWT RS256 com renovação automática.'}
              </p>

              <div className="auth-card-footer">
                {isRegister ? (
                  <span>
                    Já possui conta cadastrada? <a href="#/entrar">Fazer login</a>
                  </span>
                ) : (
                  <span>
                    Ainda não possui conta? <a href="#/cadastro">Criar conta agora</a>
                  </span>
                )}
              </div>
            </>
          )}
        </Panel>
      </div>
    </section>
  )
}
