import { Progress } from '@/components/echo/progress'
import { useId, useState, type ReactNode, type RefObject } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Stack } from '@/components/echo/layout'
import { Accordion } from '@/components/echo/accordion'
import { NumberField } from '@/components/echo/number-field'
import { Sheet } from '@/components/echo/sheet'
import { formatBRL, type StoreComponent, type StoreProduct } from '@/lib/maker'
import {
  previewStockLeft,
  previewSubtotal,
  type PreviewCartLine,
} from '@/lib/preview-cart'

export function PremiumProductDetails({
  product,
  section,
  demo,
  publicCommerce = false,
  available,
  onAdd,
  image,
}: {
  product?: StoreProduct
  section: StoreComponent
  demo: boolean
  publicCommerce?: boolean
  available: number
  onAdd: (product: StoreProduct, choices: Record<string, string>) => void
  image: (src?: string, alt?: string) => ReactNode
}) {
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (product?.options || []).map((group) => [group.label, group.values[0]]),
    ),
  )
  const [selectedImage, setSelectedImage] = useState(0)
  const pictures = [product?.image, ...(product?.gallery || [])].filter(
    (src): src is string => !!src,
  )
  const id = useId()
  if (!product)
    return (
      <div className="shop-product-detail">
        <div className="shop-empty">
          <h4>{section.title}</h4>
          <p>
            Adicione um produto ao catálogo e selecione-o nesta seção para
            apresentar seus detalhes.
          </p>
        </div>
      </div>
    )
  return (
    <div className="shop-product-detail">
      <div className="shop-detail-gallery">
        <div className="shop-detail-main">
          {image(
            pictures[selectedImage],
            product.image ? product.name : 'Imagem do produto em destaque',
          )}
        </div>
        <div className="shop-detail-thumbnails">
          {pictures.length > 1
            ? pictures.map((src, index) => (
                <div key={index} className="shop-detail-thumbnail">
                  {image(src, product.name + ' · imagem ' + (index + 1))}
                  {demo && (
                    <HardwareButton
                      size="sm"
                      aria-pressed={index === selectedImage}
                      icon={<ImageIcon size={14} />}
                      onClick={() => setSelectedImage(index)}
                    >
                      {'Imagem ' + (index + 1)}
                    </HardwareButton>
                  )}
                </div>
              ))
            : [0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="shop-detail-thumbnail"
                  aria-hidden="true"
                >
                  {image(product.image, 'Detalhe do produto')}
                </div>
              ))}
        </div>
      </div>
      <div className="shop-detail-info">
        <p className="shop-detail-eyebrow">{section.title}</p>
        <h4>{product.name}</h4>
        <p className="shop-detail-price">
          {product.compareAtPrice && product.compareAtPrice > product.price ? (
            <del>{formatBRL(product.compareAtPrice)}</del>
          ) : null}
          {formatBRL(product.price)}
        </p>
        <p className="shop-description">
          Condições de pagamento definidas pela loja.
        </p>
        {(product.options || []).map((group, index) => (
          <fieldset key={index} className="shop-variation">
            <legend>{group.label}</legend>
            <Stack direction="row" gap={4}>
              {group.values.map((value) =>
                demo ? (
                  <HardwareButton
                    key={value}
                    size="sm"
                    aria-pressed={choices[group.label] === value}
                    onClick={() =>
                      setChoices((previous) => ({
                        ...previous,
                        [group.label]: value,
                      }))
                    }
                  >
                    {value}
                  </HardwareButton>
                ) : (
                  <span key={value} className="shop-variation-label">
                    {value}
                  </span>
                ),
              )}
            </Stack>
          </fieldset>
        ))}
        {demo || publicCommerce ? (
          <HardwareButton
            fullWidth
            disabled={available < 1}
            onClick={() => onAdd(product, choices)}
          >
            {available < 1
              ? 'Limite do estoque demonstrativo'
              : section.ctaText || 'Adicionar à sacola'}
          </HardwareButton>
        ) : (
          <span className="shop-action shop-product-action">
            {product.stock > 0
              ? section.ctaText || 'Adicionar à sacola'
              : 'Produto indisponível'}
          </span>
        )}
        {demo && <PreviewShipping id={id} />}
        <Accordion defaultValue={['details']}>
          <Accordion.Item value="details">
            <Accordion.Trigger>Detalhes do produto</Accordion.Trigger>
            <Accordion.Panel>
              {product.description ||
                section.subtitle ||
                'Adicione as características e medidas do produto.'}
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="returns">
            <Accordion.Trigger>Trocas e devoluções</Accordion.Trigger>
            <Accordion.Panel>
              {product.returnPolicy ||
                'As condições de troca e devolução devem ser informadas pela loja.'}
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  )
}

function PreviewShipping({ id }: { id: string }) {
  const [cep, setCep] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState('')
  return (
    <form
      className="shop-preview-shipping"
      onSubmit={(event) => {
        event.preventDefault()
        if (cep.replace(/\D/g, '').length !== 8) {
          setError('Informe os 8 números do CEP.')
          setResult('')
          return
        }
        setError('')
        setResult(
          'Simulação: entrega em 3 a 5 dias úteis por R$ 24,90. Valores de exemplo, sem consulta ao serviço de frete.',
        )
      }}
    >
      <Field
        id={id}
        label="CEP para simular o frete"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={9}
        placeholder="00000-000"
        value={cep}
        error={error}
        onValueChange={(value) => {
          const digits = value.replace(/\D/g, '').slice(0, 8)
          setCep(
            digits.length > 5
              ? digits.slice(0, 5) + '-' + digits.slice(5)
              : digits,
          )
          setError('')
          setResult('')
        }}
      />
      <HardwareButton type="submit" size="sm">
        Simular frete
      </HardwareButton>
      <output aria-live="polite">{result}</output>
    </form>
  )
}

export function PreviewCartContent({
  returnFocus,
  lines,
  threshold,
  onQuantity,
}: {
  returnFocus: RefObject<HTMLElement | null>
  lines: PreviewCartLine[]
  threshold: number
  onQuantity: (key: string, quantity: number) => void
}) {
  const total = previewSubtotal(lines)
  return (
    <Sheet.Content
      finalFocus={returnFocus}
      title="Sacola de demonstração"
      description="Teste visual do modelo. Nenhum pedido ou cobrança é criado."
    >
      <Stack gap={10}>
        {threshold > 0 && (
          <div className="shop-cart-shipping">
            <p>
              {total >= threshold
                ? 'Exemplo: faixa de frete grátis atingida.'
                : 'Exemplo: faltam ' +
                  formatBRL(threshold - total) +
                  ' para frete grátis.'}
            </p>
            <Progress
              value={Math.min(total / threshold, 1)}
              aria-label="Progresso demonstrativo para frete grátis"
            />
          </div>
        )}
        {lines.length ? (
          <ul className="shop-preview-cart">
            {lines.map((line) => (
              <li key={line.key}>
                <strong>{line.product.name}</strong>
                {Object.keys(line.choices).length > 0 && (
                  <p>
                    {Object.entries(line.choices)
                      .map(([name, value]) => name + ': ' + value)
                      .join(', ')}
                  </p>
                )}
                <p>{formatBRL(line.product.price)} por unidade</p>
                <NumberField
                  label={
                    'Quantidade de ' +
                    line.product.name +
                    ' · ' +
                    Object.values(line.choices).join(', ')
                  }
                  value={line.quantity}
                  min={1}
                  max={previewStockLeft(lines, line.product, line.key)}
                  step={1}
                  smallStep={1}
                  incrementLabel={'Aumentar quantidade de ' + line.product.name}
                  decrementLabel={'Diminuir quantidade de ' + line.product.name}
                  onValueChange={(quantity) => {
                    if (quantity !== null) onQuantity(line.key, quantity)
                  }}
                />
                <HardwareButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onQuantity(line.key, 0)}
                >
                  {'Remover ' + line.product.name}
                </HardwareButton>
              </li>
            ))}
          </ul>
        ) : (
          <p>Sua sacola está vazia. Escolha um produto para experimentar.</p>
        )}
        <p className="shop-preview-subtotal">
          <strong>Subtotal de exemplo</strong>
          <strong>{formatBRL(total)}</strong>
        </p>
        <HardwareButton fullWidth disabled>
          Finalizar compra · somente prévia
        </HardwareButton>
        <Sheet.Close>Voltar ao modelo</Sheet.Close>
      </Stack>
    </Sheet.Content>
  )
}
