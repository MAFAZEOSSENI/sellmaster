import { useEffect, useState } from 'react'
import { Activity, Bookmark, BookmarkCheck, ExternalLink, RefreshCw, Search } from 'lucide-react'
import { api } from './api'

function formatObserved(value) {
  if (!value) return 'Date inconnue'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date inconnue' : new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function ProductResearchView() {
  const [query, setQuery] = useState('')
  const [url, setUrl] = useState('')
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [observations, setObservations] = useState([])
  const [collections, setCollections] = useState([])
  const [collectionName, setCollectionName] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [notes, setNotes] = useState([])
  const [jobs, setJobs] = useState([])
  const [ads, setAds] = useState([])
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')

  async function loadLibrary() {
    setLoading(true)
    setError('')
    try {
      const response = await api.researchLibrary(50)
      setItems(response.items || [])
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  async function search(event) {
    event?.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await api.researchProducts({ q: query.trim(), limit: 50 })
      setItems(response.items || [])
    } catch (searchError) {
      setError(searchError.message)
    } finally {
      setLoading(false)
    }
  }

  async function importUrl(event) {
    event.preventDefault()
    setImporting(true)
    setError('')
    try {
      await api.importResearchProductUrl(url.trim())
      setUrl('')
      await search()
    } catch (importError) {
      setError(importError.message)
    } finally {
      setImporting(false)
    }
  }

  async function openProduct(item) {
    setError('')
    try {
      const [detail, history, libraryNotes, libraryCollections] = await Promise.all([
        api.researchProduct(item.id),
        api.researchObservations(item.id, 50),
        api.researchNotes(item.id),
        api.researchCollections(),
      ])
      setSelected(detail.product)
      setObservations(history.items || [])
      setNotes(libraryNotes.notes || [])
      setCollections(libraryCollections.collections || [])
    } catch (detailError) {
      setError(detailError.message)
    }
  }

  async function toggleSaved(item) {
    setError('')
    try {
      await api.setResearchSaved(item.id, item.saved !== true)
      await search()
      if (selected?.id === item.id) {
        const detail = await api.researchProduct(item.id)
        setSelected(detail.product)
      }
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  async function createCollection(event) {
    event.preventDefault()
    if (!collectionName.trim()) return
    setError('')
    try {
      await api.createResearchCollection(collectionName.trim(), '')
      setCollectionName('')
      const response = await api.researchCollections()
      setCollections(response.collections || [])
    } catch (collectionError) {
      setError(collectionError.message)
    }
  }

  async function addToCollection(collectionId) {
    if (!selected?.id) return
    setError('')
    try {
      await api.setResearchCollectionProduct(collectionId, selected.id, true)
      const response = await api.researchCollections()
      setCollections(response.collections || [])
    } catch (collectionError) {
      setError(collectionError.message)
    }
  }

  async function saveNote(event) {
    event.preventDefault()
    if (!selected?.id || !noteBody.trim()) return
    setError('')
    try {
      await api.createResearchNote(selected.id, noteBody.trim())
      setNoteBody('')
      const response = await api.researchNotes(selected.id)
      setNotes(response.notes || [])
    } catch (noteError) {
      setError(noteError.message)
    }
  }

  async function deleteNote(noteId) {
    setError('')
    try {
      await api.deleteResearchNote(noteId)
      if (selected?.id) {
        const response = await api.researchNotes(selected.id)
        setNotes(response.notes || [])
      }
    } catch (noteError) {
      setError(noteError.message)
    }
  }

  async function loadJobsAndAds() {
    try {
      const [jobResponse, adResponse] = await Promise.all([
        api.researchJobs(30),
        selectedJobId ? api.researchJobAds(selectedJobId, 100) : api.researchAds({ limit: 50 }),
      ])
      setJobs(jobResponse.items || [])
      setAds(adResponse.items || [])
    } catch (monitorError) {
      setError(monitorError.message)
    }
  }

  async function loadJobAds(jobId) {
    setSelectedJobId(jobId)
    try {
      const response = await api.researchJobAds(jobId, 100)
      setAds(response.items || [])
    } catch (monitorError) {
      setError(monitorError.message)
    }
  }

  async function createJob(event) {
    event.preventDefault()
    if (!query.trim()) return
    setError('')
    const popup = window.open('about:blank', '_blank')
    if (!popup) {
      setError('Autorisez les fenêtres pop-up pour ouvrir Meta Ads Library.')
      return
    }
    try {
      const response = await api.createResearchJob({ queryText: query.trim(), sourceType: 'meta_extension' })
      const job = response.job
      if (job?.id) {
        setSelectedJobId(job.id)
        const url = new URL('https://www.facebook.com/ads/library/')
        url.searchParams.set('active_status', 'all')
        url.searchParams.set('ad_type', 'all')
        url.searchParams.set('country', 'ALL')
        url.searchParams.set('media_type', 'all')
        url.searchParams.set('q', query.trim())
        url.searchParams.set('search_type', 'keyword_unordered')
        url.searchParams.set('sm_job_id', String(job.id))
        url.searchParams.set('sm_limit', '50')
        url.searchParams.set('sm_active_days', '0')
        popup.location = url.toString()
        await loadJobAds(job.id)
      }
      await loadJobsAndAds()
    } catch (jobError) {
      if (!popup.closed) popup.close()
      setError(jobError.message)
    }
  }

  async function cancelJob(jobId) {
    setError('')
    try {
      await api.cancelResearchJob(jobId)
      await loadJobsAndAds()
    } catch (jobError) {
      setError(jobError.message)
    }
  }

  useEffect(() => {
    void loadLibrary()
    void loadJobsAndAds()
  }, [])

  useEffect(() => {
    if (!jobs.some((job) => job.status === 'queued' || job.status === 'running')) return undefined
    const timer = window.setInterval(() => {
      void loadJobsAndAds()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [jobs, selectedJobId])

  return (
    <div className="research-layout">
      <section className="content-panel research-search-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-overline">PRODUCT RESEARCH</span>
            <h2>Recherche de produits</h2>
          </div>
          <button type="button" className="button button-quiet" onClick={loadLibrary}><RefreshCw size={15} /> Bibliothèque</button>
        </div>

        <form className="research-import-form" onSubmit={importUrl}>
          <label htmlFor="research-url">Analyser une fiche Shopify publique</label>
          <div className="research-url-row">
            <input id="research-url" type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://boutique.myshopify.com/products/produit" />
            <button className="button button-primary" type="submit" disabled={importing}>{importing ? 'Analyse…' : 'Analyser'}</button>
          </div>
        </form>

        <form className="research-query-form" onSubmit={search}>
          <label htmlFor="research-query">Rechercher</label>
          <div className="research-url-row">
            <input id="research-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nom ou source du produit" />
            <button className="button button-quiet" type="submit"><Search size={15} /> Rechercher</button>
          </div>
        </form>

        {error && <div className="api-alert" role="alert"><Activity size={16} /><span>{error}</span></div>}
      </section>

      <div className="research-content-grid">
        <section className="content-panel research-results-panel">
          <div className="panel-heading"><div><span className="panel-overline">RÉSULTATS</span><h2>Produits observés <span className="title-count">{items.length}</span></h2></div></div>
          {loading ? (
            <div className="loading-area"><span className="loader" /> Chargement…</div>
          ) : items.length === 0 ? (
            <div className="empty-state"><Search size={24} /><strong>Aucun produit trouvé</strong><span>Importez une fiche publique ou effectuez une recherche.</span></div>
          ) : (
            <div className="research-card-grid">
              {items.map((item) => (
                <article className="research-product-card" key={item.id}>
                  <button type="button" className="research-card-main" onClick={() => openProduct(item)}>
                    {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <span className="research-card-placeholder"><Search size={22} /></span>}
                    <strong>{item.title || 'Produit sans titre'}</strong>
                    <small>{item.source_type === 'shopify_public' ? 'Boutique Shopify publique' : item.source_type}</small>
                    <time>{formatObserved(item.last_seen_at)}</time>
                  </button>
                  <button type="button" className="research-save-button" onClick={() => toggleSaved(item)} aria-label={item.saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                    {item.saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="content-panel research-detail-panel">
          {selected ? (
            <>
              <div className="panel-heading"><div><span className="panel-overline">FICHE PRODUIT</span><h2>{selected.title || 'Produit'}</h2></div>{selected.canonical_url && <a className="icon-button" href={selected.canonical_url} target="_blank" rel="noreferrer" aria-label="Ouvrir la source"><ExternalLink size={16} /></a>}</div>
              {selected.image_url && <img className="research-detail-image" src={selected.image_url} alt="" />}
              {selected.description && <p className="research-description">{selected.description.replace(/<[^>]*>/g, ' ').slice(0, 800)}</p>}
              <div className="research-library-controls">
                <strong>Collections</strong>
                <form onSubmit={createCollection} className="research-inline-form">
                  <input value={collectionName} onChange={(event) => setCollectionName(event.target.value)} maxLength="120" placeholder="Nouvelle collection" />
                  <button type="submit" className="button button-quiet">Créer</button>
                </form>
                {collections.length > 0 && (
                  <div className="research-collection-actions">
                    {collections.map((collection) => (
                      <button type="button" className="button button-quiet" key={collection.id} onClick={() => addToCollection(collection.id)}>
                        Ajouter à {collection.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="research-note-controls">
                <strong>Notes privées</strong>
                <form onSubmit={saveNote} className="research-note-form">
                  <textarea rows="3" maxLength="10000" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Ajouter une note personnelle" />
                  <button type="submit" className="button button-primary">Enregistrer</button>
                </form>
                {notes.map((note) => (
                  <article className="research-note" key={note.id}>
                    <p>{note.body}</p>
                    <button type="button" onClick={() => deleteNote(note.id)}>Supprimer</button>
                  </article>
                ))}
              </div>
              <div className="research-observation-list">
                <strong>Historique des observations</strong>
                {observations.length === 0 ? <p>Aucune observation enregistrée.</p> : observations.map((observation) => (
                  <article key={observation.id}>
                    <time>{formatObserved(observation.observed_at)}</time>
                    <span>{observation.price == null ? 'Prix inconnu' : `${observation.price} ${observation.currency || ''}`}</span>
                    <small>{observation.availability === 'unknown' ? 'Disponibilité inconnue' : observation.availability}</small>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state"><Activity size={24} /><strong>Sélectionnez un produit</strong><span>La fiche détaillée et l’historique réel apparaîtront ici.</span></div>
          )}
        </aside>
      </div>

      <section className="content-panel research-monitor-panel">
        <div className="panel-heading">
          <div><span className="panel-overline">MONITORING</span><h2>Recherches et publicités</h2></div>
        </div>
        <form className="research-query-form" onSubmit={createJob}>
          <label htmlFor="research-job-query">Créer une recherche Meta via l’extension</label>
          <p>La collecte démarre dans un onglet Ads Library si l’extension Sellmaster est installée et connectée avec un compte owner. Seules les annonces réellement visibles et collectées seront listées.</p>
          <div className="research-url-row">
            <input id="research-job-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mot-clé publicitaire" />
            <button className="button button-primary" type="submit">Créer le job</button>
          </div>
        </form>
        <div className="research-monitor-grid">
          <div>
            <strong>Jobs</strong>
            {jobs.length === 0 ? <p>Aucune recherche créée.</p> : jobs.map((job) => (
              <article className="research-monitor-row" key={job.id}>
                <button type="button" className="text-button" onClick={() => loadJobAds(job.id)}>
                  {job.query_text || 'Recherche'}
                </button>
                <b>{job.status}</b>
                <small>{job.progress || 0}%</small>
                {(job.status === 'queued' || job.status === 'running') && (
                  <button type="button" onClick={() => cancelJob(job.id)}>Annuler</button>
                )}
              </article>
            ))}
          </div>
          <div>
            <strong>Annonces réellement ingérées</strong>
            {ads.length === 0 ? <p>Aucune annonce ingérée pour le moment.</p> : ads.map((ad) => (
              <article className="research-monitor-row" key={ad.id}>
                {ad.creative_url && <img src={ad.creative_url} alt="" loading="lazy" />}
                <a href={ad.original_url} target="_blank" rel="noreferrer">Ouvrir l’annonce {ad.external_ad_id || ''}</a>
                <small>{ad.platform} · {ad.advertiser_name || 'Annonceur non fourni'}</small>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
