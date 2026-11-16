import { Moon, Sun } from 'lucide-react'
import { Card } from '@/components/echo/card'
import { Segmented } from '@/components/echo/segmented'
import { Stack } from '@/components/echo/layout'
import { useToast } from '@/components/echo/toast'
import { useAppearance } from '@/lib/appearance-context'

export function AppearanceSettings() {
  const { theme, setTheme } = useAppearance()
  const toast = useToast()
  return (
    <Card
      headingLevel={2}
      variant="screen"
      title="Aparência"
      description="Escolha o tema do painel e do Maker."
    >
      <Stack gap={8} align="start">
        <Segmented
          aria-label="Tema da plataforma"
          value={theme === 'light' ? 0 : 1}
          onValueChange={(index) => {
            const next = index === 0 ? 'light' : 'dark'
            const stored = setTheme(next)
            toast({
              title: next === 'light' ? 'Tema claro ativado' : 'Tema escuro ativado',
              body: stored
                ? 'Sua preferência foi salva para esta conta neste navegador.'
                : 'A mudança vale nesta sessão. O navegador não permitiu salvar a preferência.',
            })
          }}
          options={[
            {
              label: 'Claro',
              content: (
                <span className="appearance-option">
                  <Sun size={16} aria-hidden="true" />
                  Claro
                </span>
              ),
            },
            {
              label: 'Escuro',
              content: (
                <span className="appearance-option">
                  <Moon size={16} aria-hidden="true" />
                  Escuro
                </span>
              ),
            },
          ]}
        />
        <p className="appearance-description">
          O tema claro é o padrão para novas contas. Você pode mudar quando quiser.
        </p>
      </Stack>
    </Card>
  )
}
