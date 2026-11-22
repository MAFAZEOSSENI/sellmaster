import { useEffect, useState } from 'react'
import { api, resolveAssetUrl } from './api'
import './public-page.css'

export default function PublicPage({ slug }) {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_address: '', quantity: 1, variant: '' })

  useEffect(() => {
    let active = true
    api.pageBuilderPublic(slug).then((result) => {
      if (!active) return
      setPage(result.page)
      setActiveImage(0)
      const firstVariant = result.page?.content_json?.product?.variants?.[0]
      if (firstVariant) setForm((current) => ({ ...current, variant: firstVariant.title || 'Default Title' }))
      const seo = result.page?.seo_json || {}
      const title = seo.title || result.page.title
      const description = seo.description || result.page.title
      const image = resolveAssetUrl(seo.image || result.page.content_json?.sourceImages?.[0] || result.page.content_json?.images?.[0] || '')
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
      const selectedVariant = page?.content_json?.product?.variants?.find((variant) => variant.title === form.variant)
      const unitPrice = page?.content_json?.offer?.price ?? selectedVariant?.price
      await api.pageBuilderPublicOrder(slug, { ...form, quantity: Number(form.quantity), unit_price: unitPrice })
      setSubmitted(true)
    } catch (submitError) { setError(submitError.message) } finally { setSubmitting(false) }
  }

  if (loading) return <main className="public-page-loading">Chargement de la page…</main>
  if (error && !page) return <main className="public-page-error"><h1>Page indisponible</h1><p>{error}</p></main>

  const content = page?.content_json || {}
  const seo = page?.seo_json || {}
  const analysis = content.analysis || {}
  const copy = content.copy || {}
  const sections = Array.isArray(copy.sections) ? copy.sections : []
  const hero = sections.find((section) => section.id === 'hero' || section.stage === 'attention') || sections[0]
  const generatedAssets = content.generatedAssets || {}
  const sourceImages = content.sourceImages || content.product?.images || []
  const variants = Array.isArray(content.product?.variants) ? content.product.variants : []
  const benefits = analysis.realBenefits || []
  const selectedVariant = variants.find((variant) => variant.title === form.variant) || variants[0]
  const price = content.offer?.price ?? selectedVariant?.price
  const imageForSection = (section, index = 0) => {
    const key = section?.imageType || section?.id
    const choice = content.visualSources?.[key]
    const sourceIndex = Number.isInteger(Number(choice?.imageIndex)) ? Number(choice.imageIndex) : index
    const original = sourceImages[sourceIndex] || ''
    const generated = generatedAssets[key] || content.images?.[index] || ''
    return resolveAssetUrl(choice?.source === 'original' ? original || generated : generated || original)
  }
  const galleryImages = [...new Set(sections.map((section, index) => imageForSection(section, index)).filter(Boolean))]
  const activeGalleryImage = galleryImages[activeImage] || galleryImages[0] || ''
  const stageLabels = { attention: 'Attention', interest: 'Intérêt', desire: 'Désir', action: 'Action' }

  return <main className="public-page" style={{ '--public-accent': page?.theme_json?.accent || '#087b60' }}>
    <section className="public-product-layout" id="public-order">
      <div className="public-product-gallery">
        <div className="public-gallery-main">{activeGalleryImage ? <img src={activeGalleryImage} alt={page.title} /> : <div className="public-gallery-empty">{page.title}</div>}</div>
        {galleryImages.length > 1 && <div className="public-gallery-thumbs" aria-label="Galerie du produit">{galleryImages.map((image, index) => <button type="button" className={index === activeImage ? 'active' : ''} key={image} aria-label={`Afficher l’image ${index + 1}`} onClick={() => setActiveImage(index)}><img src={image} alt="" loading="lazy" /></button>)}</div>}
      </div>
      <div className="public-product-buy">
        <span className="public-kicker">{stageLabels[hero?.stage] || 'Produit'}</span>
        <h1>{hero?.title || analysis.commercialName || page.title}</h1>
        <p className="public-product-subtitle">{hero?.subtitle || analysis.shortDescription || page.title}</p>
        {hero?.body && <p>{hero.body}</p>}
        {benefits.length > 0 && <ul className="public-product-benefits">{benefits.slice(0, 4).map((item) => <li key={item}>✓ {item}</li>)}</ul>}
        <strong className="public-product-price">{Number(price) > 0 ? `${Number(price).toLocaleString('fr-FR')} FCFA` : 'Prix à confirmer'}</strong>
        {submitted ? <div className="public-success"><strong>Commande enregistrée</strong><p>Nous avons reçu votre demande.</p></div> : <form className="public-order-form" onSubmit={submit}>
          <strong>Commande rapide · paiement à la livraison</strong>
          {error && <div role="alert" className="public-form-error">{error}</div>}
          {variants.length > 1 && <label>Variante<select required value={form.variant} onChange={(event) => setForm({ ...form, variant: event.target.value })}>{variants.map((variant) => <option key={variant.title} value={variant.title}>{variant.title}</option>)}</select></label>}
          <label>Nom complet<input required maxLength="255" value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} /></label>
          <label>Téléphone<input required maxLength="50" value={form.customer_phone} onChange={(event) => setForm({ ...form, customer_phone: event.target.value })} /></label>
          <label>Ville / adresse<textarea required rows="2" maxLength="1000" value={form.customer_address} onChange={(event) => setForm({ ...form, customer_address: event.target.value })} /></label>
          <label>Quantité<input required type="number" min="1" max="100" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
          <button type="submit" disabled={submitting}>{submitting ? 'Enregistrement…' : hero?.cta || 'Commander maintenant'}</button>
        </form>}
      </div>
    </section>

    {sections.filter((section) => section.id !== 'hero' && section.stage !== 'attention').map((section, index) => {
      const image = imageForSection(section, index + 1)
      return <section className={`public-section ${index % 2 ? 'reverse' : ''}`} key={section.id}>
        <div className="public-section-copy"><span>{stageLabels[section.stage] || 'Détails du produit'}</span><h2>{section.title}</h2>{section.subtitle && <h3>{section.subtitle}</h3>}{section.body && <p>{section.body}</p>}{section.items?.length > 0 && <div className="public-benefit-grid">{section.items.map((item) => <article key={item.title || item.question}><strong>{item.title || item.question}</strong><p>{item.text || item.answer}</p></article>)}</div>}{section.stage === 'action' && <><strong className="public-section-price">{Number(price) > 0 ? `${Number(price).toLocaleString('fr-FR')} FCFA` : 'Prix à confirmer'}</strong><button type="button" onClick={() => document.querySelector('#public-order')?.scrollIntoView({ behavior: 'smooth' })}>{section.cta || 'Commander maintenant'} →</button></>}</div>
        {image && <div className="public-section-media"><img src={image} alt={section.title || page.title} loading="lazy" /></div>}
      </section>
    })}

    <footer><strong>{seo.title || page.title}</strong><span>© {new Date().getFullYear()}</span></footer>
  </main>
}
