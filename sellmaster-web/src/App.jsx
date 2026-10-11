import { useCallback, useEffect, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, Boxes, ChevronDown, CircleHelp,
  ClipboardList, Command, ExternalLink, LayoutDashboard, Link2, LogOut, Package, Pencil, Plus,
  RefreshCw, Search, Settings2, ShieldCheck, ShoppingBag, Store, Trash2, Truck, Users,
} from 'lucide-react'
import { api, authToken } from './api'
import LandingPage from './LandingPage'
import './App.css'
import './notifications.css'
import './shopify.css'
import './team.css'
import './theme.css'

const navItems = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'orders', label: 'Commandes', icon: ClipboardList },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'shopify', label: 'Boutiques Shopify', icon: ShoppingBag },
  { id: 'team', label: 'Équipe', icon: Users },
  { id: 'profitability', label: 'Rentabilité', icon: BarChart3 },
]
const numberFormat = new Intl.NumberFormat('fr-FR')
const currencyFormat = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
const formatMoney = (value) => Number.isFinite(Number(value)) ? currencyFormat.format(Number(value)) : '—'
const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}
const displayName = (user) => user?.full_name?.trim() || user?.email?.split('@')[0] || 'Utilisateur'

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await api.login(email.trim(), password)
      if (!result.token) throw new Error('Le serveur n’a pas renvoyé de jeton de session.')
      authToken.set(result.token)
      await onLogin(result.user)
    } catch (loginError) {
      setError(loginError.message)
      setLoading(false)
    }
  }
  return (
    <main className="auth-layout">
      <section className="auth-brand-panel">
        <a className="brand" href="#app"><img className="brand-symbol" src="/sellmaster-mark.svg" alt="" /><span>SELLMASTER</span></a>
        <div className="auth-story"><span className="overline">VOTRE COMMERCE, EN MOUVEMENT</span><h1>Chaque commande mérite un meilleur suivi.</h1><p>Retrouvez vos ventes, produits et opérations dans un espace de travail pensé pour les e-commerçants.</p><div className="story-rule"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="story-caption"><Activity size={17} /> Votre activité, réunie au même endroit</div></div>
        <div className="auth-panel-foot"><ShieldCheck size={15} /> Connexion sécurisée à votre espace Sellmaster</div>
      </section>
      <section className="auth-form-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="mobile-brand brand"><img className="brand-symbol" src="/sellmaster-mark.svg" alt="" /><span>SELLMASTER</span></div><span className="overline">ESPACE E-COMMERÇANT</span><h2>Content de vous revoir.</h2><p>Connectez-vous pour accéder à votre activité.</p>
          <label htmlFor="email">Adresse e-mail</label><input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.com" />
          <div className="password-label"><label htmlFor="password">Mot de passe</label><a href="mailto:support@sellmaster.app">Besoin d’aide ?</a></div><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Votre mot de passe" />
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary login-submit" disabled={loading}>{loading ? 'Connexion en cours…' : 'Se connecter'}</button><div className="login-note"><ShieldCheck size={15} /> Identifiants transmis au backend Sellmaster.</div>
        </form><div className="auth-copyright">© 2026 Sellmaster</div>
      </section>
    </main>
  )
}

function Sidebar({ active, onNavigate, user, onLogout }) {
  const roles = user?.roles || []
  const canViewProfitability = roles.some((role) => ['owner', 'manager'].includes(typeof role === 'string' ? role : role?.name))
  const visibleNavItems = navItems.filter((item) => item.id !== 'profitability' || canViewProfitability)
  return (
    <aside className="sidebar">
      <a className="brand sidebar-brand" href="#app"><img className="brand-symbol" src="/sellmaster-mark.svg" alt="" /><span>SELLMASTER</span></a>
      <div className="workspace-select"><span className="store-icon"><Store size={17} /></span><span className="workspace-text"><strong>Ma boutique</strong><small>Espace principal</small></span><ChevronDown size={15} /></div>
      <span className="nav-caption">ESPACE DE TRAVAIL</span>
      <nav className="side-nav" aria-label="Navigation principale">{visibleNavItems.map(({ id, label, icon: Icon }) => <button className={`nav-link ${active === id ? 'selected' : ''}`} key={id} onClick={() => onNavigate(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'orders' && <span className="nav-count">•</span>}</button>)}</nav>
      <span className="nav-caption tools-caption">OUTILS</span>
      <div className="side-tools"><button className="nav-link disabled-link" title="Bientôt disponible"><Truck size={18} /><span>Équipe livraison</span></button></div>
      <div className="sidebar-bottom"><div className="help-block"><span className="help-icon"><CircleHelp size={17} /></span><div><strong>Besoin d’aide ?</strong><small>Notre équipe est là.</small></div><a href="mailto:support@sellmaster.app" aria-label="Contacter le support">↗</a></div><div className="profile-row"><span className="avatar">{displayName(user).slice(0, 1).toUpperCase()}</span><span className="profile-meta"><strong>{displayName(user)}</strong><small>{user?.email || ''}</small></span><button className="icon-button logout-button" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17} /></button></div></div>
    </aside>
  )
}

function MetricCard({ icon: Icon, label, value, note, tone }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div><strong className="metric-value">{value}</strong><div className="metric-note"><span className="neutral-dot" />{note}</div></article>
}

function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase()
  const label = ({ livree: 'Livrée', annulee: 'Annulée', reportee: 'Reportée', dashboard: 'En cours' })[key] || status || 'Inconnue'
  return <span className={`status-pill status-${key}`}>{label}</span>
}

function OrdersTable({ orders, compact = false, onStatusChange, updatingOrderId, isCourier, canAssign, couriersByOwner = {}, onAssign, assigningOrderId }) {
  if (!orders.length) return <div className="empty-state"><ClipboardList size={24} /><strong>Aucune commande pour le moment</strong><span>Les commandes reçues apparaîtront ici.</span></div>
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Commande</th><th>Client</th><th>Source</th><th>Montant</th><th>Statut</th>{canAssign && <th>Livreur</th>}<th>Date</th></tr></thead><tbody>{orders.slice(0, compact ? 5 : undefined).map((order, index) => { const couriers = couriersByOwner[String(order.user_id)] || []; return <tr key={order.id ?? `${order.custom_order_number}-${index}`}><td className="order-ref">{order.custom_order_number || `CMD-${order.id}`}</td><td><span className="customer-name">{order.client_name || 'Client'}</span><small className="secondary-line">{order.client_phone || 'Téléphone non renseigné'}</small></td><td><span className="source-label">{order.source === 'shopify' ? <><ShoppingBag size={13} /> Shopify</> : <><Command size={13} /> Sellmaster</>}</span></td><td className="amount-cell">{formatMoney(order.total_amount)}</td><td>{onStatusChange ? <select className="status-select" aria-label={`Statut de ${order.custom_order_number || order.id}`} value={order.status || 'dashboard'} disabled={updatingOrderId === order.id} onChange={(event) => onStatusChange(order, event.target.value, isCourier)}><option value="dashboard">En cours</option><option value="livree">Livrée</option><option value="annulee">Annulée</option><option value="reportee">Reportée</option></select> : <StatusBadge status={order.status} />}</td>{canAssign && <td><select className="courier-select" aria-label={`Livreur de ${order.custom_order_number || order.id}`} value={order.assigned_to == null ? '' : String(order.assigned_to)} disabled={assigningOrderId === order.id || couriers.length === 0} onChange={(event) => { if (event.target.value) onAssign(order, event.target.value) }}><option value="">{couriers.length ? 'Non assignée' : 'Aucun livreur éligible'}</option>{order.assigned_to != null && !couriers.some((courier) => String(courier.member_user_id) === String(order.assigned_to)) && <option value={String(order.assigned_to)}>Livreur actuel</option>}{couriers.map((courier) => <option value={String(courier.member_user_id)} key={courier.member_user_id}>{courier.full_name || courier.email || `Livreur #${courier.member_user_id}`}</option>)}</select></td>}<td className="date-cell">{formatDate(order.created_at)}</td></tr> })}</tbody></table></div>
}

function ProductsTable({ products, onEdit }) {
  if (!products.length) return <div className="empty-state"><Package size={24} /><strong>Votre catalogue est vide</strong><span>Les produits de votre boutique apparaîtront ici.</span></div>
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Produit</th><th>Prix</th><th>Coût</th><th>Stock</th><th>Créé le</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{products.map((product, index) => <tr key={product.id ?? index}><td><span className="product-name"><span className="product-thumb">{product.image_url ? <img src={product.image_url} alt="" /> : <Boxes size={17} />}</span><span>{product.name || 'Produit sans nom'}<small className="secondary-line">{product.description || 'Aucune description'}</small></span></span></td><td className="amount-cell">{formatMoney(product.price)}</td><td>{product.cost_price == null ? '—' : formatMoney(product.cost_price)}</td><td>{product.stock ?? '—'}</td><td className="date-cell">{formatDate(product.created_at)}</td><td><button className="icon-button edit-product-button" onClick={() => onEdit(product)} aria-label={`Modifier ${product.name}`} title="Modifier le produit"><Pencil size={15} /></button></td></tr>)}</tbody></table></div>
}

function CreateProductDialog({ product, onClose, onSave }) {
  const [form, setForm] = useState(() => product ? { name: product.name || '', description: product.description || '', price: String(product.price ?? ''), cost_price: product.cost_price == null ? '' : String(product.cost_price), stock: String(product.stock ?? 0) } : { name: '', description: '', price: '', cost_price: '', stock: '0' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ ...form, price: Number(form.price), cost_price: form.cost_price === '' ? null : Number(form.cost_price), stock: Number(form.stock) })
    } catch (createError) {
      setError(createError.message)
      setSaving(false)
    }
  }
  const title = product ? 'Modifier le produit' : 'Nouveau produit'
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="new-product-title"><div className="dialog-heading"><div><span className="panel-overline">CATALOGUE</span><h2 id="new-product-title">{title}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div><form onSubmit={submit}><label>Nom du produit<input required maxLength="180" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Description<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="dialog-fields"><label>Prix de vente (€)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Coût (€)<input type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => setForm({ ...form, cost_price: event.target.value })} /></label><label>Stock<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Annuler</button><button className="button button-primary" disabled={saving}>{saving ? 'Enregistrement…' : product ? 'Enregistrer les modifications' : 'Créer le produit'}</button></div></form></section></div>
}

function CreateOrderDialog({ products: initialProducts, owners = [], onClose, onSave }) {
  const [form, setForm] = useState({ clientName: '', clientPhone: '', clientAddress: '', notes: '' })
  const [ownerId, setOwnerId] = useState(String(owners[0]?.owner_user_id || ''))
  const [catalogue, setCatalogue] = useState(initialProducts)
  const [catalogueLoading, setCatalogueLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const total = items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)

  useEffect(() => {
    if (!ownerId) {
      setCatalogue(initialProducts)
      return
    }
    let active = true
    setCatalogueLoading(true)
    api.products(ownerId).then((result) => {
      if (active) setCatalogue(Array.isArray(result) ? result : [])
    }).catch((loadError) => {
      if (active) setError(loadError.message)
    }).finally(() => {
      if (active) setCatalogueLoading(false)
    })
    return () => { active = false }
  }, [ownerId])

  function addSelectedProduct() {
    const product = catalogue.find((item) => String(item.id) === selectedProductId)
    if (!product) return
    setItems((current) => {
      const existing = current.find((item) => String(item.productId) === String(product.id))
      if (existing) return current.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item)
      return [...current, { productId: product.id, productName: product.name, unitPrice: Number(product.price), quantity: 1 }]
    })
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!items.length) {
      setError('Ajoutez au moins un produit à la commande.')
      return
    }
    setSaving(true)
    try {
      await onSave({ ...form, status: 'dashboard', totalAmount: total, items, ...(ownerId ? { ownerId: Number(ownerId) } : {}) })
    } catch (saveError) {
      setError(saveError.message)
      setSaving(false)
    }
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="product-dialog order-dialog" role="dialog" aria-modal="true" aria-labelledby="new-order-title"><div className="dialog-heading"><div><span className="panel-overline">VENTES</span><h2 id="new-order-title">Nouvelle commande</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div><form onSubmit={submit}>{owners.length > 0 && <label>Équipe concernée<select required value={ownerId} onChange={(event) => { setOwnerId(event.target.value); setItems([]) }}>{owners.map((owner) => <option value={String(owner.owner_user_id)} key={owner.id}>{owner.nickname || owner.owner_name || owner.owner_email}</option>)}</select></label>}<div className="dialog-fields"><label>Nom du client<input required maxLength="180" value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} /></label><label>Téléphone<input required type="tel" value={form.clientPhone} onChange={(event) => setForm({ ...form, clientPhone: event.target.value })} /></label></div><label>Adresse de livraison<input required maxLength="500" value={form.clientAddress} onChange={(event) => setForm({ ...form, clientAddress: event.target.value })} /></label><label>Notes<textarea rows="2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label><div className="order-item-picker"><label>Ajouter un produit<select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} disabled={catalogueLoading}><option value="">{catalogueLoading ? 'Chargement du catalogue…' : 'Sélectionner un produit'}</option>{catalogue.map((product) => <option value={String(product.id)} key={product.id}>{product.name} · {formatMoney(product.price)}</option>)}</select></label><button className="button button-quiet" type="button" onClick={addSelectedProduct} disabled={!selectedProductId}>Ajouter</button></div>{items.length > 0 && <div className="order-item-list">{items.map((item) => <div className="order-item-row" key={item.productId}><span><strong>{item.productName}</strong><small>{formatMoney(item.unitPrice)} × {item.quantity}</small></span><div><button type="button" className="icon-button" aria-label={`Retirer une unité de ${item.productName}`} onClick={() => setItems((current) => current.flatMap((line) => line.productId === item.productId ? (line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : []) : [line]))}>−</button><button type="button" className="icon-button" aria-label={`Ajouter une unité de ${item.productName}`} onClick={() => setItems((current) => current.map((line) => line.productId === item.productId ? { ...line, quantity: line.quantity + 1 } : line))}>+</button></div></div>)}</div>}<div className="order-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Annuler</button><button className="button button-primary" disabled={saving || catalogue.length === 0 || catalogueLoading}>{saving ? 'Création…' : 'Créer la commande'}</button></div></form></section></div>
}

function ShopifyConnectDialog({ onClose, onConnect }) {
  const [shop, setShop] = useState('')
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setConnecting(true)
    try {
      await onConnect(shop.trim())
    } catch (connectError) {
      setError(connectError.message)
      setConnecting(false)
    }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="product-dialog shopify-dialog" role="dialog" aria-modal="true" aria-labelledby="shopify-dialog-title"><div className="dialog-heading"><div><span className="panel-overline">CONNEXION OFFICIELLE</span><h2 id="shopify-dialog-title">Ajouter une boutique Shopify</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div><p className="shopify-dialog-copy">Entrez le nom de domaine Shopify. Vous serez redirigé vers Shopify pour autoriser Sellmaster.</p><form onSubmit={submit}><label>Domaine de la boutique<div className="shop-domain-input"><input required autoFocus pattern="[a-zA-Z0-9-]+(\\.myshopify\\.com)?" value={shop} onChange={(event) => setShop(event.target.value)} placeholder="ma-boutique ou ma-boutique.myshopify.com" /><span>.myshopify.com</span></div></label>{error && <div className="form-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={connecting}>Annuler</button><button className="button button-primary" disabled={connecting}><ExternalLink size={15} />{connecting ? 'Connexion…' : 'Continuer vers Shopify'}</button></div></form></section></div>
}

function ShopifyStoresView({ stores, loading, error, notice, busyStoreId, onRefresh, onConnect, onSyncOrders, onSyncProducts, onDelete }) {
  return <div className="shopify-view"><section className="shopify-intro"><div className="shopify-intro-mark"><ShoppingBag size={23} /></div><div><span className="panel-overline">INTÉGRATION E-COMMERCE</span><h2>Vos boutiques Shopify</h2><p>Centralisez les commandes et les produits de vos boutiques connectées.</p></div><div className="shopify-intro-actions"><button className="button button-quiet" onClick={onRefresh}><RefreshCw size={15} /> Actualiser</button><button className="button button-primary" onClick={onConnect}><Link2 size={16} /> Connecter Shopify</button></div></section>
    {notice && <div className={`shopify-notice ${notice.type}`} role="status">{notice.message}</div>}{error && <div className="api-alert" role="alert"><Activity size={16} /><span>{error}</span><button onClick={onRefresh}>Réessayer</button></div>}
    {loading ? <div className="loading-area"><span className="loader" />Chargement des boutiques…</div> : stores.length === 0 ? <section className="shopify-empty"><div className="shopify-empty-icon"><Store size={26} /></div><h3>Aucune boutique connectée</h3><p>Connectez votre boutique pour synchroniser les commandes et les produits Shopify dans Sellmaster.</p><button className="button button-primary" onClick={onConnect}><Link2 size={16} /> Connecter une boutique</button></section> : <section className="store-grid">{stores.map((store) => { const active = store.is_active === true || store.is_active === 1 || store.is_active === '1' || store.is_active === 'true'; const busy = busyStoreId === store.id; return <article className="store-card" key={store.id}><div className="store-card-head"><span className="store-logo"><ShoppingBag size={21} /></span><span className={`store-status ${active ? 'connected' : 'inactive'}`}><i />{active ? 'Connectée' : 'Inactive'}</span><button className="icon-button store-delete" onClick={() => onDelete(store)} aria-label={`Déconnecter ${store.shop_name}`} title="Déconnecter la boutique" disabled={busy}><Trash2 size={16} /></button></div><h3>{store.shop_name}</h3><p className="store-id">Boutique #{store.id}</p><div className="store-meta"><span>Connectée le</span><strong>{formatDate(store.connected_at)}</strong></div><div className="store-meta"><span>Dernière synchronisation</span><strong>{store.last_sync ? formatDate(store.last_sync) : 'Jamais'}</strong></div><div className="store-actions"><button className="button button-quiet" disabled={busy} onClick={() => onSyncOrders(store)}><RefreshCw size={14} />{busy ? 'Synchronisation…' : 'Commandes'}</button><button className="button button-quiet" disabled={busy} onClick={() => onSyncProducts(store)}><Package size={14} />Produits</button></div></article>})}</section>}
  </div>
}

function InviteTeamMemberDialog({ onClose, onInvite, onSearchUsers }) {
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', role: 'closer' })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [existingUser, setExistingUser] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function searchUsers() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setError('')
    try {
      const users = await onSearchUsers(searchQuery.trim(), form.role)
      setSearchResults(users)
    } catch (searchError) {
      setError(searchError.message)
    } finally {
      setSearching(false)
    }
  }
  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onInvite({
        email: form.email.trim(),
        password: existingUser ? undefined : form.password || undefined,
        fullName: form.fullName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: form.role,
      })
    } catch (inviteError) {
      setError(inviteError.message)
      setSaving(false)
    }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="product-dialog invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-member-title"><div className="dialog-heading"><div><span className="panel-overline">ÉQUIPE SELLMASTER</span><h2 id="invite-member-title">Ajouter un membre</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div><p className="invite-description">Invitez un compte existant ou créez un accès pour une nouvelle personne.</p><div className="existing-user-search"><label>Rechercher un compte existant<input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Nom, e-mail ou téléphone" /></label><button type="button" className="button button-quiet" onClick={searchUsers} disabled={searching || !searchQuery.trim()}><Search size={15} />{searching ? 'Recherche…' : 'Rechercher'}</button></div>{searchResults.length > 0 && <div className="existing-user-results">{searchResults.map((user) => <button type="button" className="existing-user-result" key={user.id} onClick={() => { setExistingUser(true); setForm({ ...form, email: user.email || '', fullName: user.full_name || '', phone: user.phone || '', password: '' }); setSearchResults([]) }}><span><strong>{user.full_name || user.email}</strong><small>{user.email}{user.phone ? ` · ${user.phone}` : ''}</small></span><span className="text-button">Sélectionner</span></button>)}</div>}<form onSubmit={submit}><label>Adresse e-mail<input type="email" autoComplete="email" required value={form.email} onChange={(event) => { setExistingUser(false); setForm({ ...form, email: event.target.value }) }} placeholder="membre@exemple.com" /></label><label>Nom complet<input autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nom du membre" /></label><div className="invite-fields"><label>Rôle<select value={form.role} onChange={(event) => { setForm({ ...form, role: event.target.value }); setExistingUser(false); setSearchResults([]) }}><option value="manager">Manager</option><option value="closer">Closer</option><option value="courier">Livreur</option></select></label><label>Téléphone<input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Optionnel" /></label></div>{!existingUser && <label>Mot de passe temporaire<input type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Requis si le compte n’existe pas" /></label>}{existingUser && <p className="existing-user-selected">Compte existant sélectionné. Aucun mot de passe ne sera modifié.</p>}{error && <div className="form-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Annuler</button><button className="button button-primary" disabled={saving || !form.email.trim() || (!existingUser && !form.password)}>{saving ? 'Ajout…' : 'Ajouter à l’équipe'}</button></div></form></section></div>
}

  function getVisibleTeamMembers(members, isMemberView) {
    return isMemberView ? members.filter((member) => member.status !== 'rejected') : members
  }

  function TeamView({ members, loading, error, isMemberView, canInvite, canEditCommission, acceptingId, onAccept, onInvite, onRefresh, onUpdateMyTeam, onUpdateCommission }) {
    const roleLabels = { owner: 'Propriétaire', manager: 'Manager', closer: 'Closer', courier: 'Livreur' }
    const statusLabels = { active: 'Actif', pending: 'En attente', rejected: 'Refusé' }
    const visibleMembers = getVisibleTeamMembers(members, isMemberView)
    const nameFor = (member) => isMemberView
      ? member.nickname || member.owner_name || member.owner_email || 'Propriétaire'
      : member.full_name || member.email || 'Membre'
    const emailFor = (member) => isMemberView ? member.owner_email : member.email

    return (
      <div className="team-view">
        <section className="content-panel full-table-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-overline">ESPACE DE TRAVAIL</span>
              <h2>{isMemberView ? 'Mes équipes' : 'Membres et invitations'} <span className="title-count">{numberFormat.format(visibleMembers.length)}</span></h2>
            </div>
            <div className="team-heading-actions">
              {canInvite && <button className="button button-primary" onClick={onInvite}><Users size={15} /> Ajouter un membre</button>}
              <button className="button button-quiet" onClick={onRefresh}><RefreshCw size={15} /> Actualiser</button>
            </div>
          </div>
          {error && <div className="api-alert" role="alert"><Activity size={16} /><span>{error}</span><button onClick={onRefresh}>Réessayer</button></div>}
          {loading ? <div className="loading-area"><span className="loader" />Chargement de l’équipe…</div> : visibleMembers.length === 0 ? (
            <div className="empty-state"><Users size={25} /><strong>{isMemberView ? 'Aucune équipe associée' : 'Aucun membre actif'}</strong><span>{isMemberView ? 'Les invitations et équipes qui vous concernent apparaîtront ici.' : 'Ajoutez un membre pour lui envoyer une invitation Sellmaster.'}</span></div>
          ) : (
            <div className="table-scroll">
              <table className="data-table team-table">
                <thead><tr><th>{isMemberView ? 'Propriétaire' : 'Membre'}</th><th>Rôle</th><th>Statut</th><th>Disponibilité</th><th>Depuis</th>{isMemberView && <th>Action</th>}{!isMemberView && canEditCommission && <th>Commission closer</th>}</tr></thead>
                <tbody>{visibleMembers.map((member) => {
                  const working = member.is_working === true || member.is_working === 1 || member.is_working === '1'
                  const status = String(member.status || 'active').toLowerCase()
                  const roleName = member.role_name || member.roles?.find((role) => role !== 'owner') || 'Membre'
                  return (
                    <tr key={member.id}>
                      <td><span className="team-person"><span className="avatar">{nameFor(member).slice(0, 1).toUpperCase()}</span><span><strong>{nameFor(member)}</strong><small className="secondary-line">{emailFor(member) || ''}</small>{isMemberView && status === 'active' && <button className="text-button nickname-edit" onClick={() => { const nickname = window.prompt('Nom de cette équipe', member.nickname || ''); if (nickname !== null) onUpdateMyTeam(member.id, { nickname }) }}>Modifier le nom</button>}</span></span></td>
                      <td><span className="team-role">{roleLabels[roleName] || roleName}</span></td>
                      <td><span className={`team-status status-${status}`}>{statusLabels[status] || status}</span></td>
                      <td>{isMemberView && status === 'active' ? <label className="availability-control"><input type="checkbox" checked={working} onChange={(event) => onUpdateMyTeam(member.id, { is_working: event.target.checked })} /> Disponible</label> : <span className={`working-state ${working ? 'working' : 'not-working'}`}><i />{status === 'pending' ? 'Invitation reçue' : working ? 'Disponible' : 'Inactif'}</span>}</td>
                      <td className="date-cell">{formatDate(member.created_at)}</td>
                      {isMemberView && <td>{status === 'pending' ? <button className="button button-primary accept-invitation-button" disabled={acceptingId === member.id} onClick={() => onAccept(member)}>{acceptingId === member.id ? 'Confirmation…' : 'Accepter'}</button> : <span className="accepted-label">Confirmée</span>}</td>}
                      {!isMemberView && canEditCommission && <td>{roleName === 'closer' ? <CommissionEditor member={member} onSave={onUpdateCommission} /> : '—'}</td>}
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    )
}

