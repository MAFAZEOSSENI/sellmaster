const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'https://sellmaster-1.onrender.com/api').replace(/\/$/, '')
const TOKEN_KEY = 'sellmaster_web_token'

export const authToken = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

async function request(path, options = {}) {
  const token = authToken.get()
  const headers = new Headers(options.headers || {})
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  } catch {
    throw new Error(`Impossible de joindre l'API (${API_BASE}). Vérifiez le serveur et la configuration.`)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) {
      authToken.clear()
      window.dispatchEvent(new Event('sellmaster:unauthorized'))
    }
    throw new Error(data.error || `Erreur API (${response.status})`)
  }
  return data
}

export const api = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  profile: () => request('/auth/profile'),
  dashboardStats: () => request('/orders/stats/dashboard'),
  orders: () => request('/orders'),
  products: () => request('/products'),
  notifications: () => request('/notifications'),
  markNotificationsRead: () => request('/notifications/read-all', { method: 'PATCH' }),
  updateOrderStatus: (id, status, deliveryFee) => request(`/orders/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...(deliveryFee === undefined ? {} : { delivery_fee: deliveryFee }) }),
  }),
  createProduct: (product) => request('/products', {
    method: 'POST',
    body: JSON.stringify(product),
  }),
  updateProduct: (id, product) => request(`/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(product),
  }),
  shopifyStores: () => request('/shopify/stores'),
  shopifyAuthStart: (shop) => request(`/shopify/auth/start?shop=${encodeURIComponent(shop)}`),
  syncShopifyOrders: (storeId) => request(`/shopify/stores/${encodeURIComponent(storeId)}/orders/sync`),
  syncShopifyProducts: (storeId) => request(`/shopify/stores/${encodeURIComponent(storeId)}/products/sync`),
  deleteShopifyStore: (storeId) => request(`/shopify/stores/${encodeURIComponent(storeId)}`, { method: 'DELETE' }),
  teamMembers: (options = {}) => {
    const config = typeof options === 'boolean' ? { includePending: options } : options
    const params = new URLSearchParams()
    if (config.ownerId) params.set('ownerId', config.ownerId)
    if (config.includePending) params.set('includePending', 'true')
    const query = params.size ? `?${params.toString()}` : ''
    return request(`/admin/team${query}`)
  },
  myTeams: () => request('/admin/my-teams'),
  createTeamMember: (member) => request('/admin/members/create', {
    method: 'POST',
    body: JSON.stringify(member),
  }),
  confirmTeamInvitation: (membershipId) => request('/admin/members/confirm', {
    method: 'PATCH',
    body: JSON.stringify({ membershipId }),
  }),
  assignOrder: (orderId, courierId, assignmentNote) => request(`/orders/${encodeURIComponent(orderId)}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: Number(courierId), assignment_note: assignmentNote }),
  }),
}
