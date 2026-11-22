import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ExternalLink, Image as ImageIcon, LoaderCircle, Link2, Monitor, Pencil, Smartphone, Sparkles, Store, WandSparkles } from 'lucide-react'
import { api, resolveAssetUrl } from './api'
import './ai-page-builder.css'

const steps = ['Source', 'Analyse', 'Stratégie', 'Visuels', 'Page', 'Publication']

function AssetPicker({ assets, setAssets, sourceImages }) {
  function toggle(index) {
    setAssets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, selected: !item.selected } : item))
  }
  return <div className="pb-assets-grid">
    {assets.map((asset, index) => {
      const originalImage = sourceImages[asset.originalImageIndex]?.url || sourceImages[asset.originalImageIndex] || ''
      return <div className={`pb-asset-card ${asset.selected ? 'selected' : ''}`} key={`${asset.type}-${index}`}>
      <input type="checkbox" checked={asset.selected} onChange={() => toggle(index)} />
      <span className="pb-asset-icon"><ImageIcon size={18} /></span>
      <span><strong>{asset.label}</strong><small>{asset.ratio} · {asset.style}</small></span>
      <span className="pb-asset-status">{asset.visualSource !== 'generated' ? 'Image source' : asset.status === 'succeeded' ? 'Gemini prête' : asset.status === 'failed' ? 'Échec Gemini' : asset.status === 'pending' ? 'Génération en cours' : 'À générer avec Gemini'}</span>
      {(asset.visualSource === 'generated' ? asset.source_url : originalImage) && <img src={resolveAssetUrl(asset.visualSource === 'generated' ? asset.source_url : originalImage)} alt="" />}
      <label className="pb-asset-visual-choice">Visuel affiché<select value={asset.visualSource || 'original'} onChange={(event) => setAssets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, visualSource: event.target.value, selected: event.target.value === 'generated' && !item.source_url ? true : event.target.value === 'original' ? false : item.selected } : item))}><option value="original" disabled={!sourceImages.length}>Image d’origine</option><option value="generated">Image Gemini</option></select></label>
      {asset.visualSource !== 'generated' && sourceImages.length > 1 && <label className="pb-asset-visual-choice">Image source<select value={asset.originalImageIndex || 0} onChange={(event) => setAssets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, originalImageIndex: Number(event.target.value) } : item))}>{sourceImages.map((image, imageIndex) => <option value={imageIndex} key={image.id || imageIndex}>Image {imageIndex + 1}</option>)}</select></label>}
      <div className="pb-asset-controls"><span>Format<select value={asset.ratio} onChange={(event) => setAssets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ratio: event.target.value } : item))}><option value="1:1">1:1</option><option value="4:5">4:5</option><option value="3:4">3:4</option><option value="16:9">16:9</option><option value="9:16">9:16</option></select></span><span>Variantes<input type="number" min="1" max="4" value={asset.variants || 1} onChange={(event) => setAssets((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, variants: Math.min(4, Math.max(1, Number(event.target.value) || 1)) } : item))} /></span></div>
    </div>})}
  </div>
}

function ProductPagePreview({ sections, productTitle, price, benefits, previewMode }) {
  const [activeImage, setActiveImage] = useState(0)
  const hero = sections.find((section) => section.stage === 'attention') || sections[0]
  const gallery = sections.filter((section) => section.previewImage).map((section) => ({ id: section.id, image: section.previewImage, title: section.title }))

  return <article className={`pb-product-preview ${previewMode}`}>
    <div className="pb-preview-product">
      <div className="pb-preview-gallery">
        {gallery[activeImage]?.image ? <img className="pb-preview-main-image" src={gallery[activeImage].image} alt={gallery[activeImage].title || productTitle} /> : <div className="pb-preview-image-empty"><ImageIcon size={28} /></div>}
        {gallery.length > 1 && <div className="pb-preview-thumbnails">{gallery.map((item, index) => <button type="button" className={index === activeImage ? 'active' : ''} key={item.id} aria-label={`Afficher l’image ${index + 1}`} onClick={() => setActiveImage(index)}><img src={item.image} alt="" /></button>)}</div>}
      </div>
      <div className="pb-preview-details">
        <span className="pb-preview-kicker">{hero?.stage?.toUpperCase() || 'PRODUIT'}</span>
        <h3>{hero?.title || productTitle}</h3>
        <p>{hero?.subtitle || hero?.body || productTitle}</p>
        {benefits.length > 0 && <ul>{benefits.slice(0, 4).map((benefit) => <li key={benefit}>✓ {benefit}</li>)}</ul>}
        <strong>{price ? `${Number(price).toLocaleString('fr-FR')} FCFA` : 'Prix à confirmer'}</strong>
        <div className="pb-preview-order"><b>Commande rapide · paiement à la livraison</b><span>Nom complet</span><span>Téléphone</span><span>Ville / adresse</span><button type="button">{hero?.cta || 'Commander maintenant'}</button></div>
      </div>
    </div>
    <div className="pb-preview-aida">{sections.filter((section) => section.stage !== 'attention').map((section) => <section className="pb-preview-aida-section" key={section.id}><span>{({ interest: 'INTÉRÊT', desire: 'DÉSIR', action: 'ACTION' })[section.stage] || section.stage}</span>{section.previewImage && <img src={section.previewImage} alt="" />}{section.title && <h4>{section.title}</h4>}{section.subtitle && <strong>{section.subtitle}</strong>}{section.body && <p>{section.body}</p>}{section.items?.map((item) => <p key={item.title}>{item.title ? <b>{item.title}: </b> : ''}{item.text}</p>)}</section>)}</div>
  </article>
}

export default function AiPageBuilderView({ onBack }) {
  const [step, setStep] = useState(0)
  const [url, setUrl] = useState('')
  const [manual, setManual] = useState(false)
  const [manualProduct, setManualProduct] = useState({ title: '', description: '', price: '', features: '', images: '' })
  const [market, setMarket] = useState('Bénin')
  const [language, setLanguage] = useState('Français')
  const [style, setStyle] = useState('direct-conversion')
  const [angle, setAngle] = useState('Problème → Solution')
  const [price, setPrice] = useState('')
  const [project, setProject] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [copy, setCopy] = useState(null)
  const [assets, setAssets] = useState([
    { type: 'hero', label: 'Image principale', ratio: '4:5', style: 'Premium', variants: 1, selected: false, visualSource: 'original', originalImageIndex: 0, prompt: '', status: 'idle' },
    { type: 'lifestyle', label: 'Produit en contexte', ratio: '3:4', style: 'Lifestyle', variants: 1, selected: false, visualSource: 'original', originalImageIndex: 1, prompt: '', status: 'idle' },
    { type: 'benefit', label: 'Visuel bénéfice', ratio: '1:1', style: 'Clean', variants: 1, selected: false, visualSource: 'original', originalImageIndex: 2, prompt: '', status: 'idle' },
    { type: 'offer', label: 'Visuel offre', ratio: '4:5', style: 'Conversion', variants: 1, selected: false, visualSource: 'original', originalImageIndex: 3, prompt: '', status: 'idle' },
  ])
  const [page, setPage] = useState(null)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [publishedUrl, setPublishedUrl] = useState('')
  const [publishTarget, setPublishTarget] = useState('sellmaster')
  const [stores, setStores] = useState([])
  const [storeId, setStoreId] = useState('')
  const [storesLoading, setStoresLoading] = useState(true)
  const [productDraft, setProductDraft] = useState(null)
  const [sourceImages, setSourceImages] = useState([])

  useEffect(() => {
    if (!project) return
    const product = project.product_data || {}
    setPrice(product.price == null ? '' : String(product.price))
  }, [project])

  async function importProduct(event) {
    event?.preventEvent?.()
    setError('')
    setBusy(true)
    try {
      const payload = manual
        ? { manual: true, product: { title: manualProduct.title, description: manualProduct.description, price: manualProduct.price ? Number(manualProduct.price) : null, features: manualProduct.features.split('\n').map((item) => item.trim()).filter(Boolean), images: manualProduct.images.split('\n').map((item) => item.trim()).filter(Boolean) } }
        : { url }
      const result = await api.pageBuilderImport(payload)
      if (!result.project?.id) throw new Error('Le projet n’a pas pu être créé. Réessayez ou utilisez la saisie manuelle.')
      setProject(result.project)
      const product = result.project.product_data || {}
      setProductDraft({
        title: product.title || '',
        description: product.description || '',
        price: product.price == null ? '' : String(product.price),
        variants: (Array.isArray(product.variants) ? product.variants : []).map((variant) => ({ title: variant.title || 'Default Title', price: variant.price == null ? '' : String(variant.price), sku: variant.sku || '' })),
      })
      setSourceImages((Array.isArray(product.images) ? product.images : []).map((url, index) => ({ id: `${index}-${url}`, url, selected: true })))
      setAssets((current) => current.map((asset, index) => ({ ...asset, selected: false, visualSource: product.images?.length ? 'original' : 'generated', originalImageIndex: Math.min(index, Math.max((product.images?.length || 1) - 1, 0)) })))
      setStep(1)
    } catch (importError) { setError(importError.message) } finally { setBusy(false) }
  }

  async function analyzeProduct() {
    setError('')
    if (!productDraft?.title?.trim()) {
      setError('Le titre du produit est requis.')
      return
    }
    setBusy(true)
    try {
      const selectedImages = sourceImages.filter((image) => image.selected).map((image) => image.url)
      const productData = {
        ...(project.product_data || {}),
        title: productDraft.title.trim(),
        description: productDraft.description,
        price: productDraft.price ? Number(productDraft.price) : null,
        images: selectedImages,
        variants: productDraft.variants.map((variant) => ({ ...variant, title: variant.title.trim(), sku: variant.sku.trim(), price: variant.price === '' ? null : Number(variant.price) })),
      }
      const projectUpdate = await api.pageBuilderProjectUpdate(project.id, { product_data: productData })
      setProject(projectUpdate.project || { ...project, product_data: productData })
      setPrice(productData.price == null ? '' : String(productData.price))
      const result = await api.pageBuilderAnalyze(project.id, { market, language, style })
      setProject(result.project)
      setAnalysis(result.analysis)
      setStep(2)
    } catch (analysisError) { setError(analysisError.message) } finally { setBusy(false) }
  }

  async function generateCopy() {
    setError('')
    setBusy(true)
    try {
      const result = await api.pageBuilderCopy(project.id, { market, language, angle, price: price ? Number(price) : null, cod: { enabled: true } })
      setCopy(result.content)
      const product = project.product_data || {}
      const imageDirections = {
        hero: 'Visuel principal net du produit, cadrage éditorial premium et arrière-plan sobre.',
        lifestyle: `Produit utilisé dans un contexte quotidien crédible adapté au marché ${market}.`,
        benefit: 'Illustrer visuellement un seul bénéfice confirmé, sans texte ni résultat inventé.',
        offer: 'Mise en scène claire du produit pour accompagner le bloc de commande, sans prix ni promotion inventés.',
      }
      setAssets((current) => current.map((item) => ({ ...item, prompt: item.prompt || `${item.label}: ${product.title || 'produit'}. ${imageDirections[item.type] || 'Présentation cohérente avec la fiche source.'}` })))
      setStep(3)
    } catch (copyError) { setError(copyError.message) } finally { setBusy(false) }
  }

  async function generateImages() {
    setError('')
    setBusy(true)
    try {
      const selected = assets.filter((item) => item.selected).map((item) => ({ ...item, status: 'pending' }))
      setAssets((current) => current.map((item) => item.selected ? { ...item, status: 'pending' } : item))
      const result = await api.pageBuilderGenerateAssets(project.id, {
        page: { title: analysis?.commercialName || project.product_data?.title || 'Landing page', template: style === 'minimal-premium' ? 'minimal-premium' : style === 'product-showcase' ? 'product-showcase' : 'direct-response', content_json: { analysis, copy, offer: { price: price ? Number(price) : null }, product: project.product_data, sourceImages: project.product_data?.images || [], visualSources: Object.fromEntries(assets.map((item) => [item.type, { source: item.visualSource || 'original', imageIndex: item.originalImageIndex || 0 }])) }, theme_json: { market, language }, seo_json: { title: analysis?.commercialName || project.product_data?.title, description: analysis?.shortDescription || project.product_data?.description } },
        content: { analysis, copy, offer: { price: price ? Number(price) : null }, product: project.product_data, sourceImages: project.product_data?.images || [], visualSources: Object.fromEntries(assets.map((item) => [item.type, { source: item.visualSource || 'original', imageIndex: item.originalImageIndex || 0 }])) },
        assets: selected,
      })
      setPage({ id: result.pageId })
      const byType = new Map((result.assets || []).map((item) => [item.asset_type, item]))
      setAssets((current) => current.map((item) => {
        const generated = byType.get(item.type)
        return generated ? { ...item, status: generated.generation_status || 'failed', source_url: generated.source_url || null } : item
      }))
      setStep(4)
    } catch (generateError) { setError(generateError.message) } finally { setBusy(false) }
  }

  async function savePage() {
    setError('')
    setBusy(true)
    try {
      if (!page?.id) throw new Error('Aucune page à sauvegarder.')
      const generatedAssets = Object.fromEntries(assets.filter((item) => item.source_url).map((item) => [item.type, item.source_url]))
      const visualSources = Object.fromEntries(assets.map((item) => [item.type, { source: item.visualSource || 'original', imageIndex: item.originalImageIndex || 0 }]))
      const content = { analysis, copy, offer: { price: price ? Number(price) : null }, product: project.product_data, sourceImages: project.product_data?.images || [], generatedAssets, visualSources }
      const full = await api.pageBuilderSavePage(page.id, { project_id: project.id, id: page.id, title: analysis?.commercialName || project.product_data?.title || 'Landing page', template: style === 'minimal-premium' ? 'minimal-premium' : style === 'product-showcase' ? 'product-showcase' : 'direct-response', content_json: content, theme_json: { market, language, accent: '#00a6b2' }, seo_json: { title: analysis?.commercialName || project.product_data?.title, description: analysis?.shortDescription || project.product_data?.description, image: resolveAssetUrl(generatedAssets.hero) || project.product_data?.images?.[0] }, status: 'draft' })
      setPage(full.page)
    } catch (saveError) { setError(saveError.message) } finally { setBusy(false) }
  }

  async function publishPage() {
    setError('')
    setBusy(true)
    try {
      if (!page?.id) throw new Error('Sauvegardez la page avant la publication.')
      const result = publishTarget === 'shopify'
        ? await api.pageBuilderPublishShopify(page.id, { storeId: Number(storeId) })
        : await api.pageBuilderPublish(page.id)
      setPublishedUrl(result.url)
      setStep(5)
    } catch (publishError) { setError(publishError.message) } finally { setBusy(false) }
  }

  function visualUrl(asset, fallbackIndex = 0) {
    const source = asset?.visualSource === 'generated'
      ? asset.source_url
      : project?.product_data?.images?.[asset?.originalImageIndex ?? fallbackIndex]
    return resolveAssetUrl(source)
  }

  const previewSections = (copy?.sections || []).map((section, index) => ({
    ...section,
    previewImage: visualUrl(assets.find((item) => item.type === section.imageType), index),
  }))

  useEffect(() => {
    let active = true
    api.shopifyStores()
      .then((result) => {
        if (!active) return
        const activeStores = (Array.isArray(result.stores) ? result.stores : []).filter((store) => store.is_active === true || store.is_active === 1 || store.is_active === '1')
        setStores(activeStores)
        setStoreId(String(activeStores[0]?.id || ''))
      })
      .catch(() => {
        if (active) setStores([])
      })
      .finally(() => {
        if (active) setStoresLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (storesLoading || !stores.length) return
    setPublishTarget('sellmaster')
  }, [storesLoading, stores])

  return <div className="ai-page-builder">
    <section className="pb-intro">
      <button className="pb-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Retour aux produits</button>
      <div className="pb-intro-icon"><WandSparkles size={24} /></div>
      <div><span className="panel-overline">GÉNÉRATION E-COMMERCE</span><h2>AI Page Builder</h2><p>Créez une landing page produit vérifiable, éditable et prête à recevoir des commandes.</p></div>
      <span className="pb-status"><i /> Flux automatique</span>
    </section>

    <nav className="pb-steps" aria-label="Étapes de création">{steps.map((item, index) => <button type="button" key={item} className={`${index === step ? 'active' : ''} ${index < step ? 'done' : ''}`} onClick={() => index <= step && setStep(index)}><span>{index < step ? <Check size={14} /> : index + 1}</span><b>{item}</b></button>)}</nav>

    {error && <div className="api-alert pb-error" role="alert">{error}</div>}

    {step === 0 && <section className="pb-panel pb-source">
      <div className="pb-section-heading"><div><span className="panel-overline">ÉTAPE 1 · SOURCE</span><h3>Quel produit souhaitez-vous présenter ?</h3></div><span>01</span></div>
      <div className="pb-source-modes"><button type="button" className={!manual ? 'active' : ''} onClick={() => setManual(false)}><Link2 size={18} /><strong>Importer une URL</strong><small>Alibaba, Shopify ou concurrent</small></button><button type="button" className={manual ? 'active' : ''} onClick={() => setManual(true)}><Pencil size={18} /><strong>Saisie manuelle</strong><small>Continuer sans extraction</small></button></div>
      {!manual ? <form className="pb-form" onSubmit={(event) => { event.preventDefault(); importProduct() }}><label>Lien du produit<input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." /></label></form> : <div className="pb-form"><label>Titre du produit<input value={manualProduct.title} onChange={(event) => setManualProduct({ ...manualProduct, title: event.target.value })} placeholder="Nom commercial confirmé" /></label><label>Description<textarea rows="4" value={manualProduct.description} onChange={(event) => setManualProduct({ ...manualProduct, description: event.target.value })} /></label><div className="pb-fields"><label>Prix (FCFA)<input type="number" min="0" value={manualProduct.price} onChange={(event) => setManualProduct({ ...manualProduct, price: event.target.value })} /></label><label>URLs images<textarea rows="3" value={manualProduct.images} onChange={(event) => setManualProduct({ ...manualProduct, images: event.target.value })} placeholder="Une URL HTTPS par ligne" /></label></div><label>Caractéristiques — une par ligne<textarea rows="3" value={manualProduct.features} onChange={(event) => setManualProduct({ ...manualProduct, features: event.target.value })} /></label></div>}
      <div className="pb-options"><label>Marché cible<select value={market} onChange={(event) => setMarket(event.target.value)}><option>Bénin</option><option>Côte d’Ivoire</option><option>Togo</option><option>Sénégal</option><option>Autre marché</option></select></label><label>Langue<select value={language} onChange={(event) => setLanguage(event.target.value)}><option>Français</option><option>Anglais</option></select></label><label>Style<select value={style} onChange={(event) => setStyle(event.target.value)}><option value="minimal-premium">Minimal Premium</option><option value="direct-response">Direct Response</option><option value="product-showcase">Product Showcase</option></select></label></div>
      <div className="pb-actions"><button className="button button-primary" type="button" disabled={busy || (!manual && !url)} onClick={importProduct}>{busy ? <><LoaderCircle className="spin" size={16} /> Analyse…</> : <>Analyser le produit <ArrowRight size={16} /></>}</button></div>
    </section>}

    {step === 1 && <section className="pb-panel"><div className="pb-section-heading"><div><span className="panel-overline">ÉTAPE 2 · ANALYSE</span><h3>Vérifier les informations du produit</h3></div><span>02</span></div>{productDraft && <div className="pb-edit-grid"><section className="pb-edit-details"><label>Titre<input required maxLength="300" value={productDraft.title} onChange={(event) => setProductDraft((current) => ({ ...current, title: event.target.value }))} /></label><label>Description<textarea rows="7" value={productDraft.description} onChange={(event) => setProductDraft((current) => ({ ...current, description: event.target.value }))} /></label><label>Prix de référence (FCFA)<input type="number" min="0" step="any" value={productDraft.price} onChange={(event) => setProductDraft((current) => ({ ...current, price: event.target.value }))} /></label>{productDraft.variants.length > 0 && <fieldset className="pb-variants"><legend>Variantes Shopify</legend>{productDraft.variants.map((variant, index) => <div className="pb-variant" key={`${index}-${variant.sku}`}><label>Titre<input value={variant.title} onChange={(event) => setProductDraft((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} /></label><label>Prix (FCFA)<input type="number" min="0" step="any" value={variant.price} onChange={(event) => setProductDraft((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item) }))} /></label><label>SKU<input value={variant.sku} onChange={(event) => setProductDraft((current) => ({ ...current, variants: current.variants.map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item) }))} /></label></div>)}</fieldset>}</section><section className="pb-source-gallery"><div className="pb-gallery-heading"><b>Images du produit</b><span>{sourceImages.filter((image) => image.selected).length}/{sourceImages.length}</span></div>{sourceImages.length === 0 ? <div className="pb-empty-image"><ImageIcon size={25} /></div> : <div className="pb-source-images">{sourceImages.map((image, index) => <label key={image.id} className={image.selected ? 'selected' : ''}><img src={image.url} alt={`Image ${index + 1}`} loading="lazy" /><span><input type="checkbox" checked={image.selected} onChange={(event) => setSourceImages((current) => current.map((item) => item.id === image.id ? { ...item, selected: event.target.checked } : item))} /> Garder</span></label>)}</div>}</section></div>}<div className="pb-actions"><button className="button button-quiet" type="button" onClick={() => setStep(0)}>Modifier la source</button><button className="button button-primary" type="button" disabled={busy || !productDraft?.title?.trim()} onClick={analyzeProduct}>{busy ? <><LoaderCircle className="spin" size={16} /> Analyse IA…</> : <><Sparkles size={16} /> Analyser avec l’IA</>}</button></div></section>}

    {step === 2 && <section className="pb-panel"><div className="pb-section-heading"><div><span className="panel-overline">ÉTAPE 3 · STRATÉGIE</span><h3>Choisir l’approche marketing</h3></div><span>03</span></div><div className="pb-options"><label>Angle marketing<select value={angle} onChange={(event) => setAngle(event.target.value)}><option>Problème → Solution</option><option>Avant → Après</option><option>Démonstration produit</option><option>Storytelling</option><option>Découverte</option><option>Gain de temps</option><option>Confort</option><option>Comparaison</option><option>UGC / expérience utilisateur</option></select></label><label>Prix validé (FCFA)<input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></label></div>{analysis && <div className="pb-analysis-summary"><article><span>Angle principal</span><strong>{analysis.mainAngle || angle}</strong></article><article><span>Bénéfices réels</span><strong>{Array.isArray(analysis.realBenefits) ? analysis.realBenefits.slice(0, 3).join(' · ') : 'À confirmer'}</strong></article><article><span>CTA</span><strong>{Array.isArray(analysis.cta) ? analysis.cta[0] || 'Commander maintenant' : 'Commander maintenant'}</strong></article></div>}<div className="pb-actions"><button className="button button-primary" type="button" disabled={busy} onClick={generateCopy}>{busy ? <><LoaderCircle className="spin" size={16} /> Rédaction…</> : <><Sparkles size={16} /> Générer le copywriting</>}</button></div></section>}

    {step === 3 && <section className="pb-panel"><div className="pb-section-heading"><div><span className="panel-overline">ÉTAPE 4 · VISUELS</span><h3>Choisir les images de chaque section</h3></div><span>04</span></div><p className="pb-visual-help">Utilisez les images originales sans génération, ou choisissez Gemini pour créer une illustration par section.</p><AssetPicker assets={assets} setAssets={setAssets} sourceImages={project?.product_data?.images || []} /><div className="pb-prompt-list">{assets.filter((item) => item.selected).map((item, index) => <label key={`${item.type}-${index}`}><b>Prompt Gemini · {item.label}</b><textarea rows="3" value={item.prompt} onChange={(event) => setAssets((current) => current.map((asset) => asset.type === item.type ? { ...asset, prompt: event.target.value } : asset))} /></label>)}</div><div className="pb-actions"><button className="button button-quiet" type="button" onClick={() => setStep(2)}>Retour</button><button className="button button-primary" type="button" disabled={busy} onClick={generateImages}>{busy ? <><LoaderCircle className="spin" size={16} /> Préparation…</> : assets.some((item) => item.selected) ? <><WandSparkles size={16} /> Générer les visuels sélectionnés ({assets.filter((item) => item.selected).length})</> : <>Continuer avec les images d’origine</>}</button></div></section>}

    {step === 4 && <section className="pb-panel"><div className="pb-section-heading"><div><span className="panel-overline">ÉTAPE 5 · PAGE</span><h3>Prévisualiser et personnaliser</h3></div><div className="pb-preview-toggle"><button type="button" className={previewMode === 'desktop' ? 'active' : ''} onClick={() => setPreviewMode('desktop')}><Monitor size={15} /> Desktop</button><button type="button" className={previewMode === 'mobile' ? 'active' : ''} onClick={() => setPreviewMode('mobile')}><Smartphone size={15} /> Mobile</button></div></div><div className="pb-editor-grid"><div className="pb-editor"><label>Titre principal<input value={analysis?.commercialName || ''} readOnly /></label><label>Texte d’accroche<textarea rows="4" value={copy?.sections?.[0]?.subtitle || analysis?.shortDescription || ''} readOnly /></label><label>Prix de vente (FCFA)<input type="number" value={price} onChange={(event) => setPrice(event.target.value)} /></label><button className="button button-quiet" type="button" onClick={savePage} disabled={busy}>{busy ? 'Sauvegarde…' : 'Sauvegarder les modifications'}</button></div><div className={`pb-preview ${previewMode}`}><ProductPagePreview sections={previewSections} productTitle={analysis?.commercialName || project?.product_data?.title || 'Produit'} price={price} benefits={analysis?.realBenefits || []} previewMode={previewMode} /></div></div><div className="pb-actions"><button className="button button-primary" type="button" onClick={() => setStep(5)}><ArrowRight size={16} /> Préparer la publication</button></div></section>}

    {step === 5 && <section className="pb-panel pb-publish"><div className="pb-publish-icon">{publishedUrl ? <Check size={28} /> : <Sparkles size={28} />}</div><span className="panel-overline">ÉTAPE 6 · PUBLICATION</span><h3>{publishedUrl ? 'Votre page est publiée' : 'Choisir la destination'}</h3>{!publishedUrl && <div className="pb-publish-targets"><button type="button" className={publishTarget === 'sellmaster' ? 'active' : ''} onClick={() => setPublishTarget('sellmaster')}><Store size={18} /><strong>Page Sellmaster</strong><small>URL publique /p/…</small></button><button type="button" className={publishTarget === 'shopify' ? 'active' : ''} onClick={() => setPublishTarget('shopify')}><Link2 size={18} /><strong>Boutique Shopify</strong><small>Page native /pages/…</small></button></div>}<p>{publishedUrl ? 'Elle est accessible publiquement.' : publishTarget === 'shopify' ? 'La page sera créée ou mise à jour dans Shopify avec toutes les images disponibles.' : 'La page recevra une URL publique Sellmaster.'}</p>{publishTarget === 'shopify' && !publishedUrl && <label className="pb-publish-store">Boutique Shopify{storesLoading ? <span>Chargement…</span> : stores.length === 0 ? <span>Aucune boutique active</span> : <select value={storeId} onChange={(event) => setStoreId(event.target.value)}>{stores.map((store) => <option key={store.id} value={store.id}>{store.shop_name}</option>)}</select>}</label>}{publishedUrl && <a className="pb-public-url" href={publishedUrl} target="_blank" rel="noreferrer">{publishedUrl} <ExternalLink size={14} /></a>}<div className="pb-actions"><button className="button button-primary" type="button" disabled={busy || Boolean(publishedUrl) || (publishTarget === 'shopify' && (!storeId || storesLoading))} onClick={publishPage}>{busy ? 'Publication…' : publishedUrl ? 'Publié' : publishTarget === 'shopify' ? 'Publier dans Shopify' : 'Publier sur Sellmaster'}</button></div></section>}
  </div>
}
