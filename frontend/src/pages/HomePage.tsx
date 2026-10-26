import { useNavigate } from 'react-router-dom'
export function HomePage() {
  const navigate = useNavigate()
  return <section className="welcome"><p className="eyebrow">Syndetis · comércio conectado</p><h1>Uma nova conexão.<br />Sua próxima compra.</h1>
    <p>Abra a loja compartilhada pelo vendedor para conhecer os produtos e fazer seu pedido.</p>
    <form className="store-search" onSubmit={(event) => {
      event.preventDefault()
      navigate(`/lojas/${encodeURIComponent(String(new FormData(event.currentTarget).get('slug')).trim())}`)
    }}><label>Identificador da loja<input name="slug" placeholder="minha-loja" pattern="[a-z0-9]+(-[a-z0-9]+)*" required maxLength={100} /></label><button>Abrir loja ↗</button></form>
  </section>
}
