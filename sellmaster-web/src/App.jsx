import { useCallback, useEffect, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Boxes, ChevronDown, CircleHelp,
  ClipboardList, Command, ExternalLink, LayoutDashboard, Link2, LogOut, MoreHorizontal, Package, Pencil,
  RefreshCw, Search, Settings2, ShieldCheck, ShoppingBag, Store, Trash2, Truck, Users,
} from 'lucide-react'
import { api, authToken } from './api'
import LandingPage from './LandingPage'
import ProductImportView from './ProductImportView'
import { canEditProducts as canEditProductsForRole, canEditTeamCommissions, canInviteTeamMembers, canManageProducts, filterOrdersForRole, getAllowedOrderStatuses, getAvailablePages, hasAnyRole, isTeamMemberRole, normalizeRoles, sortOrdersNewestFirst } from './roleRules'
import './App.css'
import './theme.css'
import './notifications.css'
import './shopify.css'
import './team.css'
import './product-import.css'
import './responsive.css'

const baseNavItems = [
  { id: 'overview', label: 'Vue d’ensemble', icon: LayoutDashboard },
  { id: 'orders', label: 'Commandes', icon: ClipboardList },
  { id: 'products', label: 'Produits', icon: Package },
  { id: 'shopify', label: 'Boutiques Shopify', icon: ShoppingBag },
  { id: 'team', label: 'Équipe', icon: Users },
]
const numberFormat = new Intl.NumberFormat('fr-FR')
const currencyFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })
const formatMoney = (value) => Number.isFinite(Number(value)) ? `${currencyFormat.format(Number(value))} FCFA` : '—'
const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}
const displayName = (user) => user?.full_name?.trim() || user?.email?.split('@')[0] || 'Utilisateur'

function LoginScreen({ onLogin, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isRegistering = mode === 'register'
  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegistering && password !== passwordConfirmation) {
        throw new Error('Les deux mots de passe ne correspondent pas.')
      }
      const result = isRegistering
        ? await api.register({ email: email.trim(), password, fullName: fullName.trim(), phone: phone.trim() || undefined, role: 'owner' })
        : await api.login(email.trim(), password)
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
        <a className="brand" href="#app"><span className="brand-symbol">S</span><span>SELLMASTER</span></a>
        <div className="auth-story"><span className="overline">VOTRE COMMERCE, EN MOUVEMENT</span><h1>Chaque commande mérite un meilleur suivi.</h1><p>Retrouvez vos ventes, produits et opérations dans un espace de travail pensé pour les e-commerçants.</p><div className="story-rule"><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /></div><div className="story-caption"><Activity size={17} /> Votre activité, réunie au même endroit</div></div>
        <div className="auth-panel-foot"><ShieldCheck size={15} /> Connexion sécurisée à votre espace Sellmaster</div>
      </section>
      <section className="auth-form-panel">
        <form className={`login-form ${isRegistering ? 'register-form' : ''}`} onSubmit={submit}>
          <div className="mobile-brand brand"><img className="brand-symbol" src="/sellmaster-mark.svg" alt="" /><span>SELLMASTER</span></div><span className="overline">ESPACE E-COMMERÇANT</span><h2>{isRegistering ? 'Créez votre espace.' : 'Content de vous revoir.'}</h2><p>{isRegistering ? 'Quelques informations pour commencer avec Sellmaster.' : 'Connectez-vous pour accéder à votre activité.'}</p>
          {isRegistering && <>
            <label htmlFor="full-name">Nom complet</label><input id="full-name" type="text" autoComplete="name" required maxLength="255" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Votre nom" />
          </>}
          <label htmlFor="email">Adresse e-mail</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="vous@entreprise.com" />
          {isRegistering && <>
            <label htmlFor="phone">Téléphone <span className="optional-label">Facultatif</span></label><input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+221…" />
          </>}
          <div className="password-label"><label htmlFor="password">Mot de passe</label>{!isRegistering && <a href="mailto:support@sellmaster.app">Besoin d’aide ?</a>}</div><input id="password" type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} minLength={isRegistering ? 8 : undefined} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isRegistering ? '8 caractères minimum' : 'Votre mot de passe'} />
          {isRegistering && <><label htmlFor="password-confirmation">Confirmer le mot de passe</label><input id="password-confirmation" type="password" autoComplete="new-password" minLength="8" required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Saisissez-le à nouveau" /></>}
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button button-primary login-submit" disabled={loading}>{loading ? (isRegistering ? 'Création du compte…' : 'Connexion en cours…') : (isRegistering ? 'Créer mon compte' : 'Se connecter')}</button>
          <p className="auth-switch">{isRegistering ? 'Vous avez déjà un compte ?' : 'Pas encore de compte ?'} <button type="button" onClick={() => { setMode(isRegistering ? 'login' : 'register'); setError('') }}>{isRegistering ? 'Se connecter' : 'Créer un compte'}</button></p>
          {!isRegistering && <div className="login-note"><ShieldCheck size={15} /> Identifiants transmis au backend Sellmaster.</div>}
        </form><div className="auth-copyright">© 2026 Sellmaster</div>
      </section>
    </main>
  )
}

function Sidebar({ active, onNavigate, user, onLogout, navItems, mobileNavItems }) {
  return (
    <aside className="sidebar">
      <a className="brand sidebar-brand" href="#app"><span className="brand-symbol">S</span><span>SELLMASTER</span></a>
      <div className="workspace-select"><span className="store-icon"><Store size={17} /></span><span className="workspace-text"><strong>Ma boutique</strong><small>Espace principal</small></span><ChevronDown size={15} /></div>
      <span className="nav-caption">ESPACE DE TRAVAIL</span>
      <nav className="side-nav desktop-side-nav" aria-label="Navigation principale">{navItems.map(({ id, label, icon: Icon }) => <button className={`nav-link ${active === id ? 'selected' : ''}`} key={id} onClick={() => onNavigate(id)}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{id === 'orders' && <span className="nav-count">•</span>}</button>)}</nav>
      <nav className="side-nav mobile-side-nav" aria-label="Navigation principale mobile" style={{ '--mobile-destination-count': mobileNavItems.length }}>{mobileNavItems.map(({ id, label, icon: Icon }) => <button className={`nav-link ${active === id ? 'selected' : ''}`} key={id} onClick={() => onNavigate(id)} aria-current={active === id ? 'page' : undefined}><Icon size={20} strokeWidth={1.8} /><span>{label}</span></button>)}</nav>
      <span className="nav-caption tools-caption">OUTILS</span>
      <div className="side-tools"><button className="nav-link disabled-link" title="Bientôt disponible"><Truck size={18} /><span>Équipe livraison</span></button></div>
      <div className="sidebar-bottom"><div className="help-block"><span className="help-icon"><CircleHelp size={17} /></span><div><strong>Besoin d’aide ?</strong><small>Notre équipe est là.</small></div><a href="mailto:support@sellmaster.app" aria-label="Contacter le support">↗</a></div><div className="profile-row"><span className="avatar">{displayName(user).slice(0, 1).toUpperCase()}</span><span className="profile-meta"><strong>{displayName(user)}</strong><small>{user?.email || ''}</small></span><button className="icon-button logout-button" onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17} /></button></div></div>
    </aside>
  )
}

function MoreView({ user, canAccessShopify, onNavigate, onLogout }) {
  const roles = normalizeRoles(user?.roles || user?.role || [])
  const roleLabels = { owner: 'Propriétaire', manager: 'Manager', closer: 'Closer', courier: 'Livreur' }
  const roleLabel = roles.map((role) => roleLabels[role] || role).join(' · ') || 'Compte Sellmaster'

  return (
    <div className="more-view">
      <section className="content-panel more-account">
        <span className="avatar large-avatar">{displayName(user).slice(0, 1).toUpperCase()}</span>
        <span><strong>{displayName(user)}</strong><small>{user?.email || ''}</small><small>{roleLabel}</small></span>
      </section>
      <nav className="more-links" aria-label="Autres destinations">
        {canAccessShopify && <button type="button" className="more-link" onClick={() => onNavigate('shopify')}><span className="more-link-icon"><ShoppingBag size={18} /></span><span><strong>Boutiques Shopify</strong><small>Connexions et synchronisations</small></span><ChevronDown className="more-link-arrow" size={16} /></button>}
        <a className="more-link" href="mailto:support@sellmaster.app"><span className="more-link-icon"><CircleHelp size={18} /></span><span><strong>Support</strong><small>Contacter l’équipe Sellmaster</small></span><ExternalLink className="more-link-arrow" size={15} /></a>
        <button type="button" className="more-link more-logout" onClick={onLogout}><span className="more-link-icon"><LogOut size={18} /></span><span><strong>Se déconnecter</strong><small>Fermer cette session</small></span></button>
      </nav>
    </div>
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

function OrdersTable({ orders, compact = false, onStatusChange, allowedStatuses, updatingOrderId, isCourier, canAssign, couriersByOwner = {}, onAssign, assigningOrderId }) {
  if (!orders.length) return <div className="empty-state"><ClipboardList size={24} /><strong>Aucune commande pour le moment</strong><span>Les commandes reçues apparaîtront ici.</span></div>
  const visibleOrders = orders.slice(0, compact ? 5 : undefined)
  return <>
    <div className="table-scroll orders-table-scroll"><table className="data-table"><thead><tr><th>Commande</th><th>Client</th><th>Source</th><th>Montant</th><th>Statut</th>{canAssign && <th>Livreur</th>}<th>Date</th></tr></thead><tbody>{visibleOrders.map((order, index) => { const couriers = couriersByOwner[String(order.user_id)] || []; const currentStatus = order.status || 'dashboard'; const canChangeStatus = allowedStatuses.some((status) => status !== currentStatus); return <tr key={order.id ?? `${order.custom_order_number}-${index}`}><td className="order-ref">{order.custom_order_number || `CMD-${order.id}`}</td><td><span className="customer-name">{order.client_name || 'Client'}</span><small className="secondary-line">{order.client_phone || 'Téléphone non renseigné'}</small></td><td><span className="source-label">{order.source === 'shopify' ? <><ShoppingBag size={13} /> Shopify</> : <><Command size={13} /> Sellmaster</>}</span></td><td className="amount-cell">{formatMoney(order.total_amount)}</td><td>{onStatusChange && canChangeStatus ? <select className="status-select" aria-label={`Statut de ${order.custom_order_number || order.id}`} value={currentStatus} disabled={updatingOrderId === order.id} onChange={(event) => onStatusChange(order, event.target.value, isCourier)}><option value={currentStatus} disabled>{{ dashboard: 'En cours', livree: 'Livrée', annulee: 'Annulée', reportee: 'Reportée' }[currentStatus] || currentStatus}</option>{allowedStatuses.filter((status) => status !== currentStatus).map((status) => <option value={status} key={status}>{{ dashboard: 'En cours', livree: 'Livrée', annulee: 'Annulée', reportee: 'Reportée' }[status]}</option>)}</select> : <StatusBadge status={order.status} />}</td>{canAssign && <td><select className="courier-select" aria-label={`Livreur de ${order.custom_order_number || order.id}`} value={order.assigned_to == null ? '' : String(order.assigned_to)} disabled={assigningOrderId === order.id || couriers.length === 0} onChange={(event) => { if (event.target.value) onAssign(order, event.target.value) }}><option value="">{couriers.length ? 'Non assignée' : 'Aucun livreur éligible'}</option>{order.assigned_to != null && !couriers.some((courier) => String(courier.member_user_id) === String(order.assigned_to)) && <option value={String(order.assigned_to)}>Livreur actuel</option>}{couriers.map((courier) => <option value={String(courier.member_user_id)} key={courier.member_user_id}>{courier.full_name || courier.email || `Livreur #${courier.member_user_id}`}</option>)}</select></td>}<td className="date-cell">{formatDate(order.created_at)}</td></tr> })}</tbody></table></div>
    <div className="orders-mobile-list" aria-label="Liste des commandes">
      {visibleOrders.map((order, index) => {
        const couriers = couriersByOwner[String(order.user_id)] || []
        const number = order.custom_order_number || `CMD-${order.id}`
        return <article className="orders-mobile-card" key={order.id ?? `${number}-${index}`}>
          <div className="orders-mobile-card-head"><div><strong className="order-ref">{number}</strong><span className="source-label">{order.source === 'shopify' ? <><ShoppingBag size={13} /> Shopify</> : <><Command size={13} /> Sellmaster</>}</span></div><strong className="orders-mobile-amount">{formatMoney(order.total_amount)}</strong></div>
          <div className="orders-mobile-client"><strong>{order.client_name || 'Client'}</strong><small>{order.client_phone || 'Téléphone non renseigné'}</small></div>
          <div className="orders-mobile-card-controls">{onStatusChange && allowedStatuses.some((status) => status !== (order.status || 'dashboard')) ? <select className="status-select" aria-label={`Statut de ${number}`} value={order.status || 'dashboard'} disabled={updatingOrderId === order.id} onChange={(event) => onStatusChange(order, event.target.value, isCourier)}><option value={order.status || 'dashboard'} disabled>{({ dashboard: 'En cours', livree: 'Livrée', annulee: 'Annulée', reportee: 'Reportée' })[order.status || 'dashboard'] || order.status}</option>{allowedStatuses.filter((status) => status !== (order.status || 'dashboard')).map((status) => <option value={status} key={status}>{{ dashboard: 'En cours', livree: 'Livrée', annulee: 'Annulée', reportee: 'Reportée' }[status]}</option>)}</select> : <StatusBadge status={order.status} />}{canAssign && <select className="courier-select" aria-label={`Livreur de ${number}`} value={order.assigned_to == null ? '' : String(order.assigned_to)} disabled={assigningOrderId === order.id || couriers.length === 0} onChange={(event) => { if (event.target.value) onAssign(order, event.target.value) }}><option value="">{couriers.length ? 'Non assignée' : 'Aucun livreur'}</option>{couriers.map((courier) => <option value={String(courier.member_user_id)} key={courier.member_user_id}>{courier.full_name || courier.email || `Livreur #${courier.member_user_id}`}</option>)}</select>}</div>
          <div className="orders-mobile-card-foot"><span>{formatDate(order.created_at)}</span></div>
        </article>
      })}
    </div>
  </>
}

function ProductsTable({ products, onEdit, canEdit }) {
  if (!products.length) return <div className="empty-state"><Package size={24} /><strong>Votre catalogue est vide</strong><span>Les produits de votre boutique apparaîtront ici.</span></div>
  return <>
    <div className="table-scroll products-table-scroll"><table className="data-table"><thead><tr><th>Produit</th><th>Prix</th><th>Coût</th><th>Stock</th><th>Créé le</th>{canEdit && <th><span className="sr-only">Actions</span></th>}</tr></thead><tbody>{products.map((product, index) => <tr key={product.id ?? index}><td><span className="product-name"><span className="product-thumb">{product.image_url ? <img src={product.image_url} alt="" /> : <Boxes size={17} />}</span><span>{product.name || 'Produit sans nom'}<small className="secondary-line">{product.description || 'Aucune description'}</small></span></span></td><td className="amount-cell">{formatMoney(product.price)}</td><td>{product.cost_price == null ? '—' : formatMoney(product.cost_price)}</td><td>{product.stock ?? '—'}</td><td className="date-cell">{formatDate(product.created_at)}</td>{canEdit && <td><button className="icon-button edit-product-button" onClick={() => onEdit(product)} aria-label={`Modifier ${product.name}`} title="Modifier le produit"><Pencil size={15} /></button></td>}</tr>)}</tbody></table></div>
    <div className="products-mobile-list" aria-label="Liste des produits">
      {products.map((product, index) => <article className="product-mobile-row" key={product.id ?? index}>
        <span className="product-mobile-thumb">{product.image_url ? <img src={product.image_url} alt="" loading="lazy" /> : <Boxes size={20} />}</span>
        <span className="product-mobile-row-name"><strong>{product.name || 'Produit sans nom'}</strong><small>{product.description || 'Aucune description'}</small><span className="product-mobile-row-meta"><b className="product-mobile-price">{formatMoney(product.price)}</b><span>Stock : {product.stock ?? '—'}</span></span></span>
        {canEdit && <button className="icon-button edit-product-button" onClick={() => onEdit(product)} aria-label={`Modifier ${product.name}`} title="Modifier le produit"><Pencil size={15} /></button>}
      </article>)}
    </div>
  </>
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
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="new-product-title"><div className="dialog-heading"><div><span className="panel-overline">CATALOGUE</span><h2 id="new-product-title">{title}</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div><form onSubmit={submit}><label>Nom du produit<input required maxLength="180" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Description<textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="dialog-fields"><label>Prix de vente (FCFA)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Coût (FCFA)<input type="number" min="0" step="0.01" value={form.cost_price} onChange={(event) => setForm({ ...form, cost_price: event.target.value })} /></label><label>Stock<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label></div>{error && <div className="form-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Annuler</button><button className="button button-primary" disabled={saving}>{saving ? 'Enregistrement…' : product ? 'Enregistrer les modifications' : 'Créer le produit'}</button></div></form></section></div>
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

function InviteTeamMemberDialog({ onClose, onInvite }) {
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', role: 'closer' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function submit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onInvite({
        email: form.email.trim(),
        password: form.password || undefined,
        fullName: form.fullName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        role: form.role,
      })
    } catch (inviteError) {
      setError(inviteError.message)
      setSaving(false)
    }
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="product-dialog invite-dialog" role="dialog" aria-modal="true" aria-labelledby="invite-member-title"><div className="dialog-heading"><div><span className="panel-overline">ÉQUIPE SELLMASTER</span><h2 id="invite-member-title">Ajouter un membre</h2></div><button type="button" className="icon-button" onClick={onClose} aria-label="Fermer">×</button></div><p className="invite-description">Un compte existant recevra une invitation dans Sellmaster. Pour un nouveau compte, indiquez un mot de passe temporaire à transmettre au membre.</p><form onSubmit={submit}><label>Adresse e-mail<input type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="membre@exemple.com" /></label><label>Nom complet<input autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nom du membre" /></label><div className="invite-fields"><label>Rôle<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="manager">Manager</option><option value="closer">Closer</option><option value="courier">Livreur</option></select></label><label>Téléphone<input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Optionnel" /></label></div><label>Mot de passe temporaire<input type="password" autoComplete="new-password" minLength="8" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Requis seulement si le compte n’existe pas" /></label>{error && <div className="form-error" role="alert">{error}</div>}<div className="dialog-actions"><button type="button" className="button button-quiet" onClick={onClose} disabled={saving}>Annuler</button><button className="button button-primary" disabled={saving}>{saving ? 'Ajout…' : 'Ajouter à l’équipe'}</button></div></form></section></div>
}

function getVisibleTeamMembers(members, isMemberView) {
  return isMemberView ? (members || []).filter((member) => member.status !== 'rejected') : (members || [])
}

async function fetchTeamMembers(isMemberView, isTeamOwner) {
  if (!authToken.get()) return []
  if (isMemberView) {
    const result = await api.myTeams()
    return Array.isArray(result.memberships) ? result.memberships : []
  }

  const [membersResult, usersResult] = await Promise.all([
    api.teamMembers(isTeamOwner),
    api.adminUsers(),
  ])
  const userByMembershipId = new Map(
    (Array.isArray(usersResult?.users) ? usersResult.users : []).map((user) => [Number(user.membership_id || user.id), user])
  )
  return (Array.isArray(membersResult?.members) ? membersResult.members : []).map((member) => {
    const membershipId = Number(member.id)
    const memberUser = userByMembershipId.get(membershipId) || userByMembershipId.get(Number(member.member_user_id)) || {}
    return {
      ...member,
      ...memberUser,
      id: membershipId,
      membership_id: membershipId,
      full_name: member.full_name || memberUser.full_name || memberUser.email?.split('@')[0] || member.email || 'Membre',
      email: member.email || memberUser.email || '',
      phone: member.phone || memberUser.phone || '',
      commission_amount: member.commission_amount ?? memberUser.commission_amount ?? 0,
      commission_type: member.commission_type || memberUser.commission_type || 'fixed_amount',
    }
  })
}

function CommissionEditor({ member, onSave }) {
  const [amount, setAmount] = useState(String(member?.commission_amount ?? 0))
  const [commissionType, setCommissionType] = useState(member?.commission_type || 'fixed_amount')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave(member.id, {
        commission_amount: Number(amount),
        commission_type: commissionType,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="commission-editor" onSubmit={submit}>
      <div className="commission-inline">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={`Commission du membre ${member.full_name || member.email || 'membre'}`}
        />
        <select value={commissionType} onChange={(event) => setCommissionType(event.target.value)} aria-label="Type de commission">
          <option value="fixed_amount">FCFA fixe</option>
          <option value="percentage">%</option>
        </select>
      </div>
      <button className="button button-quiet" type="submit" disabled={saving}>
        {saving ? '…' : 'Enregistrer'}
      </button>
    </form>
  )
}

function TeamMemberRow({ member, isMemberView, canEditCommission, acceptingId, onAccept, onUpdateMyTeam, onUpdateCommission }) {
  const working = member.is_working === true || member.is_working === 1 || member.is_working === '1'
  const status = String(member.status || 'active').toLowerCase()
  const roleName = member.role_name || member.roles?.find((role) => role !== 'owner') || 'Membre'
  const roleLabels = { owner: 'Propriétaire', manager: 'Manager', closer: 'Closer', courier: 'Livreur' }
  const statusLabels = { active: 'Actif', pending: 'En attente', rejected: 'Refusé' }
  const nameFor = isMemberView
    ? member.nickname || member.owner_name || member.owner_email || 'Propriétaire'
    : member.full_name || member.email || 'Membre'
  const emailFor = isMemberView ? member.owner_email : member.email

  return (
    <tr key={member.id}>
      <td>
        <span className="team-person">
          <span className="avatar">{nameFor.slice(0, 1).toUpperCase()}</span>
          <span>
            <strong>{nameFor}</strong>
            <small className="secondary-line">{emailFor || ''}</small>
            {isMemberView && status === 'active' && (
              <button
                className="text-button nickname-edit"
                onClick={() => {
                  const nickname = window.prompt('Nom de cette équipe', member.nickname || '')
                  if (nickname !== null) onUpdateMyTeam(member.id, { nickname })
                }}
              >
                Modifier le nom
              </button>
            )}
          </span>
        </span>
      </td>
      <td><span className="team-role">{roleLabels[roleName] || roleName}</span></td>
      <td><span className={`team-status status-${status}`}>{statusLabels[status] || status}</span></td>
      <td>
        {isMemberView && status === 'active' ? (
          <label className="availability-control">
            <input
              type="checkbox"
              checked={working}
              onChange={(event) => onUpdateMyTeam(member.id, { is_working: event.target.checked })}
            />
            Disponible
          </label>
        ) : (
          <span className={`working-state ${working ? 'working' : 'not-working'}`}><i />{status === 'pending' ? 'Invitation reçue' : working ? 'Disponible' : 'Inactif'}</span>
        )}
      </td>
      <td className="date-cell">{formatDate(member.created_at)}</td>
      {isMemberView && (
        <td>
          {status === 'pending' ? (
            <button className="button button-primary accept-invitation-button" disabled={acceptingId === member.id} onClick={() => onAccept(member)}>
              {acceptingId === member.id ? 'Confirmation…' : 'Accepter'}
            </button>
          ) : (
            <span className="accepted-label">Confirmée</span>
          )}
        </td>
      )}
      {!isMemberView && canEditCommission && (
        <td>{roleName === 'closer' ? <CommissionEditor member={member} onSave={onUpdateCommission} /> : '—'}</td>
      )}
    </tr>
  )
}

function TeamView({ members, loading, error, isMemberView, canInvite, canEditCommission, acceptingId, onAccept, onInvite, onRefresh, onUpdateMyTeam, onUpdateCommission }) {
  const visibleMembers = getVisibleTeamMembers(members, isMemberView)

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
        {loading ? (
          <div className="loading-area"><span className="loader" />Chargement de l’équipe…</div>
        ) : visibleMembers.length === 0 ? (
          <div className="empty-state"><Users size={25} /><strong>{isMemberView ? 'Aucune équipe associée' : 'Aucun membre actif'}</strong><span>{isMemberView ? 'Les invitations et équipes qui vous concernent apparaîtront ici.' : 'Ajoutez un membre pour lui envoyer une invitation Sellmaster.'}</span></div>
        ) : (
          <div className="table-scroll">
            <table className="data-table team-table">
              <thead>
                <tr>
                  <th>{isMemberView ? 'Propriétaire' : 'Membre'}</th>
                  <th>Rôle</th>
                  <th>Statut</th>
                  <th>Disponibilité</th>
                  <th>Depuis</th>
                  {isMemberView && <th>Action</th>}
                  {!isMemberView && canEditCommission && <th>Commission closer</th>}
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <TeamMemberRow
                    key={member.id}
                    member={member}
                    isMemberView={isMemberView}
                    canEditCommission={canEditCommission}
                    acceptingId={acceptingId}
                    onAccept={onAccept}
                    onUpdateMyTeam={onUpdateMyTeam}
                    onUpdateCommission={onUpdateCommission}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [authenticated, setAuthenticated] = useState(Boolean(authToken.get()))
  const [showLogin, setShowLogin] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.has('login') || params.has('register') || params.has('shopify') || params.has('import')
  })
  const [authMode, setAuthMode] = useState(() => new URLSearchParams(window.location.search).has('register') ? 'register' : 'login')
  const [productImportUrl, setProductImportUrl] = useState(() => new URLSearchParams(window.location.search).get('import') || '')
  const [requestedPage, setActivePage] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('import')) return 'productImport'
    return params.has('shopify') ? 'shopify' : 'overview'
  })
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [catalogTeam, setCatalogTeam] = useState(null)
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [mutationMessage, setMutationMessage] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [stores, setStores] = useState([])
  const [storesLoading, setStoresLoading] = useState(() => new URLSearchParams(window.location.search).has('shopify'))
  const [shopifyError, setShopifyError] = useState('')
  const [shopifyNotice, setShopifyNotice] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const outcome = params.get('shopify')
    if (outcome === 'connected') {
      const store = params.get('store')
      return { type: 'success', message: store ? `Boutique ${store} connectée avec succès.` : 'Boutique Shopify connectée avec succès.' }
    }
    if (outcome === 'cancelled') return { type: 'info', message: 'La connexion Shopify a été annulée.' }
    if (outcome) return { type: 'error', message: 'La connexion Shopify a échoué. Vérifiez la configuration OAuth du backend.' }
    return null
  })
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [busyStoreId, setBusyStoreId] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState('')
  const [acceptingInvitationId, setAcceptingInvitationId] = useState(null)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [couriersByOwner, setCouriersByOwner] = useState({})
  const [courierLoadError, setCourierLoadError] = useState('')
  const [assigningOrderId, setAssigningOrderId] = useState(null)
  const userRoles = normalizeRoles(user?.roles || user?.role || [])
  const roleSignature = userRoles.join('|')
  const isOwnerUser = hasAnyRole(userRoles, 'owner')
  const isCourier = hasAnyRole(userRoles, 'courier')
  const canAccessProducts = canManageProducts(userRoles)
  const canEditProducts = canEditProductsForRole(userRoles)
  const currentUserId = user?.id
  const productOwnerId = !isOwnerUser && String(catalogTeam?.memberId) === String(currentUserId)
    ? catalogTeam.ownerId
    : null
  const canAccessShopify = hasAnyRole(userRoles, 'owner', 'manager')
  const navItems = baseNavItems.filter((item) => {
    if (item.id === 'products') return canAccessProducts
    if (item.id === 'shopify') return canAccessShopify
    return true
  })
  const mobileLabels = { overview: 'Accueil', orders: 'Commandes', products: 'Produits', team: 'Équipe' }
  const mobileNavItems = [
    ...navItems.filter((item) => mobileLabels[item.id]).map((item) => ({ ...item, label: mobileLabels[item.id] })),
    { id: 'more', label: 'Plus', icon: MoreHorizontal },
  ]
  const isTeamMemberView = isTeamMemberRole(userRoles)
  const isTeamOwner = canInviteTeamMembers(userRoles)
  const allowedPages = getAvailablePages(userRoles)
  const activePage = user
    && !allowedPages.includes(requestedPage)
    && !(requestedPage === 'productImport' && canAccessProducts)
    && requestedPage !== 'more'
    ? allowedPages[0] || 'overview'
    : requestedPage
  const canAssignOrders = hasAnyRole(userRoles, 'owner', 'manager', 'closer')
  const allowedOrderStatuses = getAllowedOrderStatuses(userRoles)
  const roleFilteredOrders = sortOrdersNewestFirst(filterOrdersForRole(orders, userRoles, user?.id))
  const [todayKey] = useState(() => new Date().toISOString().slice(0, 10))
  const memberTodayOrders = roleFilteredOrders.filter((order) => String(order.created_at || '').slice(0, 10) === todayKey)
  const memberStats = memberTodayOrders.reduce((summary, order) => {
    summary.total_orders += 1
    if (order.status === 'livree') {
      summary.delivered += 1
      summary.revenue += Number(order.total_amount || 0)
    }
    if (order.status === 'annulee') summary.cancelled += 1
    if (order.status === 'reportee') summary.postponed += 1
    return summary
  }, { total_orders: 0, delivered: 0, cancelled: 0, postponed: 0, revenue: 0 })
  const displayedStats = isTeamMemberView ? memberStats : stats
  const canEditCommission = canEditTeamCommissions(userRoles)

  useEffect(() => {
    if (!authenticated || !currentUserId || isOwnerUser || !canAccessProducts) return undefined
    let active = true
    api.myTeams().then((memberships) => {
      if (!active) return
      const workingTeam = (memberships.memberships || []).find((membership) => {
        const isWorking = membership.is_working === true || membership.is_working === 1 || membership.is_working === '1'
        return membership.status === 'active' && isWorking && Number(membership.owner_user_id) > 0
      })
      setCatalogTeam({ memberId: currentUserId, ownerId: workingTeam ? Number(workingTeam.owner_user_id) : null })
    }).catch(() => {
      if (active) setCatalogTeam({ memberId: currentUserId, ownerId: null })
    })
    return () => { active = false }
  }, [authenticated, currentUserId, isOwnerUser, canAccessProducts, roleSignature])

  async function loadDashboard(quiet = false) {
    if (!authToken.get()) return
    if (quiet) setRefreshing(true)
    const results = await Promise.allSettled([api.profile(), api.dashboardStats(), api.orders(), api.products(productOwnerId), api.notifications()])
    if (results[0].status === 'rejected') { setErrors([results[0].reason.message]); setLoading(false); setRefreshing(false); return }
    setUser(results[0].value.user)
    setStats(results[1].status === 'fulfilled' ? results[1].value : null)
    setOrders(results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [])
    setProducts(results[3].status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value : [])
    if (results[4].status === 'fulfilled') {
      setNotifications(results[4].value.notifications || [])
      setUnreadCount(Number(results[4].value.unreadCount || 0))
    }
    setErrors(results.slice(1).flatMap((result) => result.status === 'rejected' ? [result.reason.message] : []))
    setAuthenticated(true)
    setLoading(false)
    setRefreshing(false)
  }

  const loadStores = useCallback(async () => {
    try {
      const result = await api.shopifyStores()
      setStores(Array.isArray(result.stores) ? result.stores : [])
    } catch (error) {
      setShopifyError(error.message)
    } finally {
      setStoresLoading(false)
    }
  }, [])

  async function loadTeam() {
    if (!authToken.get()) return
    setTeamLoading(true)
    setTeamError('')
    try {
      setTeamMembers(await fetchTeamMembers(isTeamMemberView, isTeamOwner))
    } catch (error) {
      setTeamError(error.message)
    } finally {
      setTeamLoading(false)
    }
  }

  useEffect(() => {
    if (!authenticated) return
    let active = true
    async function loadInitialDashboard() {
      const results = await Promise.allSettled([api.profile(), api.dashboardStats(), api.orders(), api.products(productOwnerId), api.notifications()])
      if (!active) return
      if (results[0].status === 'rejected') {
        setErrors([results[0].reason.message])
        setLoading(false)
        return
      }
      setUser(results[0].value.user)
      setStats(results[1].status === 'fulfilled' ? results[1].value : null)
      setOrders(results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [])
      setProducts(results[3].status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value : [])
      if (results[4].status === 'fulfilled') {
        setNotifications(results[4].value.notifications || [])
        setUnreadCount(Number(results[4].value.unreadCount || 0))
      }
      setErrors(results.slice(1).flatMap((result) => result.status === 'rejected' ? [result.reason.message] : []))
      setLoading(false)
    }
    void loadInitialDashboard()
    return () => { active = false }
  }, [authenticated, productOwnerId])
  useEffect(() => {
    if (!authenticated || activePage !== 'shopify') return
    let active = true
    async function fetchStores() {
      try {
        const result = await api.shopifyStores()
        if (active) {
          setStores(Array.isArray(result.stores) ? result.stores : [])
          setShopifyError('')
        }
      } catch (error) {
        if (active) setShopifyError(error.message)
      } finally {
        if (active) setStoresLoading(false)
      }
    }
    void fetchStores()
    return () => { active = false }
  }, [authenticated, activePage])
  useEffect(() => {
    if (!authenticated || activePage !== 'team') return
    let active = true
    fetchTeamMembers(isTeamMemberView, isTeamOwner)
      .then((members) => { if (active) setTeamMembers(members) })
      .catch((error) => { if (active) setTeamError(error.message) })
      .finally(() => { if (active) setTeamLoading(false) })
    return () => { active = false }
  }, [authenticated, activePage, isTeamMemberView, isTeamOwner])
  useEffect(() => {
    if (!authenticated || !canAssignOrders || orders.length === 0) return
    let active = true
    async function fetchCouriers() {
      const ownerIds = [...new Set(orders.map((order) => Number(order.user_id)).filter((id) => Number.isInteger(id) && id > 0))]
      const results = await Promise.allSettled(ownerIds.map((ownerId) => api.teamMembers({ ownerId })))
      if (!active) return
      const nextCouriers = {}
      const errors = []
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push(result.reason.message)
          return
        }
        nextCouriers[String(ownerIds[index])] = (result.value.members || []).filter((member) => {
          const working = member.is_working === true || member.is_working === 1 || member.is_working === '1'
          return member.role_name === 'courier' && member.status === 'active' && working
        })
      })
      setCouriersByOwner(nextCouriers)
      setCourierLoadError(errors[0] || '')
    }
    void fetchCouriers()
    return () => { active = false }
  }, [authenticated, canAssignOrders, orders])
  useEffect(() => {
    const url = new URL(window.location.href)
    const outcome = url.searchParams.get('shopify')
    if (!outcome) return
    url.searchParams.delete('shopify')
    url.searchParams.delete('store')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])
  useEffect(() => {
    const unauthorized = () => { setAuthenticated(false); setUser(null) }
    window.addEventListener('sellmaster:unauthorized', unauthorized)
    return () => window.removeEventListener('sellmaster:unauthorized', unauthorized)
  }, [])

  function logout() { authToken.clear(); setAuthenticated(false); setUser(null); setStats(null); setOrders([]); setProducts([]); setErrors([]) }
  async function createProduct(product) {
    setMutationMessage('')
    const created = await api.createProduct({ ...product, ...(productOwnerId ? { ownerId: productOwnerId } : {}) })
    setProducts((current) => [created, ...current])
    setProductDialogOpen(false)
    setMutationMessage('Produit créé avec succès.')
  }
  async function saveProduct(productData) {
    setMutationMessage('')
    if (editingProduct) {
      const updated = await api.updateProduct(editingProduct.id, { ...productData, ...(productOwnerId ? { ownerId: productOwnerId } : {}) })
      setProducts((current) => current.map((item) => item.id === editingProduct.id ? { ...item, ...updated } : item))
      setEditingProduct(null)
      setMutationMessage('Produit mis à jour avec succès.')
      return
    }
    await createProduct(productData)
  }
  async function updateOrderStatus(order, status, isCourierAccount) {
    setMutationMessage('')
    if (!allowedOrderStatuses.includes(status)) {
      setMutationMessage('Ce statut n’est pas autorisé pour votre rôle.')
      return
    }
    if (isCourierAccount && Number(order.assigned_to) !== Number(user?.id)) {
      setMutationMessage('Vous ne pouvez mettre à jour que les commandes qui vous sont assignées.')
      return
    }
    let deliveryFee
    if (status === 'livree' && isCourierAccount) {
      const input = window.prompt('Saisissez les frais de livraison (montant positif) :')
      if (input === null) return
      deliveryFee = Number(input)
      if (!Number.isFinite(deliveryFee) || deliveryFee <= 0) {
        setMutationMessage('Les frais de livraison doivent être un montant positif.')
        return
      }
    }
    setUpdatingOrderId(order.id)
    try {
      const updated = await api.updateOrderStatus(order.id, status, deliveryFee)
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...updated } : item))
      setMutationMessage('Statut de commande mis à jour.')
      await loadDashboard(true)
    } catch (error) {
      setMutationMessage(error.message)
    } finally {
      setUpdatingOrderId(null)
    }
  }
  async function assignOrder(order, courierId) {
    setMutationMessage('')
    if (!canAssignOrders) {
      setMutationMessage('Votre rôle ne permet pas d’attribuer des commandes.')
      return
    }
    setAssigningOrderId(order.id)
    try {
      const updated = await api.assignOrder(order.id, courierId, `Assignée depuis le web par ${displayName(user)}`)
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...updated, assigned_to: updated.assigned_to ?? Number(courierId) } : item))
      setMutationMessage(`Commande ${order.custom_order_number || order.id} assignée au livreur.`)
      await loadDashboard(true)
    } catch (error) {
      setMutationMessage(error.message)
    } finally {
      setAssigningOrderId(null)
    }
  }
  async function connectShopify(shop) {
    const result = await api.shopifyAuthStart(shop)
    const authorizationUrl = new URL(result.url)
    if (authorizationUrl.protocol !== 'https:') throw new Error('URL Shopify invalide reçue du serveur.')
    window.location.assign(authorizationUrl.toString())
  }
  async function syncShopifyStore(store, type) {
    setBusyStoreId(store.id)
    setShopifyNotice(null)
    setShopifyError('')
    try {
      const result = type === 'orders' ? await api.syncShopifyOrders(store.id) : await api.syncShopifyProducts(store.id)
      if (!result.success) throw new Error(result.message || 'La synchronisation a échoué.')
      const details = type === 'orders'
        ? ` ${Number(result.savedCount || result.count || 0)} commande(s) enregistrée(s).`
        : ` ${Number(result.created || 0)} créée(s), ${Number(result.updated || 0)} mise(s) à jour.`
      setShopifyNotice({ type: 'success', message: `${type === 'orders' ? 'Commandes' : 'Produits'} synchronisé(e)s depuis ${store.shop_name}.${details}` })
      await loadStores()
      if (type === 'orders') await loadDashboard(true)
    } catch (error) {
      setShopifyNotice({ type: 'error', message: error.message })
    } finally {
      setBusyStoreId(null)
    }
  }
  async function deleteShopifyStore(store) {
    if (!window.confirm(`Déconnecter la boutique ${store.shop_name} de Sellmaster ?`)) return
    setBusyStoreId(store.id)
    setShopifyNotice(null)
    try {
      await api.deleteShopifyStore(store.id)
      setStores((current) => current.filter((item) => item.id !== store.id))
      setShopifyNotice({ type: 'success', message: `${store.shop_name} a été déconnectée.` })
    } catch (error) {
      setShopifyNotice({ type: 'error', message: error.message })
    } finally {
      setBusyStoreId(null)
    }
  }
  async function inviteTeamMember(member) {
    const result = await api.createTeamMember(member)
    setInviteDialogOpen(false)
    setMutationMessage(`${result.user?.email || member.email} ajouté(e) en attente. L’invitation sera visible dans son espace Sellmaster.`)
    try {
      const refreshed = await api.teamMembers(true)
      setTeamMembers(refreshed.members || [])
    } catch (error) {
      setTeamError(`Invitation enregistrée, mais la liste n’a pas pu être actualisée : ${error.message}`)
    }
  }
  async function acceptTeamInvitation(membership) {
    setTeamError('')
    setMutationMessage('')
    setAcceptingInvitationId(membership.id)
    try {
      const result = await api.confirmTeamInvitation(membership.id)
      setTeamMembers((current) => current.map((item) => item.id === membership.id ? { ...item, status: 'active', confirmed_at: new Date().toISOString() } : item))
      setMutationMessage(result.message || 'Invitation confirmée.')
      await loadTeam()
    } catch (error) {
      setTeamError(error.message)
    } finally {
      setAcceptingInvitationId(null)
    }
  }

  async function updateMyTeam(membershipId, changes) {
    try {
      const result = await api.updateMyTeam(membershipId, changes)
      setTeamMembers((current) => current.map((member) => member.id === membershipId ? { ...member, ...result.membership, ...changes } : member))
      setMutationMessage('Mise à jour de l’équipe enregistrée.')
    } catch (error) {
      setTeamError(error.message)
    }
  }

  async function updateCloserCommission(membershipId, changes) {
    try {
      const result = await api.updateCloserCommission(membershipId, changes.commission_amount, changes.commission_type)
      setTeamMembers((current) => current.map((member) => member.id === membershipId ? { ...member, ...result.membership, commission_amount: changes.commission_amount, commission_type: changes.commission_type } : member))
      setMutationMessage('Commission mise à jour.')
    } catch (error) {
      setTeamError(error.message)
    }
  }

  async function toggleNotifications() {
    const willOpen = !notificationOpen
    setNotificationOpen(willOpen)
    if (!willOpen) return
    setNotificationLoading(true)
    setNotificationError('')
    try {
      const result = await api.notifications()
      setNotifications(result.notifications || [])
      setUnreadCount(Number(result.unreadCount || 0))
    } catch (error) {
      setNotificationError(error.message)
    } finally {
      setNotificationLoading(false)
    }
  }
  async function markAllNotificationsRead() {
    setNotificationError('')
    try {
      await api.markNotificationsRead()
      setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      setNotificationError(error.message)
    }
  }
  function clearProductImportParam() {
    const url = new URL(window.location.href)
    url.searchParams.delete('import')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }
  function openProductImport(url = '') {
    setProductImportUrl(url)
    setActivePage('productImport')
    setSearch('')
  }
  function closeProductImport() {
    setProductImportUrl('')
    clearProductImportParam()
    setActivePage('products')
  }
  function navigateToPage(page) {
    setActivePage(page)
    setSearch('')
    if (page === 'shopify') {
      setStoresLoading(true)
      setShopifyError('')
    }
    if (page === 'team') {
      setTeamLoading(true)
      setTeamError('')
    }
  }
  const filteredOrders = roleFilteredOrders.filter((order) => [order.custom_order_number, order.client_name, order.client_phone, order.status].join(' ').toLowerCase().includes(search.toLowerCase()))
  const filteredProducts = products.filter((product) => [product.name, product.description].join(' ').toLowerCase().includes(search.toLowerCase()))
  const pageTitle = activePage === 'orders' ? 'Commandes' : activePage === 'products' ? 'Produits' : activePage === 'productImport' ? 'Importer un produit' : activePage === 'shopify' ? 'Boutiques Shopify' : activePage === 'team' ? 'Équipe' : activePage === 'more' ? 'Plus' : 'Vue d’ensemble'

  if (!authenticated) {
    const openAuth = (mode) => {
      setAuthMode(mode)
      setShowLogin(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('login')
      url.searchParams.delete('register')
      url.searchParams.set(mode === 'register' ? 'register' : 'login', '1')
      window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
    }
    if (!showLogin) return <LandingPage onLogin={() => openAuth('login')} onRegister={() => openAuth('register')} />
    return <LoginScreen key={authMode} initialMode={authMode} onLogin={async (loginUser) => {
      setUser(loginUser)
      setLoading(true)
      setAuthenticated(true)
      setShowLogin(false)
      if (productImportUrl) setActivePage('productImport')
      window.history.replaceState({}, '', window.location.pathname)
    }} />
  }

  return <div className="dashboard-layout">
    <Sidebar active={activePage === 'productImport' ? 'products' : activePage} onNavigate={navigateToPage} user={user} onLogout={logout} navItems={navItems} mobileNavItems={mobileNavItems} />
    <main className="workspace-main">
      <header className="workspace-header"><div className="breadcrumb"><span>Sellmaster</span><span className="crumb-separator">/</span><strong>{pageTitle}</strong></div><div className="header-controls"><div className="connection-indicator"><span /> </div><button className="icon-button notification-button" aria-label={`Notifications${unreadCount ? `, ${unreadCount} non lues` : ''}`} aria-expanded={notificationOpen} onClick={toggleNotifications}><Bell size={18} />{unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button><span className="header-avatar">{displayName(user).slice(0, 1).toUpperCase()}</span></div>
        {notificationOpen && <section className="notification-popover" aria-label="Centre de notifications"><div className="notification-heading"><div><span className="panel-overline">CENTRE DE NOTIFICATIONS</span><h2>Notifications</h2></div><button className="text-button" onClick={markAllNotificationsRead} disabled={unreadCount === 0 || notificationLoading}>Tout lire</button></div>{notificationError && <p className="notification-error" role="alert">{notificationError}</p>}{notificationLoading ? <div className="notification-loading"><span className="loader" />Chargement…</div> : notifications.length === 0 ? <div className="notification-empty">Vous êtes à jour. Aucune notification.</div> : <div className="notification-list">{notifications.map((notification) => <article className={`notification-item ${notification.is_read ? 'read' : 'unread'}`} key={notification.id}><span className={`notification-type type-${notification.type || 'info'}`}><Bell size={15} /></span><div><strong>{notification.title}</strong><p>{notification.message}</p><time>{formatDate(notification.created_at)}</time></div>{!notification.is_read && <span className="unread-indicator" aria-label="Non lue" />}</article>)}</div>}</section>}
      </header>
      <div className="page-content">
        {activePage !== 'more' && <div className="page-heading-row"><div><span className="date-eyebrow">ESPACE DE TRAVAIL</span><h1>{activePage === 'overview' ? `Bonjour, ${displayName(user).split(' ')[0]}` : pageTitle}</h1><p>{activePage === 'overview' ? 'Voici le résumé de votre activité aujourd’hui.' : activePage === 'orders' ? 'Consultez et recherchez toutes les commandes de votre espace.' : activePage === 'products' ? 'Consultez les produits liés à votre catalogue.' : activePage === 'productImport' ? 'Analysez, ajustez et envoyez un produit vers une boutique Shopify.' : activePage === 'shopify' ? 'Gérez les connexions et synchronisations de vos boutiques Shopify.' : isTeamMemberView ? 'Consultez vos affiliations et invitations d’équipe.' : 'Consultez les membres actifs de votre équipe.'}</p></div>{activePage !== 'productImport' && <div className="heading-actions"><button className="button button-quiet" onClick={() => loadDashboard(true)} disabled={refreshing}><RefreshCw size={16} className={refreshing ? 'spin' : ''} /> Actualiser</button>{activePage === 'overview' && <button className="button button-primary" onClick={() => setActivePage('orders')}><ClipboardList size={16} /> Voir les commandes</button>}</div>}</div>}
        {errors.length > 0 && <div className="api-alert" role="status"><Activity size={16} /><span>{errors[0]} Les données correspondantes peuvent être incomplètes.</span><button onClick={() => loadDashboard(true)}>Réessayer</button></div>}
        {courierLoadError && canAssignOrders && ['overview', 'orders'].includes(activePage) && <div className="api-alert" role="status"><Truck size={16} /><span>Impossible de charger les livreurs éligibles : {courierLoadError}</span></div>}
        {mutationMessage && activePage !== 'team' && <div className="mutation-notice" role="status">{mutationMessage}<button className="notice-dismiss" onClick={() => setMutationMessage('')} aria-label="Fermer">×</button></div>}
        {loading && activePage !== 'more' ? <div className="loading-area"><span className="loader" />Chargement des données Sellmaster…</div> : <>
          {activePage === 'overview' && <><section className="metric-grid" aria-label="Statistiques du jour"><MetricCard icon={ClipboardList} label="Commandes aujourd’hui" value={displayedStats ? numberFormat.format(Number(displayedStats.total_orders || 0)) : '—'} note="Total visible aujourd’hui" tone="mint" /><MetricCard icon={ArrowUpRight} label="Chiffre d’affaires livré" value={displayedStats ? formatMoney(displayedStats.revenue) : '—'} note="Commandes livrées aujourd’hui" tone="blue" /><MetricCard icon={Truck} label="Livrées" value={displayedStats ? numberFormat.format(Number(displayedStats.delivered || 0)) : '—'} note="Statut confirmé" tone="lime" /><MetricCard icon={ArrowDownRight} label="Annulées / reportées" value={displayedStats ? numberFormat.format(Number(displayedStats.cancelled || 0) + Number(displayedStats.postponed || 0)) : '—'} note={`${numberFormat.format(Number(displayedStats?.cancelled || 0))} annulée(s) · ${numberFormat.format(Number(displayedStats?.postponed || 0))} reportée(s)`} tone="coral" /></section>
            <section className="content-panel orders-panel"><div className="panel-heading"><div><span className="panel-overline">ACTIVITÉ RÉCENTE</span><h2>Dernières commandes</h2></div><button className="text-button" onClick={() => setActivePage('orders')}>Toutes les commandes <span>→</span></button></div><OrdersTable orders={roleFilteredOrders} compact allowedStatuses={allowedOrderStatuses} onStatusChange={updateOrderStatus} updatingOrderId={updatingOrderId} isCourier={isCourier} canAssign={canAssignOrders} couriersByOwner={couriersByOwner} onAssign={assignOrder} assigningOrderId={assigningOrderId} /></section>
            <section className="bottom-grid">{canAccessProducts && <article className="content-panel inventory-panel"><div className="panel-heading"><div><span className="panel-overline">CATALOGUE</span><h2>Produits</h2></div><button className="icon-button" onClick={() => setActivePage('products')} aria-label="Afficher les produits"><Package size={17} /></button></div><div className="inventory-summary"><span className="inventory-icon"><Boxes size={20} /></span><div><strong>{numberFormat.format(products.length)}</strong><span>produit(s) dans votre catalogue</span></div><button className="inventory-link" onClick={() => setActivePage('products')}>Ouvrir <span>→</span></button></div></article> }<article className="content-panel account-panel"><div className="panel-heading"><div><span className="panel-overline">VOTRE ESPACE</span><h2>Compte</h2></div><Settings2 size={18} /></div><div className="account-row"><span className="avatar large-avatar">{displayName(user).slice(0, 1).toUpperCase()}</span><div><strong>{displayName(user)}</strong><span>{user?.email}</span></div></div><div className="account-license"><ShieldCheck size={16} /><span>Licence</span><strong>{user?.license_key ? 'Active' : user?.trial_used ? 'Essai utilisé' : 'Essai disponible'}</strong></div></article></section></>}
          {activePage === 'orders' && <section className="content-panel full-table-panel"><div className="panel-heading"><div><span className="panel-overline">VENTES</span><h2>{isTeamMemberView ? 'Mes commandes' : 'Toutes les commandes'} <span className="title-count">{numberFormat.format(filteredOrders.length)}</span></h2></div><label className="search-control"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une commande" aria-label="Rechercher une commande" /></label></div><OrdersTable orders={filteredOrders} allowedStatuses={allowedOrderStatuses} onStatusChange={updateOrderStatus} updatingOrderId={updatingOrderId} isCourier={isCourier} canAssign={canAssignOrders} couriersByOwner={couriersByOwner} onAssign={assignOrder} assigningOrderId={assigningOrderId} /></section>}
          {activePage === 'products' && canAccessProducts && <section className="content-panel full-table-panel"><div className="panel-heading"><div><span className="panel-overline">CATALOGUE</span><h2>{canEditProducts ? 'Vos produits' : 'Catalogue produits'} <span className="title-count">{numberFormat.format(products.length)}</span></h2></div><div className="product-heading-actions"><label className="search-control"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un produit" aria-label="Rechercher un produit" /></label>{canEditProducts && <><button className="button button-quiet" onClick={() => openProductImport()}><Link2 size={16} /> Importer depuis une URL</button><button className="button button-primary" onClick={() => { setEditingProduct(null); setProductDialogOpen(true) }}><Package size={16} /> Nouveau produit</button></>}</div></div><ProductsTable products={filteredProducts} canEdit={canEditProducts} onEdit={(product) => setEditingProduct(product)} /></section>}
          {activePage === 'productImport' && canAccessProducts && <ProductImportView key={productImportUrl || 'manual-import'} initialUrl={productImportUrl} onBack={closeProductImport} onImported={(product) => setProducts((current) => [product, ...current.filter((item) => String(item.id) !== String(product.id))])} />}
          {activePage === 'shopify' && canAccessShopify && <ShopifyStoresView stores={stores} loading={storesLoading} error={shopifyError} notice={shopifyNotice} busyStoreId={busyStoreId} onRefresh={() => { setStoresLoading(true); setShopifyError(''); void loadStores() }} onConnect={() => setConnectDialogOpen(true)} onSyncOrders={(store) => syncShopifyStore(store, 'orders')} onSyncProducts={(store) => syncShopifyStore(store, 'products')} onDelete={deleteShopifyStore} />}
          {activePage === 'team' && <>{mutationMessage && <div className="mutation-notice" role="status">{mutationMessage}<button className="notice-dismiss" onClick={() => setMutationMessage('')} aria-label="Fermer">×</button></div>}<TeamView members={teamMembers} loading={teamLoading} error={teamError} isMemberView={isTeamMemberView} canInvite={isTeamOwner} canEditCommission={canEditCommission} acceptingId={acceptingInvitationId} onAccept={acceptTeamInvitation} onInvite={() => setInviteDialogOpen(true)} onRefresh={loadTeam} onUpdateMyTeam={updateMyTeam} onUpdateCommission={updateCloserCommission} /></>}
          {activePage === 'more' && <MoreView user={user} canAccessShopify={canAccessShopify} onNavigate={navigateToPage} onLogout={logout} />}
        </>}
        <footer className="workspace-footer"><span>SELLMASTER WEB</span><span>Gestion e-commerce, sans détour.</span></footer>
      </div>
    </main>
    {(canAccessProducts && (productDialogOpen || editingProduct)) && <CreateProductDialog key={editingProduct?.id || 'new'} product={editingProduct} onClose={() => { setProductDialogOpen(false); setEditingProduct(null) }} onSave={saveProduct} />}
    {connectDialogOpen && <ShopifyConnectDialog onClose={() => setConnectDialogOpen(false)} onConnect={connectShopify} />}
    {inviteDialogOpen && <InviteTeamMemberDialog onClose={() => setInviteDialogOpen(false)} onInvite={inviteTeamMember} onSearchUsers={api.searchUsers} />}
  </div>
}

export default App
