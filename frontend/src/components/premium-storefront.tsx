import { useId, useState, type ReactNode } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { HardwareButton } from '@/components/echo/hardware-button'
import { Field } from '@/components/echo/field'
import { Stack } from '@/components/echo/layout'
import { Accordion } from '@/components/echo/accordion'
import { formatBRL, type StoreComponent, type StoreProduct } from '@/lib/maker'

export function PremiumProductDetails({
  product,
  section,
  demo,
  publicCommerce = false,
  page = false,
  available,
  onAdd,
  image,
}: {
  product?: StoreProduct
  section: StoreComponent
  demo: boolean
  publicCommerce?: boolean
  page?: boolean
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
          <p>{publicCommerce
            ? 'Produto indisponível.'
            : 'Selecione um produto do catálogo para apresentar seus detalhes.'}</p>
        </div>
      </div>
    )
  const price = (
    <p className="shop-detail-price">
      {product.compareAtPrice && product.compareAtPrice > product.price ? (
        <del>{formatBRL(product.compareAtPrice)}</del>
      ) : null}
      {formatBRL(product.price)}
    </p>
  )
  return (
    <div className="shop-product-detail">
      {page && <div className="shop-product-title"><h2>{product.name}</h2>{price}</div>}
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
                  {(demo || publicCommerce) && (
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
            : null}
        </div>
      </div>
      <div className="shop-detail-info">
        {!page && <><p className="shop-detail-eyebrow">{section.title}</p><h4>{product.name}</h4></>}
        {!page && price}
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
              ? publicCommerce ? 'Produto indisponível nesta quantidade' : 'Limite do estoque demonstrativo'
              : section.ctaText || 'Adicionar à sacola'}
          </HardwareButton>
        ) : (
          <span className="shop-action shop-product-action">
            {(product.stock ?? 0) > 0
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
                (publicCommerce ? 'A loja ainda não informou mais detalhes.' : 'Adicione as características e medidas do produto.')}
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
