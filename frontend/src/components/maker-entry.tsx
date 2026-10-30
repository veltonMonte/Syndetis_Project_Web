import { useRef, useState } from 'react'
import {
  ArrowLeft,
  Bot,
  FilePlus2,
  LayoutTemplate,
  LockKeyhole,
  PenLine,
  RefreshCw,
} from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Card } from '@/components/echo/card'
import { Field } from '@/components/echo/field'
import { Textarea } from '@/components/echo/textarea'
import { Grid, Stack } from '@/components/echo/layout'
import { Skeleton } from '@/components/echo/skeleton'
import { MakerStudio } from '@/components/maker-studio'
import { useResource } from '@/lib/hooks'
import type { AuthSession } from '@/lib/api'
import type { Store } from '@/lib/types'
import { templates, type LayoutConfig, type Template } from '@/lib/maker'
import {
  BASIC_MAKER_CAPABILITIES,
  canResumeMakerProject,
  createMakerDraft,
  initialStoreName,
  readMakerProject,
  writeMakerProject,
  type MakerCapabilities,
  type MakerEntitlements,
  type MakerProject,
} from '@/lib/maker-project'
import './maker-entry.css'

export function MakerEntry({
  session,
  templateIntent,
}: {
  session: AuthSession
  templateIntent?: Template | null
}) {
  const [saved] = useState(() => readMakerProject(session.user.id))
  const [storeId, setStoreId] = useState(saved?.storeId)
  const canManage = session.user.role !== 'CUSTOMER'
  const stores = useResource<Store[]>(canManage ? '/stores/me' : null, session.user.id)
  const store =
    stores.data?.find((item) => item.id === storeId) || (!storeId ? stores.data?.[0] : undefined)
  const entitlements = useResource<MakerEntitlements>(
    store ? `/stores/${encodeURIComponent(store.id)}/entitlements` : null,
    session.user.id,
  )
  if (stores.loading || entitlements.loading)
    return (
      <section className="shell maker-entry">
        <Skeleton lines={4} label="Preparando seu Maker" />
      </section>
    )
  const error =
    stores.error ||
    entitlements.error ||
    (storeId && canManage && !store
      ? 'Este rascunho pertence a uma loja que não está disponível nesta conta.'
      : '')
  if (error)
    return (
      <section className="shell maker-entry">
        <Stack gap={9}>
          <h1>Não foi possível abrir o Maker</h1>
          <p role="alert">{error}</p>
          <div>
            <HardwareButton
              icon={<RefreshCw size={16} />}
              onClick={() => {
                stores.reload()
                entitlements.reload()
              }}
            >
              Tentar novamente
            </HardwareButton>
          </div>
        </Stack>
      </section>
    )
  const data = entitlements.data
  const capabilities: MakerCapabilities = data
    ? {
        planId: data.planId,
        layoutAdaptationRequired: data.layoutAdaptationRequired,
        enforced: data.enforced,
        structuralEditing: data.capabilities.structuralEditing,
        ai: data.capabilities.ai,
        productLimit: data.products.limit,
        aiRemaining: data.ai.remaining,
      }
    : BASIC_MAKER_CAPABILITIES
  return (
    <MakerDocument
      session={session}
      templateIntent={templateIntent}
      store={store}
      capabilities={capabilities}
      onStoreSaved={(id) => {
        setStoreId(id)
        if (!store) stores.reload()
      }}
    />
  )
}

function MakerDocument({
  session,
  templateIntent,
  store,
  capabilities,
  onStoreSaved,
}: {
  session: AuthSession
  templateIntent?: Template | null
  store?: Store
  capabilities: MakerCapabilities
  onStoreSaved: (id: string) => void
}) {
  const [project, setProject] = useState<MakerProject | null>(() =>
    readMakerProject(session.user.id),
  )
  const projectRef = useRef(project)
  const mayResume = canResumeMakerProject(project, capabilities)
  const [screen, setScreen] = useState<'home' | 'templates' | 'ai' | 'editor'>(() =>
    templateIntent ? 'templates' : mayResume ? 'editor' : 'home',
  )
  const [name, setName] = useState(() => initialStoreName(session.user.id, store?.name))
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState('')

  function persist(next: MakerProject) {
    projectRef.current = next
    setProject(next)
    const stored = writeMakerProject(session.user.id, next)
    setError(
      stored
        ? ''
        : 'Seu navegador não conseguiu salvar o rascunho. Mantenha esta aba aberta e exporte uma cópia antes de sair.',
    )
    return stored
  }
  function start(template: Template) {
    if (template === 'blank' && !capabilities.structuralEditing) return
    if (name.trim().length < 2) {
      setError('Informe um nome para a sua loja (mínimo 2 caracteres).')
      return
    }
    // Preserve a previous project when the plan requires a different starting point.
    if (project) {
      try {
        localStorage.setItem(
          `syndetis-maker-previous:${encodeURIComponent(session.user.id)}`,
          JSON.stringify(project),
        )
      } catch {
        setError(
          'Não foi possível preservar seu rascunho anterior. Exporte uma cópia antes de mudar de projeto.',
        )
        return
      }
    }
    const config = createMakerDraft(name, template)
    if (project) {
      config.products = project.config.products || []
      config.categories = project.config.categories || []
      config.accent = project.config.accent
      config.description = project.config.description
      config.settings = {
        ...config.settings!,
        ...project.config.settings,
        published: false,
        publishedAt: undefined,
      }
    }
    if (template === 'blank' && prompt.trim()) config.description = prompt.trim()
    persist({
      version: 1,
      mode: template === 'blank' ? 'blank' : 'template',
      config,
      storeId: project?.storeId || store?.id,
    })
    setScreen('editor')
  }
  const paidMaker = capabilities.structuralEditing
  const aiAllowed = capabilities.ai && capabilities.aiRemaining > 0
  if (screen === 'editor' && project && mayResume)
    return (
      <>
        {error && (
          <p className="shell maker-persistence-error" role="alert">
            {error}
          </p>
        )}
        <MakerStudio
          key={`${session.user.id}-${project.mode}-${project.config.template}`}
          config={project.config}
          setConfig={(config: LayoutConfig) => persist({ ...project, config })}
          capabilities={capabilities}
          userId={session.user.id}
          storeId={project.storeId || store?.id}
          onStoreSaved={(id) => {
            const current = projectRef.current
            if (current && persist({ ...current, storeId: id })) onStoreSaved(id)
          }}
        />
      </>
    )

  return (
    <section className="shell maker-entry">
      <Stack gap={11}>
        <header className="maker-entry-heading">
          <span className="eyebrow">Sessão Maker</span>
          <h1>
            {screen === 'home'
              ? 'Como você quer criar sua loja?'
              : screen === 'templates'
                ? 'Escolha o seu ponto de partida.'
                : 'Conte a ideia da sua loja.'}
          </h1>
          <p>
            {screen === 'home'
              ? 'Comece com uma ideia, uma página em branco ou um modelo. Depois, confira o resultado em Visualizar.'
              : screen === 'templates'
                ? 'Nenhum modelo é aplicado antes da sua escolha. Seu catálogo começa vazio.'
                : 'Descreva sua marca, os produtos e o estilo que você imagina para a vitrine.'}
          </p>
        </header>
        <div className="maker-entry-context">
          <span className="maker-plan-label">
            {paidMaker ? 'Maker' : 'Básico'}
            {!capabilities.enforced ? ' · ambiente de testes' : ''}
          </span>
          {store && <span>Loja: {store.name}</span>}
          <span>Até {capabilities.productLimit} produtos</span>
        </div>
        {session.user.role === 'CUSTOMER' && (
          <p className="maker-entry-notice">
            Você pode preparar um rascunho neste navegador. A gestão de loja ainda precisa ser
            habilitada na sua conta para salvar no servidor e publicar.
          </p>
        )}
        {!paidMaker && (
          <p className="maker-entry-notice">
            Seu plano permite criar com templates e personalizar a identidade da loja. Criar do zero
            e usar IA são recursos do Maker.
          </p>
        )}
        {project && !mayResume && (
          <p className="maker-entry-notice">
            Seu rascunho personalizado está preservado. Para continuar no Básico, escolha um
            template permitido.
          </p>
        )}
        {error && <p role="alert">{error}</p>}
        {screen === 'home' ? (
          <>
            <Grid minItemWidth="18rem" gap={9}>
              <Card
                headingLevel={2}
                title="Criar com IA"
                description="Descreva sua ideia e prepare a criação da loja."
                variant="screen"
                onClick={aiAllowed ? () => setScreen('ai') : undefined}
                footer={
                  aiAllowed ? (
                    <span className="maker-option-note">
                      {capabilities.aiRemaining} solicitações disponíveis hoje
                    </span>
                  ) : (
                    <HardwareButton disabled icon={<LockKeyhole size={15} />}>
                      {capabilities.ai ? 'Franquia diária esgotada' : 'Disponível no Maker'}
                    </HardwareButton>
                  )
                }
              >
                <div className="maker-option-art" aria-hidden="true">
                  <Bot size={34} />
                  <div className="maker-art-lines">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </Card>
              <Card
                headingLevel={2}
                title="Criar sozinho"
                description="Comece do zero e monte cada seção da loja."
                variant="screen"
                onClick={paidMaker ? () => start('blank') : undefined}
                footer={
                  paidMaker ? (
                    <span className="maker-option-note">Página em branco, sem modelo aplicado</span>
                  ) : (
                    <HardwareButton disabled icon={<LockKeyhole size={15} />}>
                      Disponível no Maker
                    </HardwareButton>
                  )
                }
              >
                <div className="maker-option-art" aria-hidden="true">
                  <FilePlus2 size={34} />
                  <div className="maker-art-canvas">
                    <PenLine size={21} />
                  </div>
                </div>
              </Card>
              <Card
                headingLevel={2}
                title="Usar template"
                description="Escolha uma estrutura pronta e dê a ela a sua identidade."
                variant="screen"
                onClick={() => setScreen('templates')}
                footer={<span className="maker-option-note">Incluído no seu plano</span>}
              >
                <div className="maker-option-art" aria-hidden="true">
                  <LayoutTemplate size={34} />
                  <div className="maker-art-template">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              </Card>
            </Grid>
          </>
        ) : (
          <>
            <div>
              <HardwareButton
                variant="ghost"
                icon={<ArrowLeft size={16} />}
                onClick={() => {
                  setScreen('home')
                  setError('')
                }}
              >
                Voltar às opções
              </HardwareButton>
            </div>
            <Field label="Nome da sua loja" value={name} maxLength={60} onValueChange={setName} />
            {screen === 'templates' ? (
              <Grid minItemWidth="18rem" gap={9}>
                {templates.map((template) => (
                  <Card
                    key={template.id}
                    headingLevel={2}
                    title={template.name}
                    description={template.category}
                    variant="screen"
                    media={
                      <div
                        className={`maker-template-sample maker-template-${template.id}`}
                        aria-hidden="true"
                      >
                        <div />
                        <div />
                        <div />
                        <span>{name || 'Sua marca'}</span>
                      </div>
                    }
                    footer={
                      <HardwareButton
                        fullWidth
                        variant={templateIntent === template.id ? 'primary' : 'neutral'}
                        onClick={() => start(template.id)}
                      >
                        Usar {template.name}
                      </HardwareButton>
                    }
                  />
                ))}
              </Grid>
            ) : (
              capabilities.ai && (
                <Stack gap={9}>
                  <Textarea
                    label="Sua ideia para a loja"
                    placeholder="Ex.: Uma marca de cerâmicas feitas à mão, com tons naturais e foco nas fotos das peças."
                    value={prompt}
                    onValueChange={setPrompt}
                    rows={5}
                    maxLength={2000}
                  />
                  <p>
                    {capabilities.aiRemaining} solicitações disponíveis hoje. A geração com IA ainda
                    está em integração e não consome sua franquia nesta tela.
                  </p>
                  <Stack direction="row" gap={6}>
                    <HardwareButton disabled>Gerar com IA · em integração</HardwareButton>
                    <HardwareButton onClick={() => start('blank')}>
                      Continuar sozinho com esta ideia
                    </HardwareButton>
                  </Stack>
                </Stack>
              )
            )}
          </>
        )}
      </Stack>
    </section>
  )
}
