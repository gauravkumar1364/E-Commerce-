// ─── API client for ShopZen backend ─────────────────────────────────────────
const BASE_URL = import.meta.env.VITE_API_URL || 'https://e-commerce-ro66.onrender.com';

function getToken() {
  return localStorage.getItem('shopzen_access_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('shopzen_access_token', token);
  else localStorage.removeItem('shopzen_access_token');
}

export function setCsrfToken(token) {
  if (token) localStorage.setItem('shopzen_csrf_token', token);
  else localStorage.removeItem('shopzen_csrf_token');
}

export function getCsrfToken() {
  return localStorage.getItem('shopzen_csrf_token');
}

export function setUserData(user) {
  if (user) localStorage.setItem('shopzen_user', JSON.stringify(user));
  else localStorage.removeItem('shopzen_user');
}

export function getUserData() {
  try {
    const v = localStorage.getItem('shopzen_user');
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const csrf = getCsrfToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      if (json.message === 'Session timed out' || json.message === 'Session is no longer valid' || json.message === 'Missing CSRF token' || json.message === 'Invalid or expired CSRF token') {
        setToken(null);
        setCsrfToken(null);
        setUserData(null);
        window.location.hash = '/login';
      }
    }
    throw { status: res.status, message: json.message || 'Request failed', data: json };
  }
  return json;
}

// ─── Public endpoints ────────────────────────────────────────────────────────
export const getStats = () => apiFetch('/api/storefront/stats');
export const getFeatured = (limit = 4) => apiFetch(`/api/storefront/featured?limit=${limit}`);
export const getTrending = (limit = 4) => apiFetch(`/api/storefront/trending?limit=${limit}`);
export const getDeals = (limit = 8) => apiFetch(`/api/storefront/deals?limit=${limit}`);
export const getAdminStats = () => apiFetch('/api/storefront/admin-stats');
export const getSellerStats = () => apiFetch('/api/storefront/seller-stats');

export const getProducts = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.category_slug) qs.set('category_slug', params.category_slug);
  if (params.sort_by) qs.set('sort_by', params.sort_by);
  if (params.sort_order) qs.set('sort_order', params.sort_order);
  if (params.page) qs.set('page', params.page);
  if (params.per_page) qs.set('per_page', params.per_page);
  if (params.in_stock) qs.set('in_stock', 'true');
  return apiFetch(`/products/?${qs.toString()}`);
};

export const getProduct = (productId) => apiFetch(`/products/${productId}`);
export const getCategories = () => apiFetch('/categories/');

// ─── Auth endpoints ──────────────────────────────────────────────────────────
export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const register = (data) =>
  apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) });

export const registerSeller = (data) =>
  apiFetch('/auth/register-seller', { method: 'POST', body: JSON.stringify(data) });

export const getMe = () => apiFetch('/auth/me');

// ─── Cart endpoints (require JWT) ───────────────────────────────────────────
export const getCart = () => apiFetch('/cart');
export const addToCart = (productId, quantity = 1) =>
  apiFetch('/cart/items', { method: 'POST', body: JSON.stringify({ product_id: productId, quantity }) });
export const updateCartItem = (cartItemId, quantity) =>
  apiFetch(`/cart/items/${cartItemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
export const removeCartItem = (cartItemId) =>
  apiFetch(`/cart/items/${cartItemId}`, { method: 'DELETE' });
export const clearCart = () => apiFetch('/cart', { method: 'DELETE' });

// ─── Wishlist endpoints ──────────────────────────────────────────────────────
export const getWishlist = () => apiFetch('/wishlist');
export const addToWishlist = (productId) =>
  apiFetch('/wishlist/items', { method: 'POST', body: JSON.stringify({ product_id: productId }) });
export const removeFromWishlist = (wishlistItemId) =>
  apiFetch(`/wishlist/items/${wishlistItemId}`, { method: 'DELETE' });

// ─── Order endpoints ─────────────────────────────────────────────────────────
export const getOrders = () => apiFetch('/orders');
export const checkout = (data) =>
  apiFetch('/checkout', { method: 'POST', body: JSON.stringify(data) });
