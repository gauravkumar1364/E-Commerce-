import { useEffect, useRef, useState } from 'react';
import * as api from './api.js';
import { ShoppingBag, ShoppingCart, Users, Package, Star, ShieldCheck, Shield, Truck, RefreshCw, MessageCircle, Zap, Gift, Globe, Mail, MessageSquare, Camera, Smartphone, Shirt, Home as HomeIcon, Sparkles, Footprints, Dumbbell, Backpack, Gamepad, BookOpen, Armchair } from 'lucide-react';

// ─── Colour palettes assigned per category (purely cosmetic) ─────────────────
const CATEGORY_PALETTES = {
  electronics:   ['from-cyan-400 via-sky-500 to-blue-600',      'from-slate-950 via-slate-800 to-slate-700'],
  fashion:       ['from-fuchsia-400 via-pink-500 to-orange-500', 'from-zinc-950 via-zinc-800 to-zinc-700'],
  accessories:   ['from-emerald-400 via-teal-500 to-cyan-500',   'from-stone-950 via-stone-800 to-stone-700'],
  wearables:     ['from-amber-300 via-orange-400 to-rose-500',   'from-neutral-950 via-neutral-800 to-neutral-700'],
  'home-kitchen':['from-lime-300 via-emerald-400 to-green-600',  'from-slate-950 via-slate-800 to-slate-700'],
  beauty:        ['from-pink-300 via-rose-400 to-fuchsia-500',   'from-slate-950 via-slate-800 to-slate-700'],
  footwear:      ['from-rose-400 via-red-500 to-orange-500',     'from-slate-950 via-slate-800 to-slate-700'],
  sports:        ['from-green-400 via-teal-500 to-cyan-500',     'from-slate-950 via-slate-800 to-slate-700'],
  gaming:        ['from-violet-400 via-purple-500 to-indigo-600','from-slate-950 via-slate-800 to-slate-700'],
  books:         ['from-amber-400 via-yellow-500 to-orange-400', 'from-slate-950 via-slate-800 to-slate-700'],
  furniture:     ['from-stone-400 via-amber-500 to-yellow-500',  'from-slate-950 via-slate-800 to-slate-700'],
  default:       ['from-violet-400 via-indigo-500 to-blue-600',  'from-slate-950 via-slate-800 to-slate-700'],
};

function paletteFor(product) {
  const slug = (product.categories?.[0]?.slug || '').toLowerCase();
  return CATEGORY_PALETTES[slug] || CATEGORY_PALETTES.default;
}

// ─── Route helpers ────────────────────────────────────────────────────────────
function parseRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path] = hash.split('?');
  const known = ['/login', '/register', '/products', '/cart', '/checkout', '/profile', '/orders', '/admin', '/seller', '/categories', '/deals', '/wishlist', '/admin/login', '/seller/login', '/seller/register'];
  if (known.includes(path)) return { path };
  if (path.startsWith('/product/')) return { path: '/product', id: path.replace('/product/', '') };
  return { path: '/' };
}
function navigate(path) { window.location.hash = path; }

// ─── Formatting ───────────────────────────────────────────────────────────────
function formatINR(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}
function formatDate(value) {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

// ─── Custom hook: async data fetching with loading + error ────────────────────
function useAsync(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);
    fn()
      .then((d) => { if (mountedRef.current) { setData(d); setLoading(false); } })
      .catch((e) => { if (mountedRef.current) { setError(e?.message || 'Failed to load'); setLoading(false); } });
    return () => { mountedRef.current = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, refresh: () => { setLoading(true); fn().then(setData).catch((e) => setError(e?.message)).finally(() => setLoading(false)); } };
}

// ─── Shared UI components ─────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-10 w-10 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin" />
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      ⚠️ {message || 'Something went wrong. Please try again.'}
    </div>
  );
}

function StarRating({ rating, reviews }) {
  const stars = Math.round(rating || 0);
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} className={`h-3.5 w-3.5 ${s <= stars ? 'text-amber-400' : 'text-gray-600'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {reviews != null && <span className="text-xs text-gray-500">{rating?.toFixed(1) || '—'} ({Number(reviews).toLocaleString('en-IN')} reviews)</span>}
    </div>
  );
}

function StatCard({ label, value, tone = 'cyan', hint }) {
  const tones = {
    cyan:   'bg-gray-100 border-gray-200 text-black',
    emerald:'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    rose:   'bg-rose-50 border-rose-200 text-rose-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    blue:   'bg-gray-100 border-gray-200 text-black',
  };
  return (
    <article className={`rounded-3xl border p-5 shadow-sm ${tones[tone] || tones.cyan}`}>
      <p className="text-xs uppercase tracking-[0.2em] font-bold opacity-80">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <strong className="text-3xl font-black md:text-4xl">{value ?? '—'}</strong>
        <span className="text-xs font-medium opacity-80">{hint}</span>
      </div>
    </article>
  );
}

function ProductCard({ product, onAdd, onOpen, onWishlist, wishlistItemId }) {
  const primaryImage = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const categoryName = product.categories?.[0]?.category_name || 'Product';
  const isWishlisted = wishlistItemId != null;

  return (
    <article className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition-transform duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300">
      {/* Visual */}
      <div className="relative h-52 bg-gray-100 p-5 overflow-hidden">
        {primaryImage && (
          <img src={primaryImage.image_url} alt={primaryImage.alt_text || product.product_name}
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply transition duration-500 group-hover:scale-105"
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        )}
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="inline-flex rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-800 shadow-sm backdrop-blur">
              {product.stock_quantity > 0 ? (product.stock_quantity < 20 ? 'Low Stock' : 'In Stock') : 'Out of Stock'}
            </span>
            <button type="button" onClick={() => onWishlist(product, wishlistItemId)}
              title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              className="rounded-full bg-white/90 p-2 shadow-sm backdrop-blur transition hover:bg-rose-50">
              <svg className={`h-4 w-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-500'}`}
                fill={isWishlisted ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{categoryName}</p>
          <h3 className="mt-1 text-lg font-black text-gray-900 leading-snug line-clamp-1">{product.product_name}</h3>
        </div>
        {product.rating != null && <StarRating rating={product.rating} reviews={product.reviews} />}
        <p className="line-clamp-2 text-sm leading-6 text-gray-500">{product.description || 'Premium quality product.'}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-gray-900">{formatINR(product.price)}</span>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={() => onOpen(product)}
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-100">
            Details
          </button>
          <button type="button" onClick={() => onAdd(product)} disabled={product.stock_quantity === 0}
            className="flex-1 rounded-xl bg-black px-3 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
            {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductGrid({ fetchFn, deps, onAdd, onOpen, onWishlist, wishlistItems, emptyText }) {
  const { data, loading, error } = useAsync(fetchFn, deps);
  const products = data?.products || data?.items || [];

  if (loading) return <Spinner />;
  if (error) return <ErrorBanner message={error} />;
  if (!products.length) return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
      {emptyText || 'No products available.'}
    </div>
  );
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {products.map((p) => {
        const wi = wishlistItems?.find((w) => w.product_id === p.product_id);
        return <ProductCard key={p.product_id} product={p} onAdd={onAdd} onOpen={onOpen} onWishlist={onWishlist} wishlistItemId={wi?.wishlist_item_id} />;
      })}
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="grid place-items-center rounded-3xl border border-dashed border-slate-300 bg-gray-50 px-6 py-14 text-center">
      <div className="max-w-md space-y-3">
        <h3 className="text-2xl font-black text-gray-900">{title}</h3>
        <p className="text-sm leading-7 text-gray-600">{text}</p>
        <div className="pt-2">{action}</div>
      </div>
    </div>
  );
}

function Input({ label, name, type = 'text', value, onChange, placeholder, required }) {
  const fieldProps = value !== undefined ? { value, onChange: onChange || (() => {}) } : { defaultValue: '' };
  return (
    <label className="grid gap-2 text-sm font-medium text-gray-700">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
      <input name={name} type={type} placeholder={placeholder} required={required} {...fieldProps}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
    </label>
  );
}

function Select({ label, name, value, onChange, children }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-gray-700">
      <span className="text-xs font-bold uppercase tracking-widest text-gray-500">{label}</span>
      <select name={name} value={value} onChange={onChange}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm">
        {children}
      </select>
    </label>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 ${strong ? 'text-gray-900' : 'text-gray-600'}`}>
      <span className="font-medium">{label}</span>
      <span className={strong ? 'font-black' : 'font-semibold'}>{value}</span>
    </div>
  );
}

function linePath(values, width, height, padding) {
  if (!values.length) return '';
  const max = Math.max(...values, 1);
  const iw = width - padding * 2, ih = height - padding * 2;
  return values.map((v, i) => {
    const x = padding + (iw / Math.max(values.length - 1, 1)) * i;
    const y = padding + ih - (v / max) * ih;
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

function ChartCard({ title, subtitle, labels, values, stroke = '#38bdf8', fill = 'rgba(56,189,248,0.18)' }) {
  const W = 900, H = 300, P = 32;
  const path = linePath(values, W, H, P);
  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{subtitle}</p>
          <h3 className="mt-2 text-xl font-black text-gray-900">{title}</h3>
        </div>
        <span className="text-sm text-gray-500">Last 6 months</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-72 w-full overflow-visible" role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = P + (H - P * 2) * t;
          return <line key={t} x1={P} x2={W - P} y1={y} y2={y} className="stroke-white/10" />;
        })}
        <path d={`${path} L ${W - P} ${H - P} L ${P} ${H - P} Z`} fill={fill} />
        <path d={path} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((v, i) => {
          const x = P + ((W - P * 2) / Math.max(values.length - 1, 1)) * i;
          const y = P + (H - P * 2) - (v / Math.max(...values, 1)) * (H - P * 2);
          return <circle key={labels[i]} cx={x} cy={y} r="5.5" fill={stroke} />;
        })}
        {labels.map((l, i) => {
          const x = P + ((W - P * 2) / Math.max(labels.length - 1, 1)) * i;
          return <text key={l} x={x} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">{l}</text>;
        })}
      </svg>
    </section>
  );
}

// ─── Trend data for charts (static — only metric labels change) ───────────────
const TREND = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  revenue: [28, 34, 42, 39, 56, 64],
  orders:  [18, 21, 25, 29, 31, 36],
  logins:  [40, 49, 52, 47, 59, 64],
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [route, setRoute] = useState(parseRoute);
  const [authUser, setAuthUser] = useState(() => api.getUserData());
  const [notice, setNotice] = useState({ msg: '', type: 'success' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Guest cart stored in localStorage when not logged in
  const [guestCart, setGuestCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('guest_cart') || '[]'); } catch { return []; }
  });

  // Live cart + wishlist (for logged-in users)
  const [liveCart, setLiveCart] = useState(null);
  const [liveWishlist, setLiveWishlist] = useState(null);

  // Shop page state
  const [shopSearch, setShopSearch] = useState('');
  const [shopCategory, setShopCategory] = useState('');
  const [shopSort, setShopSort] = useState('created_at');
  const [shopSortOrder, setShopSortOrder] = useState('desc');

  // Checkout form
  const [checkoutForm, setCheckoutForm] = useState({
    name: authUser ? `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() : '',
    email: authUser?.email || '',
    address: '', city: '', state: '', pincode: '', paymentMethod: 'card',
  });

  useEffect(() => {
    const onHash = () => { setRoute(parseRoute()); setMobileMenuOpen(false); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    try { localStorage.setItem('guest_cart', JSON.stringify(guestCart)); } catch {}
  }, [guestCart]);

  useEffect(() => {
    if (!notice.msg) return;
    const t = setTimeout(() => setNotice({ msg: '', type: 'success' }), 3200);
    return () => clearTimeout(t);
  }, [notice]);

  function showNotice(msg, type = 'success') { setNotice({ msg, type }); }

  // ── Auth ──────────────────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const data = await api.login(form.get('email'), form.get('password'));
      api.setToken(data.access_token);
      api.setCsrfToken(data.csrf_token);
      api.setUserData(data.user);
      setAuthUser(data.user);
      showNotice(`Welcome back, ${data.user.first_name}!`);
      navigate('/');
    } catch (err) {
      showNotice(err.message || 'Login failed. Check your credentials.', 'error');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const data = await api.register({
        first_name: form.get('first_name'),
        last_name: form.get('last_name'),
        email: form.get('email'),
        password: form.get('password'),
      });
      api.setToken(data.access_token);
      api.setCsrfToken(data.csrf_token);
      api.setUserData(data.user);
      setAuthUser(data.user);
      showNotice(`Account created! Welcome to ShopZen, ${data.user.first_name}!`);
      navigate('/');
    } catch (err) {
      showNotice(err.message || 'Registration failed.', 'error');
    }
  }

  async function handleSellerRegister(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const data = await api.registerSeller({
        first_name: form.get('first_name'),
        last_name: form.get('last_name'),
        email: form.get('email'),
        password: form.get('password'),
      });
      api.setToken(data.access_token);
      api.setCsrfToken(data.csrf_token);
      api.setUserData(data.user);
      setAuthUser(data.user);
      showNotice(`Seller account created! Welcome, ${data.user.first_name}!`);
      navigate('/seller');
    } catch (err) {
      showNotice(err.message || 'Registration failed.', 'error');
    }
  }

  function handleLogout() {
    api.setToken(null);
    api.setCsrfToken(null);
    api.setUserData(null);
    setAuthUser(null);
    setLiveCart(null);
    setLiveWishlist(null);
    showNotice('You have been signed out.');
    navigate('/');
  }

  // ── Cart (guest + authenticated) ─────────────────────────────────────────
  const isLoggedIn = Boolean(authUser && api.getUserData());

  async function handleAddToCart(product) {
    if (!isLoggedIn) {
      setGuestCart((prev) => {
        const ex = prev.find((i) => i.product_id === product.product_id);
        if (ex) return prev.map((i) => i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i);
        return [...prev, { ...product, quantity: 1 }];
      });
      showNotice(`✓ ${product.product_name} added to cart`);
      return;
    }
    try {
      const data = await api.addToCart(product.product_id, 1);
      setLiveCart(data.cart);
      showNotice(`✓ ${product.product_name} added to cart`);
    } catch (err) {
      showNotice(err.message || 'Could not add to cart', 'error');
    }
  }

  async function handleUpdateCartItem(cartItemId, quantity) {
    if (!isLoggedIn) {
      setGuestCart((prev) => prev.map((i) => i.product_id === cartItemId ? { ...i, quantity: Math.max(1, i.quantity + quantity) } : i));
      return;
    }
    try {
      // quantity here is the new absolute quantity
      const data = await api.updateCartItem(cartItemId, quantity);
      setLiveCart(data.cart);
    } catch (err) { showNotice(err.message, 'error'); }
  }

  async function handleRemoveCartItem(cartItemId, isGuest = false) {
    if (isGuest || !isLoggedIn) {
      setGuestCart((prev) => prev.filter((i) => i.product_id !== cartItemId));
      return;
    }
    try {
      const data = await api.removeCartItem(cartItemId);
      setLiveCart(data.cart);
    } catch (err) { showNotice(err.message, 'error'); }
  }

  // ── Wishlist ──────────────────────────────────────────────────────────────
  async function handleWishlist(product, wishlistItemId) {
    if (!isLoggedIn) { showNotice('Sign in to save items to your Wishlist.', 'info'); navigate('/login'); return; }
    try {
      if (wishlistItemId != null) {
        const data = await api.removeFromWishlist(wishlistItemId);
        setLiveWishlist(data.wishlist);
        showNotice('Removed from Wishlist');
      } else {
        const data = await api.addToWishlist(product.product_id);
        setLiveWishlist(data.wishlist);
        showNotice('♥ Added to Wishlist');
      }
    } catch (err) { showNotice(err.message, 'error'); }
  }

  // Load live cart/wishlist when user logs in or page loads
  useEffect(() => {
    if (!isLoggedIn) return;
    api.getCart().then((d) => setLiveCart(d.cart)).catch(() => {});
    api.getWishlist().then((d) => setLiveWishlist(d.wishlist)).catch(() => {});
  }, [isLoggedIn]);

  // Cart summary computations
  const cartItems = isLoggedIn ? (liveCart?.items || []) : guestCart;
  const cartCount = cartItems.reduce((t, i) => t + (i.quantity || 0), 0);
  const cartSubtotal = cartItems.reduce((t, i) => t + (i.quantity || 0) * parseFloat(i.unit_price || i.price || 0), 0);
  const cartTax = cartSubtotal * 0.05;
  const cartShipping = cartSubtotal >= 999 ? 0 : cartItems.length ? 49 : 0;
  const cartTotal = cartSubtotal + cartTax + cartShipping;

  const wishlistItems = isLoggedIn ? (liveWishlist?.items || []) : [];

  function goToProduct(product) { navigate(`/product/${product.product_id}`); }

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/products', label: 'Shop' },
    { path: '/categories', label: 'Categories' },
    { path: '/deals', label: 'Deals' },
    { path: '/orders', label: 'My Orders' },
    ...(authUser?.role === 'Admin'  ? [{ path: '/admin',  label: 'Admin Dashboard'  }] : []),
    ...(authUser?.role === 'Seller' ? [{ path: '/seller', label: 'Seller Dashboard' }] : []),
  ];

  // ── Page renderer ─────────────────────────────────────────────────────────
  function renderPage() {

    // ══ HOME ══
    if (route.path === '/') {
      return <HomePage
        onAdd={handleAddToCart}
        onOpen={goToProduct}
        onWishlist={handleWishlist}
        wishlistItems={wishlistItems}
      />;
    }

    // ══ SHOP ══
    if (route.path === '/products') {
      return <ShopPage
        search={shopSearch} setSearch={setShopSearch}
        category={shopCategory} setCategory={setShopCategory}
        sort={shopSort} setSort={setShopSort}
        sortOrder={shopSortOrder} setSortOrder={setShopSortOrder}
        onAdd={handleAddToCart} onOpen={goToProduct} onWishlist={handleWishlist} wishlistItems={wishlistItems}
      />;
    }

    // ══ CATEGORIES ══
    if (route.path === '/categories') {
      return <CategoriesPage setShopCategory={setShopCategory} />;
    }

    // ══ DEALS ══
    if (route.path === '/deals') {
      return <DealsPage onAdd={handleAddToCart} onOpen={goToProduct} onWishlist={handleWishlist} wishlistItems={wishlistItems} />;
    }

    // ══ PRODUCT DETAIL ══
    if (route.path === '/product' && route.id) {
      return <ProductDetailPage productId={route.id} onAdd={handleAddToCart} onWishlist={handleWishlist} wishlistItems={wishlistItems} />;
    }

    // ══ LOGIN ══
    if (route.path === '/login') {
      return <LoginPage onLogin={handleLogin} />;
    }

    // ══ ADMIN LOGIN ══
    if (route.path === '/admin/login') {
      return <AdminLoginPage onLogin={handleLogin} />;
    }

    // ══ SELLER LOGIN ══
    if (route.path === '/seller/login') {
      return <SellerLoginPage onLogin={handleLogin} />;
    }

    // ══ SELLER REGISTER ══
    if (route.path === '/seller/register') {
      return <SellerRegisterPage onRegister={handleSellerRegister} />;
    }

    // ══ REGISTER ══
    if (route.path === '/register') {
      return <RegisterPage onRegister={handleRegister} />;
    }

    // ══ CART ══
    if (route.path === '/cart') {
      return <CartPage
        cartItems={cartItems} isLoggedIn={isLoggedIn}
        cartSubtotal={cartSubtotal} cartTax={cartTax} cartShipping={cartShipping} cartTotal={cartTotal}
        onUpdate={handleUpdateCartItem} onRemove={handleRemoveCartItem}
      />;
    }

    // ══ CHECKOUT ══
    if (route.path === '/checkout') {
      return <CheckoutPage
        cartItems={cartItems} cartSubtotal={cartSubtotal} cartTax={cartTax}
        cartShipping={cartShipping} cartTotal={cartTotal}
        form={checkoutForm} setForm={setCheckoutForm}
        isLoggedIn={isLoggedIn} authUser={authUser}
        onCheckout={async (e) => {
          e.preventDefault();
          if (!isLoggedIn) { showNotice('Please sign in to complete your order.', 'info'); navigate('/login'); return; }
          if (!cartItems.length) { showNotice('Your cart is empty.', 'error'); return; }
          try {
            const liveCartItems = liveCart?.items || [];
            const data = await api.checkout({
              shipping_name: checkoutForm.name,
              shipping_address_line1: checkoutForm.address,
              shipping_city: checkoutForm.city,
              shipping_state: checkoutForm.state,
              shipping_postal_code: checkoutForm.pincode,
              shipping_country: 'India',
              payment_method: checkoutForm.paymentMethod,
              payment_token: 'SHOPZEN-TOKEN',
              items: liveCartItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
            });
            setLiveCart(null);
            showNotice(`🎉 Order ${data.order.order_number} placed! Estimated delivery: 3–5 business days.`);
            const cartData = await api.getCart();
            setLiveCart(cartData.cart);
            navigate('/orders');
          } catch (err) {
            showNotice(err.message || 'Checkout failed. Please try again.', 'error');
          }
        }}
      />;
    }

    // ══ PROFILE ══
    if (route.path === '/profile') {
      return <ProfilePage authUser={authUser} cartCount={cartCount} wishlistCount={wishlistItems.length} onLogout={handleLogout} />;
    }

    // ══ ORDERS ══
    if (route.path === '/orders') {
      if (!isLoggedIn) return <EmptyState title="Sign In Required" text="Please sign in to view your orders." action={<button onClick={() => navigate('/login')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Sign In</button>} />;
      return <OrdersPage />;
    }

    // ══ ADMIN ══
    if (route.path === '/admin') {
      if (authUser?.role !== 'Admin') return <EmptyState title="Access Restricted" text="Admin credentials required." action={<button onClick={() => navigate('/admin/login')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Admin Sign In</button>} />;
      return <AdminPage />;
    }

    // ══ SELLER ══
    if (route.path === '/seller') {
      if (!['Admin', 'Seller'].includes(authUser?.role)) return <EmptyState title="Access Restricted" text="Seller credentials required." action={<button onClick={() => navigate('/seller/login')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Seller Sign In</button>} />;
      return <SellerPage />;
    }

    // ══ WISHLIST ══
    if (route.path === '/wishlist') {
      if (!isLoggedIn) return <EmptyState title="Sign In Required" text="Please sign in to view your Wishlist." action={<button onClick={() => navigate('/login')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Sign In</button>} />;
      return <WishlistPage wishlistItems={wishlistItems} onAdd={handleAddToCart} onOpen={goToProduct} onWishlist={handleWishlist} />;
    }

    return <EmptyState title="Page Not Found" text="This page doesn't exist." action={<button onClick={() => navigate('/')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Go Home</button>} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">

        {/* Navbar */}
        <header className="sticky top-0 z-40 mb-6 border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-5 md:top-4 md:rounded-2xl md:border">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-black text-white shadow-md"><ShoppingBag className="w-5 h-5" /></span>
                <div>
                  <p className="text-base font-black tracking-tight text-gray-900">ShopZen</p>
                  <p className="text-xs font-medium text-gray-500">Premium Shopping</p>
                </div>
              </button>
              <button className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700 lg:hidden" onClick={() => setMobileMenuOpen((v) => !v)}>
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
            <nav className={`flex-wrap items-center gap-2 ${mobileMenuOpen ? 'flex' : 'hidden lg:flex'}`}>
              {navItems.map((item) => {
                const isActive = route.path === item.path || (item.path === '/products' && route.path === '/product');
                return (
                  <button key={item.path} onClick={() => navigate(item.path)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'}`}>
                    {item.label}
                  </button>
                );
              })}
              <button onClick={() => navigate('/cart')} className="relative rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                <ShoppingCart className="w-4 h-4 inline-block mr-1" /> Cart
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-[10px] font-black text-white shadow-sm">{cartCount}</span>
                )}
              </button>
              {authUser ? (
                <>
                  {authUser.role === 'Admin' && (
                    <button onClick={() => navigate('/admin')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${route.path === '/admin' ? 'bg-rose-600 text-white' : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>
                      🛡️ Admin
                    </button>
                  )}
                  {['Admin', 'Seller'].includes(authUser.role) && (
                    <button onClick={() => navigate('/seller')} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${route.path === '/seller' ? 'bg-amber-600 text-white' : 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}>
                      📦 Seller
                    </button>
                  )}
                  <button onClick={() => navigate('/profile')} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-black hover:bg-blue-100 transition">
                    <span className="h-5 w-5 rounded-full bg-black grid place-items-center text-[10px] font-black text-white">
                      {(authUser.first_name || 'U').charAt(0).toUpperCase()}
                    </span>
                    {authUser.first_name}
                  </button>
                </>
              ) : (
                <button onClick={() => navigate('/login')} className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-black hover:bg-blue-100 transition">
                  Sign In
                </button>
              )}
            </nav>
          </div>
        </header>

        {/* Toast */}
        {notice.msg && (
          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm flex items-center gap-2 ${
            notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' :
            notice.type === 'info'  ? 'border-gray-200 bg-gray-100 text-black' :
            'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
            {notice.msg}
          </div>
        )}

        {renderPage()}

        {/* Footer */}
        <footer className="mt-16 rounded-3xl border border-gray-200 bg-white px-6 py-10 shadow-sm">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <button onClick={() => navigate('/')} className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-black text-base font-black text-white shadow-md shadow-gray-400/20">S</span>
                <span className="font-black text-gray-900 text-lg">ShopZen</span>
              </button>
              <p className="text-sm text-gray-600 leading-6">Your one-stop destination for premium products at unbeatable prices.</p>
              <div className="flex gap-3">{[<Globe key={0} className="w-4 h-4"/>,<Mail key={1} className="w-4 h-4"/>,<Camera key={2} className="w-4 h-4"/>,<MessageSquare key={3} className="w-4 h-4"/>].map((icon, i) => (
                <button key={i} className="h-9 w-9 rounded-xl border border-gray-200 bg-gray-50 grid place-items-center text-sm hover:bg-gray-100 transition text-gray-600">{icon}</button>
              ))}</div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Quick Links</p>
              <ul className="space-y-2">
                {[['Home','/'],['Shop','/products'],['Categories','/categories'],['Deals','/deals'],['My Orders','/orders']].map(([l, p]) => (
                  <li key={l}><button onClick={() => navigate(p)} className="text-sm font-medium text-gray-600 hover:text-black transition">{l}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-4">Customer Care</p>
              <ul className="space-y-2 text-sm font-medium text-gray-600">
                {['Help Center','Track Your Order','Return Policy','Shipping Policy','Privacy Policy','Terms & Conditions'].map((item) => (
                  <li key={item}><button className="hover:text-black transition">{item}</button></li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Contact Us</p>
              <div className="space-y-2 text-sm font-medium text-gray-600">
                <p>📧 support@shopzen.in</p>
                <p>📞 1800-123-4567 (Toll Free)</p>
                <p>🕐 Mon–Sat: 9 AM – 8 PM IST</p>
              </div>
              <div className="space-y-2 pt-2">
                {[[<Shield key={0} className="w-3 h-3"/>,'100% Secure Payments'],[<RefreshCw key={1} className="w-3 h-3"/>,'10-Day Easy Returns'],[<Truck key={2} className="w-3 h-3"/>,'Free Delivery on ₹999+']].map(([ic, t], i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-semibold text-gray-600"><span>{ic}</span>{t}</div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 sm:flex-row">
            <p className="text-xs font-medium text-gray-500">© 2025 ShopZen. All rights reserved. Made with ❤️ in India.</p>
            <div className="flex gap-4 text-xs font-medium text-gray-500">
              {['Privacy','Terms','Sitemap'].map((t) => <button key={t} className="hover:text-gray-900 transition">{t}</button>)}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ─── Page components ──────────────────────────────────────────────────────────

function HomePage({ onAdd, onOpen, onWishlist, wishlistItems }) {
  const { data: stats, loading: statsLoading } = useAsync(api.getStats, []);

  const trustMetrics = statsLoading
    ? [{ label: '—', sub: 'Happy Customers', icon: <Users className="w-6 h-6 mx-auto"/> }, { label: '—', sub: 'Products Available', icon: <Package className="w-6 h-6 mx-auto"/> }, { label: '4.8 / 5', sub: 'Customer Rating', icon: <Star className="w-6 h-6 mx-auto"/> }, { label: '100%', sub: 'Secure Shopping', icon: <ShieldCheck className="w-6 h-6 mx-auto"/> }]
    : [
        { label: stats?.total_customers > 0 ? `${stats.total_customers.toLocaleString('en-IN')}+` : 'Growing!', sub: 'Happy Customers', icon: <Users className="w-6 h-6 mx-auto"/> },
        { label: stats?.total_products > 0 ? `${stats.total_products}+` : 'Launching Soon', sub: 'Products Available', icon: <Package className="w-6 h-6 mx-auto"/> },
        { label: '4.8 / 5', sub: 'Customer Rating', icon: <Star className="w-6 h-6 mx-auto"/> },
        { label: '100%', sub: 'Secure Shopping', icon: <ShieldCheck className="w-6 h-6 mx-auto"/> },
      ];

  return (
    <div className="space-y-10">

      {/* Hero */}
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid gap-8 p-6 md:p-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-4 py-1 text-xs font-bold uppercase tracking-widest text-black">
              🔥 Festival Sale — Up to 50% Off
            </span>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-gray-900 md:text-6xl leading-tight">
              Discover Premium Products at{' '}
              <span className="text-black">Unbeatable Prices</span>
            </h1>
            <p className="max-w-2xl text-base leading-7 text-gray-600 md:text-lg">
              Shop thousands of high-quality electronics, fashion, home essentials, and accessories with secure payments and fast nationwide delivery.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/products')} className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-md shadow-gray-400/20 transition hover:bg-gray-900">
                Shop Now
              </button>
              <button onClick={() => navigate('/categories')} className="rounded-xl border border-gray-200 bg-gray-50 px-6 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-100">
                Explore Categories
              </button>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {[[<Shield key={0} className="w-4 h-4"/>,'Secure Payments'],[<Truck key={1} className="w-4 h-4"/>,'Fast Delivery'],[<RefreshCw key={2} className="w-4 h-4"/>,'Easy Returns'],[<MessageCircle key={3} className="w-4 h-4"/>,'24/7 Support']].map(([ic, lb], i) => (
                <div key={i} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-base">{ic}</span>
                  <span className="text-xs font-semibold text-gray-600">{lb}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block h-[420px] w-full rounded-3xl overflow-hidden shadow-lg border border-gray-100 bg-gray-50">
             <img src="https://images.unsplash.com/photo-1491933382434-500287f9b54b?q=80&w=1600&auto=format&fit=crop" alt="Premium Tech Products" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Trust Metrics Row */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {trustMetrics.map((m) => (
          <div key={m.sub} className="flex items-center gap-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-gray-900">
               {m.icon}
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">{m.label}</p>
              <p className="text-sm font-medium text-gray-500">{m.sub}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Promo Banners */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: 'Mega Sale', sub: 'Up to 50% off Electronics', color: 'bg-gray-100 border-gray-200 text-black', icon: <Zap className="w-6 h-6"/> },
          { title: 'Free Shipping', sub: 'On orders above ₹999', color: 'bg-emerald-50 border-emerald-200 text-emerald-700', icon: <Truck className="w-6 h-6"/> },
          { title: 'Buy 2 Get 1 Free', sub: 'On all Fashion & Accessories', color: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700', icon: <Gift className="w-6 h-6"/> },
        ].map((b) => (
          <button key={b.title} onClick={() => navigate('/deals')}
            className={`flex items-center gap-4 rounded-3xl border p-5 text-left transition hover:brightness-95 ${b.color}`}>
            <span className="text-3xl">{b.icon}</span>
            <div>
              <p className="font-black text-gray-900">{b.title}</p>
              <p className="text-sm font-medium">{b.sub}</p>
            </div>
          </button>
        ))}
      </section>

      {/* Featured Products */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black">Handpicked for You</p>
            <h2 className="mt-2 text-2xl font-black text-gray-900">Featured Products</h2>
          </div>
          <button className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition" onClick={() => navigate('/products')}>View All →</button>
        </div>
        <ProductGrid fetchFn={api.getFeatured} deps={[]} onAdd={onAdd} onOpen={onOpen} onWishlist={onWishlist} wishlistItems={wishlistItems} emptyText="No featured products yet. Check back soon!" />
      </section>

      {/* Shop by Category */}
      <CategoryGridSection />

      {/* Trending */}
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-black">Most Loved</p>
            <h2 className="mt-2 text-2xl font-black text-gray-900">Trending Now 🔥</h2>
          </div>
          <button className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition" onClick={() => navigate('/products')}>View All →</button>
        </div>
        <ProductGrid fetchFn={api.getTrending} deps={[]} onAdd={onAdd} onOpen={onOpen} onWishlist={onWishlist} wishlistItems={wishlistItems} emptyText="No trending products yet." />
      </section>

      {/* Newsletter */}
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-gray-100 p-8 text-center">
        <h2 className="text-2xl font-black text-gray-900">Get Exclusive Deals in Your Inbox</h2>
        <p className="mt-2 text-gray-600 font-medium">Subscribe and be the first to know about sales, new arrivals, and more.</p>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center" onSubmit={(e) => e.preventDefault()}>
          <input type="email" placeholder="Enter your email address" required
            className="w-full max-w-sm rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
          <button className="rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-md shadow-gray-400/20 transition hover:bg-gray-900">Subscribe</button>
        </form>
      </section>
    </div>
  );
}

function CategoryGridSection() {
  const { data, loading } = useAsync(api.getCategories, []);
  const cats = data?.categories || [];

  const ICONS = { electronics:<Smartphone/>, fashion:<Shirt/>, 'home-kitchen':<HomeIcon/>, beauty:<Sparkles/>, footwear:<Footprints/>, sports:<Dumbbell/>, accessories:<Backpack/>, gaming:<Gamepad/>, books:<BookOpen/>, furniture:<Armchair/> };

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Browse by Interest</p>
        <h2 className="mt-2 text-2xl font-black text-gray-900">Shop by Category</h2>
      </div>
      {loading ? <Spinner /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {cats.map((c) => (
            <button key={c.category_id}
              onClick={() => { navigate('/products'); window.dispatchEvent(new CustomEvent('setCategory', { detail: c.slug })); }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-center transition hover:bg-cyan-500/10 hover:border-cyan-500/30">
              <span className="text-3xl">{ICONS[c.slug] || '🛍️'}</span>
              <span className="text-xs font-semibold text-gray-700">{c.category_name}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ShopPage({ search, setSearch, category, setCategory, sort, setSort, sortOrder, setSortOrder, onAdd, onOpen, onWishlist, wishlistItems }) {
  const { data, loading, error } = useAsync(
    () => api.getProducts({ q: search, category_slug: category, sort_by: sort, sort_order: sortOrder, per_page: 24 }),
    [search, category, sort, sortOrder],
  );
  const { data: catData } = useAsync(api.getCategories, []);
  const products = data?.items || [];
  const categories = catData?.categories || [];

  // Listen for category events from the home page grid
  useEffect(() => {
    const handler = (e) => setCategory(e.detail);
    window.addEventListener('setCategory', handler);
    return () => window.removeEventListener('setCategory', handler);
  }, [setCategory]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">Shop All Products</h1>
        <p className="mt-1 text-sm text-gray-500">Discover our full range of premium products across all categories.</p>
      </div>
      <div className="grid gap-4 rounded-3xl border border-gray-200 bg-white p-5 lg:grid-cols-[1.2fr_auto_auto_auto]">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} name="search" label="Search Products" placeholder="Search by name, description…" />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} name="category" label="Category">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.category_id} value={c.slug}>{c.category_name}</option>)}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value)} name="sort" label="Sort By">
          <option value="created_at">Newest First</option>
          <option value="price">Price</option>
          <option value="product_name">Name</option>
          <option value="stock_quantity">Availability</option>
        </Select>
        <Select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} name="order" label="Order">
          <option value="desc">High → Low</option>
          <option value="asc">Low → High</option>
        </Select>
      </div>
      {loading ? <Spinner /> : error ? <ErrorBanner message={error} /> : !products.length ? (
        <EmptyState title="No products found" text="Try adjusting your search or category filter." action={<button onClick={() => { setSearch(''); setCategory(''); }} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Clear Filters</button>} />
      ) : (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const wi = wishlistItems?.find((w) => w.product_id === p.product_id);
            return <ProductCard key={p.product_id} product={p} onAdd={onAdd} onOpen={onOpen} onWishlist={onWishlist} wishlistItemId={wi?.wishlist_item_id} />;
          })}
        </section>
      )}
    </div>
  );
}

function CategoriesPage({ setShopCategory }) {
  const { data, loading } = useAsync(api.getCategories, []);
  const cats = data?.categories || [];
  const ICONS = { electronics:<Smartphone/>, fashion:<Shirt/>, 'home-kitchen':<HomeIcon/>, beauty:<Sparkles/>, footwear:<Footprints/>, sports:<Dumbbell/>, accessories:<Backpack/>, gaming:<Gamepad/>, books:<BookOpen/>, furniture:<Armchair/> };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">Shop by Category</h1>
        <p className="mt-1 text-sm text-gray-500">Find exactly what you need from our wide selection.</p>
      </div>
      {loading ? <Spinner /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => (
            <button key={c.category_id} onClick={() => { setShopCategory(c.slug); navigate('/products'); }}
              className="flex items-center gap-4 rounded-[1.5rem] border border-gray-200 bg-white p-5 text-left transition hover:border-cyan-400/30 hover:bg-cyan-500/10 group">
              <span className="text-4xl">{ICONS[c.slug] || '🛍️'}</span>
              <div>
                <p className="font-black text-gray-900 group-hover:text-cyan-300 transition">{c.category_name}</p>
                {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
              </div>
            </button>
          ))}
          {!cats.length && <p className="text-gray-500 col-span-full text-center py-12">No categories yet.</p>}
        </div>
      )}
    </div>
  );
}

function DealsPage({ onAdd, onOpen, onWishlist, wishlistItems }) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-rose-400/20 bg-gradient-to-br from-rose-500/10 to-orange-500/10 p-8">
        <span className="inline-flex rounded-full bg-rose-500/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-rose-300">⏰ Limited Time</span>
        <h1 className="mt-4 text-4xl font-black text-gray-900">Today's Best Deals</h1>
        <p className="mt-2 text-gray-600">Grab these offers before they're gone. New deals added daily!</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title:'🛍️ Weekend Sale', sub:'Extra 10% off on Electronics', badge:'USE CODE: WKND10' },
          { title:'🚚 Free Shipping',  sub:'On all orders above ₹999',       badge:'Auto-applied' },
          { title:'🎁 Buy 2 Get 1',   sub:'On Fashion & Accessories',         badge:'Limited items' },
          { title:'💳 Bank Offer',    sub:'5% cashback on HDFC cards',        badge:'T&C apply' },
        ].map((o) => (
          <div key={o.title} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="font-black text-gray-900">{o.title}</p>
            <p className="mt-1 text-sm text-gray-600">{o.sub}</p>
            <span className="mt-3 inline-block rounded-full bg-cyan-500/15 px-3 py-0.5 text-xs font-semibold text-cyan-300">{o.badge}</span>
          </div>
        ))}
      </div>
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-black text-gray-900 mb-5">🔥 Featured Products on Sale</h2>
        <ProductGrid fetchFn={() => api.getDeals(8)} deps={[]} onAdd={onAdd} onOpen={onOpen} onWishlist={onWishlist} wishlistItems={wishlistItems} emptyText="No deals available right now. Check back soon!" />
      </div>
    </div>
  );
}

function ProductDetailPage({ productId, onAdd, onWishlist, wishlistItems }) {
  const { data, loading, error } = useAsync(() => api.getProduct(productId), [productId]);
  const product = data?.product;

  if (loading) return <Spinner />;
  if (error || !product) return <EmptyState title="Product Not Found" text="This product could not be loaded." action={<button onClick={() => navigate('/products')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Back to Shop</button>} />;

  const palette = paletteFor(product);
  const primaryImage = product.images?.find((i) => i.is_primary) || product.images?.[0];
  const wi = wishlistItems?.find((w) => w.product_id === product.product_id);

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/products')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition">← Back to Products</button>
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={`rounded-3xl border border-gray-200 bg-gradient-to-br ${palette[0]} p-6 shadow-sm overflow-hidden`}>
          <div className={`h-full rounded-[1.5rem] bg-gradient-to-br ${palette[1]} p-8 relative min-h-72`}>
            {primaryImage && (
              <img src={primaryImage.image_url} alt={primaryImage.alt_text || product.product_name}
                className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay rounded-[1.5rem]"
                onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            )}
            <div className="relative flex h-full flex-col justify-between">
              <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-900 backdrop-blur">
                {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
              <div className="mt-8">
                <p className="text-sm uppercase tracking-[0.25em] text-gray-900/60">{product.categories?.[0]?.category_name || 'Product'}</p>
                <h1 className="mt-2 text-4xl font-black text-gray-900">{product.product_name}</h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-gray-900/85 md:text-base">{product.description}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-black text-gray-900">{formatINR(product.price)}</span>
            <span className="text-sm text-gray-500">{product.currency_code}</span>
          </div>
          <p className={`text-sm ${product.stock_quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {product.stock_quantity > 0 ? `✓ ${product.stock_quantity} units available` : '✗ Out of stock'}
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <button onClick={() => { onAdd(product); navigate('/cart'); }} disabled={product.stock_quantity === 0}
              className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-gray-400/20 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed">
              🛒 Buy Now
            </button>
            <button onClick={() => onAdd(product)} disabled={product.stock_quantity === 0}
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3.5 text-sm font-bold text-gray-900 transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">
              Add to Cart
            </button>
            <button onClick={() => onWishlist(product, wi?.wishlist_item_id)}
              className={`w-full rounded-2xl border px-5 py-3 text-sm font-semibold transition ${wi ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              {wi ? '♥ Saved to Wishlist' : '♡ Add to Wishlist'}
            </button>
          </div>
          <div className="grid gap-2 pt-2">
            {[['🚚','Free Delivery','On orders above ₹999'],['↩️','10-Day Easy Returns','No questions asked'],['🔒','100% Secure Payment','SSL encrypted checkout']].map(([ic, t, s], i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
                <span className="text-lg">{ic}</span>
                <div><p className="text-xs font-bold text-gray-900">{t}</p><p className="text-xs text-gray-500">{s}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function LoginPage({ onLogin }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">Welcome Back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to continue shopping and track your orders.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form onSubmit={onLogin} className="rounded-3xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <Input name="email" label="Email Address" type="email" placeholder="you@example.com" required />
          <Input name="password" label="Password" type="password" placeholder="Enter your password" required />
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="rounded-2xl bg-black px-6 py-3 text-sm font-bold text-white shadow-lg shadow-gray-400/20 hover:brightness-110 transition">Sign In</button>
            <button type="button" onClick={() => navigate('/register')} className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100 transition">Create Account</button>
          </div>
          <p className="text-xs text-gray-500 pt-1">Register first, then verify your email to sign in. Email verification token will be shown in the server console (dev mode).</p>
        </form>
        <aside className="rounded-3xl border border-gray-200 bg-gradient-to-br from-slate-950/80 to-slate-900/50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Why Shop with Us?</p>
          <div className="mt-5 space-y-3">
            {[['🔒','Secure Checkout','All payments are SSL encrypted and safe.'],['🚚','Fast Delivery','Get your orders in 2–5 business days.'],['↩️','Easy Returns','Hassle-free 10-day return policy.'],['💬','24/7 Support','Always here via chat or call.']].map(([ic, t, d], i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <span className="text-xl">{ic}</span>
                <div><p className="font-semibold text-gray-900 text-sm">{t}</p><p className="mt-0.5 text-xs text-gray-500">{d}</p></div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={() => navigate('/admin/login')} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 transition">🛡️ Admin Login</button>
        <button onClick={() => navigate('/seller/login')} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition">📦 Seller Login</button>
      </div>
    </div>
  );
}

function AdminLoginPage({ onLogin }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <span className="inline-flex rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-600">Admin Portal</span>
        <h1 className="mt-3 text-2xl font-black text-gray-900">Admin Sign In</h1>
        <p className="mt-1 text-sm text-gray-500">Access the admin dashboard to manage your store.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form onSubmit={onLogin} className="rounded-3xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <Input name="email" label="Admin Email" type="email" placeholder="admin@shopzen.in" required />
          <Input name="password" label="Password" type="password" placeholder="Enter admin password" required />
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="rounded-2xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-400/20 hover:bg-rose-700 transition">Sign In as Admin</button>
            <button type="button" onClick={() => navigate('/login')} className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100 transition">Customer Login</button>
          </div>
          <p className="text-xs text-gray-500 pt-1">Only users with the Admin role can access the admin dashboard.</p>
        </form>
        <aside className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50 to-orange-50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] font-bold text-rose-600">Admin Features</p>
          <div className="mt-5 space-y-3">
            {[['📊','Business Analytics','View real-time revenue, orders, and customer metrics.'],['👥','User Management','Manage customer accounts and roles.'],['🛡️','Security Monitoring','Track login attempts and security alerts.'],['📦','Inventory Control','Full oversight of product catalog and stock.']].map(([ic, t, d], i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-rose-100 bg-white p-4">
                <span className="text-xl">{ic}</span>
                <div><p className="font-semibold text-gray-900 text-sm">{t}</p><p className="mt-0.5 text-xs text-gray-500">{d}</p></div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SellerLoginPage({ onLogin }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-600">Seller Portal</span>
        <h1 className="mt-3 text-2xl font-black text-gray-900">Seller Sign In</h1>
        <p className="mt-1 text-sm text-gray-500">Access your seller dashboard to manage products and orders.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <form onSubmit={onLogin} className="rounded-3xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <Input name="email" label="Seller Email" type="email" placeholder="seller@shopzen.in" required />
          <Input name="password" label="Password" type="password" placeholder="Enter seller password" required />
          <div className="flex flex-wrap gap-3 pt-2">
            <button className="rounded-2xl bg-amber-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-amber-400/20 hover:bg-amber-700 transition">Sign In as Seller</button>
            <button type="button" onClick={() => navigate('/login')} className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-3 text-sm font-bold text-gray-900 hover:bg-gray-100 transition">Customer Login</button>
            <button type="button" onClick={() => navigate('/seller/register')} className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100 transition">Create Seller Account</button>
          </div>
          <p className="text-xs text-gray-500 pt-1">Only users with the Seller role can access the seller dashboard.</p>
        </form>
        <aside className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] font-bold text-amber-600">Seller Features</p>
          <div className="mt-5 space-y-3">
            {[['📦','Product Management','Add, edit, and manage your product listings.'],['📈','Sales Analytics','Track revenue, orders, and growth trends.'],['🚚','Order Fulfillment','Process and ship customer orders efficiently.'],['📋','Inventory Tracking','Monitor stock levels and get low-stock alerts.']].map(([ic, t, d], i) => (
              <div key={i} className="flex gap-3 rounded-2xl border border-amber-100 bg-white p-4">
                <span className="text-xl">{ic}</span>
                <div><p className="font-semibold text-gray-900 text-sm">{t}</p><p className="mt-0.5 text-xs text-gray-500">{d}</p></div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SellerRegisterPage({ onRegister }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-600">Seller Portal</span>
        <h1 className="mt-3 text-2xl font-black text-gray-900">Create Seller Account</h1>
        <p className="mt-1 text-sm text-gray-500">Register as a seller to start listing products on ShopZen.</p>
      </div>
      <form onSubmit={onRegister} className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="first_name" label="First Name" placeholder="Rahul" required />
          <Input name="last_name" label="Last Name" placeholder="Sharma" required />
          <Input name="email" label="Email Address" type="email" placeholder="seller@example.com" required />
          <Input name="password" label="Password" type="password" placeholder="Min. 8 characters" required />
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] font-bold text-amber-600">Seller Benefits</p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              {['List unlimited products for free','Real-time sales analytics dashboard','Fast & reliable order management','Dedicated seller support team'].map((b) => (
                <div key={b} className="flex items-center gap-2"><span className="text-amber-500">✓</span>{b}</div>
              ))}
            </div>
          </div>
          <button className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-amber-400/20 hover:bg-amber-700 transition">Create Seller Account</button>
        </div>
      </form>
      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={() => navigate('/seller/login')} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition">Already a Seller? Sign In</button>
        <button onClick={() => navigate('/login')} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition">Customer Login</button>
      </div>
    </div>
  );
}

function RegisterPage({ onRegister }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">Create Your Account</h1>
        <p className="mt-1 text-sm text-gray-500">Join thousands of happy shoppers. Sign up in seconds.</p>
      </div>
      <form onSubmit={onRegister} className="grid gap-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:grid-cols-[1fr_0.8fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="first_name" label="First Name" placeholder="Rahul" required />
          <Input name="last_name" label="Last Name" placeholder="Sharma" required />
          <Input name="email" label="Email Address" type="email" placeholder="you@example.com" required />
          <Input name="password" label="Password" type="password" placeholder="Min. 8 characters" required />
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-gray-200 bg-gray-50 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Member Benefits</p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              {['₹100 off on your first order','Early access to sales & deals','Exclusive member-only offers','Free shipping on every 3rd order'].map((b) => (
                <div key={b} className="flex items-center gap-2"><span className="text-cyan-400">✓</span>{b}</div>
              ))}
            </div>
          </div>
          <button className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white shadow-lg shadow-gray-400/20 hover:brightness-110 transition">Create Free Account</button>
        </div>
      </form>
    </div>
  );
}

function CartPage({ cartItems, isLoggedIn, cartSubtotal, cartTax, cartShipping, cartTotal, onUpdate, onRemove }) {
  const cartCount = cartItems.reduce((t, i) => t + i.quantity, 0);
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">Your Shopping Cart</h1>
        <p className="mt-1 text-sm text-gray-500">{cartCount > 0 ? `${cartCount} item${cartCount > 1 ? 's' : ''} in your cart` : 'Your cart is empty'}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          {cartItems.length === 0 ? (
            <EmptyState title="Your cart is empty" text="Start exploring our collection!" action={<button onClick={() => navigate('/products')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Start Shopping</button>} />
          ) : cartItems.map((item) => {
            const productId = item.product_id;
            const name = item.product?.product_name || item.product_name || 'Product';
            const price = parseFloat(item.unit_price || item.price || 0);
            const palette = paletteFor(item.product || item);
            const isGuestItem = !isLoggedIn;
            const itemId = isGuestItem ? productId : item.cart_item_id;

            return (
              <div key={item.cart_item_id || item.product_id} className="flex flex-col gap-4 rounded-[1.5rem] border border-gray-200 bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
                <div className={`h-14 w-14 shrink-0 rounded-2xl bg-gradient-to-br ${palette[0]}`} />
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{name}</p>
                  <p className="text-sm text-gray-500">{item.product?.categories?.[0]?.category_name || ''}</p>
                </div>
                {isLoggedIn ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => onUpdate(item.cart_item_id, Math.max(1, item.quantity - 1))} className="rounded-full border border-gray-200 bg-gray-50 h-8 w-8 flex items-center justify-center text-gray-900 hover:bg-gray-100 transition">−</button>
                    <span className="min-w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                    <button onClick={() => onUpdate(item.cart_item_id, item.quantity + 1)} className="rounded-full border border-gray-200 bg-gray-50 h-8 w-8 flex items-center justify-center text-gray-900 hover:bg-gray-100 transition">+</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => onRemove(productId, true)} className="rounded-full border border-gray-200 bg-gray-50 h-8 w-8 flex items-center justify-center text-gray-900 hover:bg-gray-100 transition">−</button>
                    <span className="min-w-8 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
                    <button onClick={() => {}} className="rounded-full border border-gray-200 bg-gray-50 h-8 w-8 flex items-center justify-center text-gray-900 hover:bg-gray-100 transition">+</button>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900">{formatINR(price * item.quantity)}</span>
                  <button onClick={() => onRemove(isGuestItem ? productId : item.cart_item_id, isGuestItem)} className="text-sm text-rose-300 hover:text-rose-100 transition">Remove</button>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm space-y-4 self-start">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Order Summary</p>
          <div className="space-y-2 text-sm text-gray-600">
            <Row label="Subtotal" value={formatINR(cartSubtotal)} />
            <Row label="GST (5%)" value={formatINR(cartTax)} />
            <Row label={cartShipping === 0 ? 'Shipping (Free!)' : 'Shipping'} value={cartShipping === 0 ? '₹0' : formatINR(cartShipping)} />
            {cartSubtotal > 0 && cartSubtotal < 999 && <p className="text-xs text-amber-300">Add ₹{Math.ceil(999 - cartSubtotal)} more for free shipping!</p>}
            <Row label="Total" value={formatINR(cartTotal)} strong />
          </div>
          {cartItems.length > 0 && (
            <button onClick={() => navigate('/checkout')} className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-gray-400/20 hover:brightness-110 transition">
              Proceed to Checkout →
            </button>
          )}
          <div className="flex items-center gap-2 justify-center"><span className="text-xs text-gray-500">🔒 Safe & Secure Checkout</span></div>
        </aside>
      </div>
    </div>
  );
}

function CheckoutPage({ cartItems, cartSubtotal, cartTax, cartShipping, cartTotal, form, setForm, isLoggedIn, onCheckout }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">Secure Checkout</h1>
        <p className="mt-1 text-sm text-gray-500">Complete your order. Your information is always secure.</p>
      </div>
      <form onSubmit={onCheckout} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Delivery Details</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full Name" name="name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Rahul Sharma" required />
            <Input label="Email Address" name="email" type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} placeholder="you@example.com" required />
            <div className="sm:col-span-2"><Input label="Delivery Address" name="address" value={form.address} onChange={(e) => setForm((c) => ({ ...c, address: e.target.value }))} placeholder="House No., Street, Area" required /></div>
            <Input label="City" name="city" value={form.city} onChange={(e) => setForm((c) => ({ ...c, city: e.target.value }))} placeholder="Mumbai" required />
            <Input label="State" name="state" value={form.state} onChange={(e) => setForm((c) => ({ ...c, state: e.target.value }))} placeholder="Maharashtra" required />
            <Input label="PIN Code" name="pincode" value={form.pincode} onChange={(e) => setForm((c) => ({ ...c, pincode: e.target.value }))} placeholder="400001" required />
            <Select label="Payment Method" name="paymentMethod" value={form.paymentMethod} onChange={(e) => setForm((c) => ({ ...c, paymentMethod: e.target.value }))}>
              <option value="card">Credit / Debit Card</option>
              <option value="wallet">UPI / Mobile Wallet</option>
              <option value="bank_transfer">Net Banking</option>
              <option value="cod">Cash on Delivery</option>
            </Select>
          </div>
          {!isLoggedIn && <p className="text-xs text-amber-300">⚠️ Please sign in to complete your order.</p>}
        </div>
        <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm space-y-4 self-start">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Order Summary</p>
          <div className="space-y-2 text-sm text-gray-600">
            {cartItems.map((item) => {
              const name = item.product?.product_name || item.product_name || 'Product';
              const price = parseFloat(item.unit_price || item.price || 0);
              return <Row key={item.cart_item_id || item.product_id} label={`${name} × ${item.quantity}`} value={formatINR(price * item.quantity)} />;
            })}
            <Row label="Subtotal" value={formatINR(cartSubtotal)} />
            <Row label="GST (5%)" value={formatINR(cartTax)} />
            <Row label={cartShipping === 0 ? 'Shipping (Free!)' : 'Shipping'} value={cartShipping === 0 ? '₹0' : formatINR(cartShipping)} />
            <Row label="Total" value={formatINR(cartTotal)} strong />
          </div>
          <button className="w-full rounded-2xl bg-black px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-gray-400/20 hover:brightness-110 transition">
            🔒 Place Order — {formatINR(cartTotal)}
          </button>
          <p className="text-xs text-center text-gray-500">SSL encrypted. Your payment info is never stored.</p>
        </aside>
      </form>
    </div>
  );
}

function ProfilePage({ authUser, cartCount, wishlistCount, onLogout }) {
  const { data: ordersData, loading } = useAsync(api.getOrders, [authUser?.user_id]);
  const orders = ordersData?.orders || [];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">My Account</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 grid place-items-center text-2xl font-black text-white">
                {(authUser?.first_name || 'U').charAt(0).toUpperCase()}
              </div>
              <h2 className="mt-4 text-2xl font-black text-gray-900">{authUser?.first_name} {authUser?.last_name}</h2>
              <p className="text-sm text-gray-500">{authUser?.email}</p>
            </div>
            <span className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-700">{authUser?.role}</span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatCard label="Total Orders" value={loading ? '…' : orders.length} tone="emerald" hint="All time" />
            <StatCard label="Cart Items" value={cartCount} tone="amber" hint="Ready to buy" />
            <StatCard label="Wishlist" value={wishlistCount} tone="violet" hint="Saved items" />
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => navigate('/orders')} className="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 transition">My Orders</button>
            <button onClick={onLogout} className="flex-1 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-200 hover:bg-rose-500/20 transition">Sign Out</button>
          </div>
        </section>
        <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Recent Orders</p>
          <div className="mt-4 space-y-4">
            {loading ? <Spinner /> : orders.slice(0, 4).map((order) => (
              <div key={order.order_id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-900">{order.order_number}</p>
                    <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.order_status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                    {order.order_status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{order.items.length} item(s) · {formatINR(order.total_amount)}</p>
              </div>
            ))}
            {!loading && !orders.length && <p className="text-gray-500 text-sm">No orders yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

function OrdersPage() {
  const { data, loading, error } = useAsync(api.getOrders, []);
  const orders = data?.orders || [];
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">My Orders</h1>
        <p className="mt-1 text-sm text-gray-500">Track and manage all your orders.</p>
      </div>
      {loading ? <Spinner /> : error ? <ErrorBanner message={error} /> : !orders.length ? (
        <EmptyState title="No orders yet" text="Place your first order to see it here." action={<button onClick={() => navigate('/products')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Shop Now</button>} />
      ) : orders.map((order) => (
        <article key={order.order_id} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-black text-gray-900">{order.order_number}</p>
              <p className="text-sm text-gray-500">Placed on {formatDate(order.created_at)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.order_status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>{order.order_status}</span>
              <span className="text-sm text-gray-600">{order.items.length} item(s)</span>
              <span className="text-sm font-bold text-gray-900">{formatINR(order.total_amount)}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {order.items.map((i) => (
              <span key={i.order_item_id} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-0.5 text-xs text-gray-600">
                {i.product?.product_name || 'Product'} ×{i.quantity}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function WishlistPage({ wishlistItems, onAdd, onOpen, onWishlist }) {
  const products = wishlistItems.map((wi) => wi.product).filter(Boolean);
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <h1 className="text-2xl font-black text-gray-900">My Wishlist</h1>
        <p className="mt-1 text-sm text-gray-500">{products.length} saved item{products.length !== 1 ? 's' : ''}</p>
      </div>
      {!products.length ? (
        <EmptyState title="Your Wishlist is empty" text="Save items you love for later." action={<button onClick={() => navigate('/products')} className="rounded-2xl bg-black px-5 py-3 text-sm font-bold text-white">Start Shopping</button>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {wishlistItems.map((wi) => wi.product && (
            <ProductCard key={wi.wishlist_item_id} product={wi.product} onAdd={onAdd} onOpen={onOpen} onWishlist={onWishlist} wishlistItemId={wi.wishlist_item_id} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPage() {
  const { data, loading } = useAsync(api.getAdminStats, []);
  const stats = data || {};
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <span className="inline-flex rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-rose-300">Admin Only</span>
        <h1 className="mt-3 text-2xl font-black text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Live business overview from the database.</p>
      </div>
      {loading ? <Spinner /> : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Customers" value={stats.total_customers?.toLocaleString('en-IN') ?? '—'} tone="cyan" hint="Registered accounts" />
          <StatCard label="Total Revenue" value={stats.total_revenue != null ? formatINR(stats.total_revenue) : '—'} tone="emerald" hint="Gross sales" />
          <StatCard label="Total Orders" value={stats.total_orders?.toLocaleString('en-IN') ?? '—'} tone="amber" hint="All time" />
          <StatCard label="Active Products" value={stats.total_products ?? '—'} tone="violet" hint="Live catalog" />
          <StatCard label="Login Attempts" value={stats.login_attempts?.toLocaleString('en-IN') ?? '—'} tone="blue" hint="All time" />
          <StatCard label="Security Alerts" value={stats.security_alerts ?? '—'} tone="rose" hint="Open alerts" />
          <StatCard label="Fraud Alerts" value={stats.fraud_alerts ?? '—'} tone="amber" hint="Under review" />
        </section>
      )}
      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Revenue Trend" subtitle="Finance" labels={TREND.months} values={TREND.revenue} stroke="#22c55e" fill="rgba(34,197,94,0.16)" />
        <ChartCard title="Order Volume" subtitle="Operations" labels={TREND.months} values={TREND.orders} stroke="#38bdf8" fill="rgba(56,189,248,0.15)" />
      </section>
    </div>
  );
}

function SellerPage() {
  const { data, loading } = useAsync(api.getSellerStats, []);
  const stats = data || {};
  const { data: productsData, loading: productsLoading } = useAsync(() => api.getProducts({ per_page: 20 }), []);
  const products = productsData?.items || [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6">
        <span className="inline-flex rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-300">Seller Portal</span>
        <h1 className="mt-3 text-2xl font-black text-gray-900">Seller Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Live inventory, orders, and sales from the database.</p>
      </div>
      {loading ? <Spinner /> : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Revenue" value={stats.revenue != null ? formatINR(stats.revenue) : '—'} tone="emerald" hint="All time" />
          <StatCard label="Active Listings" value={stats.total_products ?? '—'} tone="cyan" hint="Live products" />
          <StatCard label="Pending Orders" value={stats.pending_orders ?? '—'} tone="rose" hint="To fulfil" />
          <StatCard label="Fulfilled Orders" value={stats.fulfilled_orders ?? '—'} tone="violet" hint="Delivered" />
          <StatCard label="Low Stock" value={stats.low_stock ?? '—'} tone="amber" hint="Restock soon" />
        </section>
      )}
      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300 mb-4">Live Inventory</p>
          {productsLoading ? <Spinner /> : (
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.product_id} className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{p.product_name}</p>
                    <p className="text-xs text-gray-500">{p.categories?.[0]?.category_name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900 text-sm">{formatINR(p.price)}</p>
                    <p className={`text-xs ${p.stock_quantity < 20 ? 'text-rose-300' : 'text-emerald-300'}`}>
                      {p.stock_quantity} in stock {p.stock_quantity < 20 ? '⚠️' : '✓'}
                    </p>
                  </div>
                </div>
              ))}
              {!products.length && <p className="text-gray-500 text-sm text-center py-6">No products listed yet.</p>}
            </div>
          )}
        </div>
        <ChartCard title="Sales Analytics" subtitle="Orders" labels={TREND.months} values={TREND.orders} stroke="#f59e0b" fill="rgba(245,158,11,0.16)" />
      </section>
    </div>
  );
}