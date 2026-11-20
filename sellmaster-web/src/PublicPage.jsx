import { useEffect, useState } from 'react'
import { api } from './api'
import './public-page.css'

export default function PublicPage({ slug }) {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_address: '', quantity: 1, variant: '' })

  useEffect(() => {
    let active = true
    api.pageBuilderPublic(slug).then((result) => {
      if (!active) return
      setPage(result.page)
      const seo = result.page?.seo_json || {}
      const title = seo.title || result.page.title
      const description = seo.description || result.page.title
      const image = seo.image || result.page.content_json?.images?.[0] || ''
      document.title = title
      const setMeta = (name, property, value) => {
        let element = property
          ? document.querySelector(`meta[property="${property}"]`)
          : document.querySelector(`meta[name="${name}"]`)
        if (!element) {
          element = document.createElement('meta')
          if (property) element.setAttribute('property', property)
          else element.setAttribute('name', name)
          document.head.appendChild(element)
        }
        element.setAttribute('content', String(value).slice(0, 320))
      }
      setMeta('description', null, description)
      setMeta(null, 'og:title', title)
      setMeta(null, 'og:description', description)
      setMeta(null, 'og:url', window.location.href)
      setMeta(null, 'og:type', 'website')
      if (image) setMeta(null, 'og:image', image)
    }).catch((requestError) => active && setError(requestError.message)).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [slug])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.pageBuilderPublicOrder(slug, { ...form, quantity: Number(form.quantity), unit_price: page?.content_json?.offer?.price })
      setSubmitted(true)
    } catch (submitError) { setError(submitError.message) } finally { setSubmitting(false) }
  }

  if (loading) return <main className="public-page-loading">Chargement de la page…</main>
  if (error && !page) return <main className="public-page-error"><h1>Page indisponible</h1><p>{error}</p></main>

  const content = page?.content_json || {}
  const seo = page?.seo_json || {}
  const analysis = content.analysis || {}
  const copy = content.copy || {}
  const hero = copy.sections?.[0]
  const benefits = analysis.realBenefits || []
  const price = content.offer?.price

  return <main className="public-page" style={{ '--public-accent': page?.theme_json?.accent || '#087b60' }}>
    <section className="public-hero">
      <div className="public-hero-copy"><span className="public-kicker">OFFRE EXCLUSIVE</span><h1>{page.title}</h1><p>{hero?.subtitle || analysis.shortDescription || page.title}</p>{benefits.length > 0 && <ul>{benefits.slice(0, 4).map((item) => <li key={item}>✓ {item}</li>)}</ul>}<button type="button" onClick={() => document.querySelector('#public-order')?.scrollIntoView({ behavior: 'smooth' })}>{hero?.cta || 'Commander maintenant'} →</button></div>
      <div className="public-hero-media"><img src={(page.content_json?.images?.[0]) || '/sellmaster-mark.svg'} alt={page.title} /></div>
    </section>

    {(copy.sections || []).filter((section) => section.id !== 'hero').slice(0, 4).map((section) => <section className="public-section" key={section.id}><span>SELLMASTER</span><h2>{section.title}</h2>{section.subtitle && <h3>{section.subtitle}</h3>}<p>{section.body}</p>{section.items?.length > 0 && <div className="public-benefit-grid">{section.items.map((item) => <article key={item.title || item.question}><strong>{item.title || item.question}</strong><p>{item.text || item.answer}</p></article>)}</div>}</section>)}

    <section className="public-order-section" id="public-order">
      <div><span>COMMANDE RAPIDE</span><h2>Recevez votre produit</h2><strong>{price ? `${Number(price).toLocaleString('fr-FR')} FCFA` : 'Prix à confirmer'}</strong><p>Paiement et livraison selon les informations validées par le vendeur.</p></div>
      {submitted ? <div className="public-success"><strong>Commande enregistrée</strong><p>Nous avons reçu votre demande.</p></div> : <form onSubmit={submit}>{error && <div role="alert" className="public-form-error">{error}</div>}<label>Nom complet<input required maxLength="255" value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} /></label><label>Téléphone<input required maxLength="50" value={form.customer_phone} onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} /></label><label>Ville / adresse<textarea required rows="3" maxLength="1000" value={form.customer_address} onChange={(event) => setForm({ ...form, customer_address: event.target.value })} /></label><label>Quantité<input required type="number" min="1" max="100" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><button type="submit" disabled={submitting}>{submitting ? 'Enregistrement…' : 'Confirmer ma commande'}</button></form>}
    </section>

    <footer><strong>{seo.title || page.title}</strong><span>© {new Date().getFullYear()}</span></footer>
  </main>
}
