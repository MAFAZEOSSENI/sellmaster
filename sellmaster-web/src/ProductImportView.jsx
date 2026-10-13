import { useEffect, useState } from 'react'
import { Activity, ArrowLeft, Check, ExternalLink, Image, Link2, LoaderCircle, PackagePlus, RefreshCw, Store } from 'lucide-react'
import { api } from './api'

function isStoreActive(store) {
  return store?.is_active === true || store?.is_active === 1 || store?.is_active === '1' || store?.is_active === 'true'
}

async function fetchActiveStores() {
  const response = await api.shopifyStores()
  return (Array.isArray(response.stores) ? response.stores : []).filter(isStoreActive)
}

export default function ProductImportView({ initialUrl = '', onBack, onImported }) {
  const [sourceUrl, setSourceUrl] = useState(initialUrl)
  const [stores, setStores] = useState([])
  const [storesLoading, setStoresLoading] = useState(true)
  const [storesError, setStoresError] = useState('')
  const [storeId, setStoreId] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(null)
  const [form, setForm] = useState(null)
  const [images, setImages] = useState([])
  const [created, setCreated] = useState(null)

  async function loadStores() {
    try {
      const connectedStores = await fetchActiveStores()
      setStores(connectedStores)
      setStoreId((current) => connectedStores.some((store) => String(store.id) === current)
        ? current
        : String(connectedStores[0]?.id || ''))
    } catch (loadError) {
      setStoresError(loadError.message)
    } finally {
      setStoresLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchActiveStores()
      .then((connectedStores) => {
        if (active) {
          setStores(connectedStores)
          setStoreId((current) => connectedStores.some((store) => String(store.id) === current)
            ? current
            : String(connectedStores[0]?.id || ''))
        }
      })
      .catch((loadError) => {
        if (active) setStoresError(loadError.message)
      })
      .finally(() => {
        if (active) setStoresLoading(false)
      })
    return () => { active = false }
  }, [])

  async function analyze(event) {
    event.preventDefault()
    setError('')
    setNotice(null)
    setCreated(null)
    setAnalysisLoading(true)
    try {
      const response = await api.scrapeShopifyProduct(sourceUrl.trim())
      const product = response.product
      if (!product || typeof product.title !== 'string') throw new Error('Shopify n’a pas renvoyé de fiche produit exploitable.')
      const variants = (Array.isArray(product.variants) ? product.variants : []).map((variant) => ({
        title: String(variant.title || 'Default Title'),
        price: String(variant.price || ''),
        sku: String(variant.sku || ''),
      }))
      setForm({
        title: product.title,
        description: product.body_html || '',
        price: variants[0]?.price || '',
        variants,
      })
      setImages((Array.isArray(product.images) ? product.images : []).map((url, index) => ({
        id: `${index}-${url}`,
        url,
        selected: true,
      })))
      setNotice({ type: 'success', message: 'Fiche analysée. Vérifiez et modifiez les informations avant l’import.' })
    } catch (analysisError) {
      setForm(null)
      setImages([])
      setError(analysisError.message)
    } finally {
      setAnalysisLoading(false)
    }
  }

  function updateVariant(index, key, value) {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) => variantIndex === index
        ? { ...variant, [key]: value }
        : variant),
    }))
  }

  async function submitImport(event) {
    event.preventDefault()
    if (!form) return
    setError('')
    setNotice(null)
    setImportLoading(true)
    try {
      const response = await api.importShopifyProduct({
        storeId: Number(storeId),
        title: form.title.trim(),
        description: form.description,
        price: Number(form.price),
        images: images.filter((image) => image.selected).map((image) => image.url),
        variants: form.variants.map((variant) => ({
          title: variant.title.trim(),
          price: Number(variant.price),
          sku: variant.sku.trim(),
        })),
      })
      const targetStore = stores.find((store) => String(store.id) === String(storeId))
      const shopHost = String(targetStore?.shop_name || '').replace(/^https?:\/\//i, '').split('/')[0]
      const shopifyId = response.shopifyProduct?.id
      setCreated({
        localProduct: response.localProduct,
        shopifyUrl: shopHost && shopifyId ? `https://${shopHost}/admin/products/${encodeURIComponent(shopifyId)}` : '',
        title: response.shopifyProduct?.title || form.title,
      })
      if (response.localProduct) onImported(response.localProduct)
      setNotice({ type: 'success', message: 'Le produit a été ajouté à votre boutique Shopify et à votre catalogue Sellmaster.' })
    } catch (importError) {
      setError(importError.message)
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <div className="product-import-view">
      <div className="product-import-toolbar">
        <button className="button button-quiet" type="button" onClick={onBack}><ArrowLeft size={15} /> Retour aux produits</button>
        <span><Link2 size={15} /> Import Shopify</span>
      </div>

      {error && <div className="api-alert" role="alert"><Activity size={16} /><span>{error}</span></div>}
      {notice && <div className={`product-import-notice ${notice.type}`} role="status"><Check size={16} /><span>{notice.message}</span></div>}

      {created ? (
        <section className="content-panel product-import-success">
          <span className="product-import-success-icon"><Check size={24} /></span>
          <span className="panel-overline">IMPORT TERMINÉ</span>
          <h2>{created.title}</h2>
          <p>Le produit est présent dans votre catalogue Sellmaster.</p>
          <div className="product-import-success-actions">
            {created.shopifyUrl && <a className="button button-primary" href={created.shopifyUrl} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Voir dans Shopify</a>}
            <button className="button button-quiet" type="button" onClick={onBack}>Retour au catalogue</button>
          </div>
        </section>
      ) : (
        <>
          <section className="content-panel product-import-source">
            <div className="product-import-section-heading"><div><span className="panel-overline">SOURCE</span><h2>Analyser une fiche produit</h2></div><span className="product-import-step">01</span></div>
            <form className="product-import-source-form" onSubmit={analyze}>
              <label htmlFor="competitor-product-url">URL du produit</label>
              <div className="product-import-url-row">
                <input id="competitor-product-url" type="url" required value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://boutique.com/products/produit" />
                <button className="button button-primary" type="submit" disabled={analysisLoading || !sourceUrl.trim()}>
                  {analysisLoading ? <LoaderCircle className="spin" size={16} /> : <Activity size={16} />}
                  {analysisLoading ? 'Analyse…' : 'Analyser'}
                </button>
              </div>
            </form>
          </section>

          {form && (
            <form className="product-import-editor" onSubmit={submitImport}>
              <section className="content-panel product-import-details">
                <div className="product-import-section-heading"><div><span className="panel-overline">INFORMATIONS MODIFIABLES</span><h2>Vérifier le produit</h2></div><span className="product-import-step">02</span></div>
                <label className="product-import-field">Titre<input required maxLength="255" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
                <label className="product-import-field">Description<textarea rows="7" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
                <label className="product-import-field product-import-price">Prix de référence (€)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>

                {form.variants.length > 0 && (
                  <fieldset className="product-import-variants">
                    <legend>Variantes Shopify</legend>
                    <p>Les titres, prix et SKU ci-dessous sont aussi modifiables avant l’envoi.</p>
                    {form.variants.map((variant, index) => (
                      <div className="product-import-variant" key={`${index}-${variant.sku}`}>
                        <label>Titre<input required maxLength="255" value={variant.title} onChange={(event) => updateVariant(index, 'title', event.target.value)} /></label>
                        <label>Prix (€)<input required type="number" min="0" step="0.01" value={variant.price} onChange={(event) => updateVariant(index, 'price', event.target.value)} /></label>
                        <label>SKU<input maxLength="255" value={variant.sku} onChange={(event) => updateVariant(index, 'sku', event.target.value)} /></label>
                      </div>
                    ))}
                  </fieldset>
                )}
              </section>

              <section className="content-panel product-import-images">
                <div className="product-import-section-heading"><div><span className="panel-overline">MÉDIAS</span><h2>Images à importer <span className="title-count">{images.filter((image) => image.selected).length}/{images.length}</span></h2></div><span className="product-import-step">03</span></div>
                {images.length === 0 ? <div className="product-import-no-images"><Image size={19} /> Aucune image publique trouvée.</div> : (
                  <div className="product-import-gallery">
                    {images.map((image, index) => (
                      <label className={`product-import-image ${image.selected ? 'selected' : ''}`} key={image.id}>
                        <img src={image.url} alt={`Image ${index + 1} du produit`} loading="lazy" />
                        <span><input type="checkbox" checked={image.selected} onChange={(event) => setImages((current) => current.map((item) => item.id === image.id ? { ...item, selected: event.target.checked } : item))} /> Garder</span>
                      </label>
                    ))}
                  </div>
                )}
              </section>

              <section className="content-panel product-import-destination">
                <div className="product-import-section-heading"><div><span className="panel-overline">DESTINATION</span><h2>Boutique Shopify</h2></div><span className="product-import-step">04</span></div>
                {storesLoading ? <div className="product-import-loading"><LoaderCircle className="spin" size={17} /> Chargement des boutiques…</div> : storesError ? (
                  <div className="product-import-store-error"><span role="alert">{storesError}</span><button className="icon-button" type="button" onClick={() => { setStoresLoading(true); setStoresError(''); void loadStores() }} aria-label="Recharger les boutiques"><RefreshCw size={16} /></button></div>
                ) : stores.length === 0 ? (
                  <div className="product-import-no-store"><Store size={20} /><div><strong>Aucune boutique active</strong><span>Connectez une boutique Shopify avant l’import.</span></div></div>
                ) : (
                  <label className="product-import-field">Importer dans<select required value={storeId} onChange={(event) => setStoreId(event.target.value)}>
                    {stores.map((store) => <option key={store.id} value={store.id}>{store.shop_name}</option>)}
                  </select></label>
                )}
                <div className="product-import-actions">
                  <button className="button button-quiet" type="button" onClick={onBack} disabled={importLoading}>Annuler</button>
                  <button className="button button-primary" type="submit" disabled={importLoading || storesLoading || !stores.length || !storeId}>
                    {importLoading ? <LoaderCircle className="spin" size={16} /> : <PackagePlus size={16} />}
                    {importLoading ? 'Import en cours…' : 'Importer le produit'}
                  </button>
                </div>
              </section>
            </form>
          )}
        </>
      )}
    </div>
  )
}