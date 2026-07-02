import { useEffect, useMemo, useState } from 'react';

const initialProducts = [
  {
    id: 'aurora-001',
    name: 'Aurora Jacket',
    slug: 'aurora-jacket',
    category: 'Apparel',
    price: 149.0,
    rating: 4.8,
    stock: 24,
    badge: 'New Drop',
    description:
      'Weatherproof shell with a soft fleece lining and a minimalist silhouette that works day to night.',
    features: ['Water resistant shell', 'Thermal fleece', 'Hidden pockets'],
    palette: ['from-cyan-400 via-sky-500 to-blue-600', 'from-slate-950 via-slate-800 to-slate-700'],
  },
  {
    id: 'orbit-002',
    name: 'Orbit Headphones',
    slug: 'orbit-headphones',
    category: 'Audio',
    price: 219.0,
    rating: 4.9,
    stock: 18,
    badge: 'Bestseller',
    description:
      'Adaptive noise cancellation, deep spatial audio, and a long battery life for focused work sessions.',
    features: ['Noise cancellation', 'Spatial audio', '30-hour battery'],
    palette: ['from-fuchsia-400 via-pink-500 to-orange-500', 'from-zinc-950 via-zinc-800 to-zinc-700'],
  },
  {
    id: 'atlas-003',
    name: 'Atlas Backpack',
    slug: 'atlas-backpack',
    category: 'Accessories',
    price: 89.0,
    rating: 4.7,
    stock: 37,
    badge: 'Editor Pick',
    description:
      'Structured travel pack with a padded laptop sleeve, luggage pass-through, and anti-theft zipper design.',
    features: ['Laptop sleeve', 'Travel strap', 'Anti-theft design'],
    palette: ['from-emerald-400 via-teal-500 to-cyan-500', 'from-stone-950 via-stone-800 to-stone-700'],
  },
  {
    id: 'nova-004',
    name: 'Nova Watch',
    slug: 'nova-watch',
    category: 'Wearables',
    price: 329.0,
    rating: 4.9,
    stock: 12,
    badge: 'Limited',
    description:
      'A premium smart watch with sleep tracking, fast charging, and an always-on display built for movement.',
    features: ['Sleep tracking', 'Fast charge', 'Always-on display'],
    palette: ['from-amber-300 via-orange-400 to-rose-500', 'from-neutral-950 via-neutral-800 to-neutral-700'],
  },
  {
    id: 'pulse-005',
    name: 'Pulse Bottle',
    slug: 'pulse-bottle',
    category: 'Lifestyle',
    price: 39.0,
    rating: 4.6,
    stock: 71,
    badge: 'Sustainable',
    description:
      'Insulated stainless bottle with a leak-proof cap and matte finish for everyday carry.',
    features: ['Insulated steel', 'Leak proof', 'Matte finish'],
    palette: ['from-lime-300 via-emerald-400 to-green-600', 'from-slate-950 via-slate-800 to-slate-700'],
  },
  {
    id: 'mono-006',
    name: 'Mono Desk Lamp',
    slug: 'mono-desk-lamp',
    category: 'Home',
    price: 74.0,
    rating: 4.7,
    stock: 26,
    badge: 'Desk Essential',
    description:
      'Slim lamp with adjustable temperature settings and a weighted base for focused work lighting.',
    features: ['Adjustable warmth', 'Weighted base', 'USB-C power'],
    palette: ['from-violet-400 via-indigo-500 to-blue-600', 'from-slate-950 via-slate-800 to-slate-700'],
  },
];

const productInsights = [
  { label: 'Secure checkout', value: 'CSRF + token-aware flow' },
  { label: 'Fast shipping', value: '2-4 day dispatch window' },
  { label: 'Support', value: '24/7 order assistance' },
];

const dashboardTrend = {
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  revenue: [28, 34, 42, 39, 56, 64],
  orders: [18, 21, 25, 29, 31, 36],
  loginAttempts: [40, 49, 52, 47, 59, 64],
  securityAlerts: [4, 5, 3, 6, 5, 4],
  fraudAlerts: [2, 2, 4, 3, 5, 6],
};

const routeConfig = [
  { path: '/', label: 'Home' },
  { path: '/products', label: 'Products' },
  { path: '/cart', label: 'Cart' },
  { path: '/orders', label: 'Orders' },
  { path: '/admin', label: 'Admin Dashboard' },
  { path: '/seller', label: 'Seller Dashboard' },
];

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path] = hash.split('?');

  if (path === '/login' || path === '/register' || path === '/products' || path === '/cart' || path === '/checkout' || path === '/profile' || path === '/orders' || path === '/admin' || path === '/seller') {
    return { path };
  }

  if (path.startsWith('/products/')) {
    return { path: '/product', slug: decodeURIComponent(path.replace('/products/', '')) };
  }

  if (path.startsWith('/product/')) {
    return { path: '/product', slug: decodeURIComponent(path.replace('/product/', '')) };
  }

  return { path: '/' };
}

function navigate(path) {
  window.location.hash = path;
}

function createEmptyUser() {
  return { name: '', email: '', role: 'Customer' };
}

function createSeedOrders() {
  return [
    {
      id: 'ORD-10048',
      createdAt: new Date().toISOString(),
      status: 'Processing',
      total: 438.0,
      items: [
        { name: 'Aurora Jacket', quantity: 1, price: 149 },
        { name: 'Orbit Headphones', quantity: 1, price: 219 },
        { name: 'Pulse Bottle', quantity: 1, price: 39 },
      ],
    },
  ];
}

function createSeedAlerts() {
  return [
    { type: 'Security', label: 'Multiple failed logins', time: '5m ago', severity: 'High' },
    { type: 'Fraud', label: 'Payment risk score elevated', time: '20m ago', severity: 'Medium' },
    { type: 'Security', label: 'New device session created', time: '1h ago', severity: 'Low' },
  ];
}

function setQuantity(cartItems, productId, delta) {
  return cartItems
    .map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
    .filter(Boolean);
}

function linePath(values, width, height, padding) {
  if (!values.length) {
    return '';
  }

  const maxValue = Math.max(...values, 1);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (innerWidth / Math.max(values.length - 1, 1)) * index;
      const y = padding + innerHeight - (value / maxValue) * innerHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function Shell({ title, eyebrow, description, children, action }) {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_30px_100px_rgba(2,6,23,0.45)] ring-1 ring-white/5 backdrop-blur-xl">
        <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[1.35fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-200">
              {eyebrow}
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">{title}</h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 md:text-lg">{description}</p>
            </div>
            {action}
          </div>
          <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {productInsights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone = 'cyan', hint }) {
  const toneClasses = {
    cyan: 'from-cyan-500/20 to-blue-500/10 border-cyan-400/20',
    emerald: 'from-emerald-500/20 to-teal-500/10 border-emerald-400/20',
    amber: 'from-amber-500/20 to-orange-500/10 border-amber-400/20',
    rose: 'from-rose-500/20 to-pink-500/10 border-rose-400/20',
    violet: 'from-violet-500/20 to-indigo-500/10 border-violet-400/20',
  };

  return (
    <article className={`rounded-3xl border bg-gradient-to-br p-5 shadow-lg ${toneClasses[tone]}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <strong className="text-3xl font-black text-white md:text-4xl">{value}</strong>
        <span className="text-xs text-slate-300">{hint}</span>
      </div>
    </article>
  );
}

function ProductTile({ product, onAdd, onOpen }) {
  return (
    <article className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/75 shadow-[0_20px_70px_rgba(2,6,23,0.35)] transition-transform duration-300 hover:-translate-y-1">
      <div className={`relative h-52 bg-gradient-to-br ${product.palette[0]} p-5`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${product.palette[1]} opacity-70`} />
        <div className="relative flex h-full flex-col justify-between">
          <div className="flex items-start justify-between">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
              {product.badge}
            </span>
            <span className="rounded-full bg-slate-950/50 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {product.category}
            </span>
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-white/70">Premium selection</p>
            <h3 className="mt-2 text-2xl font-black text-white">{product.name}</h3>
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400">{product.rating.toFixed(1)} rating</span>
          <span className="text-xl font-black text-white">{formatCurrency(product.price)}</span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-slate-300">{product.description}</p>
        <div className="flex flex-wrap gap-2">
          {product.features.map((feature) => (
            <span key={feature} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              {feature}
            </span>
          ))}
        </div>
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => onOpen(product)}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View details
          </button>
          <button
            type="button"
            onClick={() => onAdd(product)}
            className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110"
          >
            Add to cart
          </button>
        </div>
      </div>
    </article>
  );
}

function ChartCard({ title, subtitle, labels, values, stroke = '#38bdf8', fill = 'rgba(56,189,248,0.18)' }) {
  const width = 900;
  const height = 300;
  const padding = 32;
  const path = linePath(values, width, height, padding);

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{subtitle}</p>
          <h3 className="mt-2 text-xl font-black text-white">{title}</h3>
        </div>
        <span className="text-sm text-slate-400">Last 6 months</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full overflow-visible" role="img" aria-label={title}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = padding + (height - padding * 2) * tick;
          return <line key={tick} x1={padding} x2={width - padding} y1={y} y2={y} className="stroke-white/10" />;
        })}
        <path d={`${path} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`} fill={fill} />
        <path d={path} fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => {
          const x = padding + (width - padding * 2) / Math.max(values.length - 1, 1) * index;
          const y = padding + (height - padding * 2) - (value / Math.max(...values, 1)) * (height - padding * 2);
          return <circle key={labels[index]} cx={x} cy={y} r="5.5" fill={stroke} />;
        })}
        {labels.map((label, index) => {
          const x = padding + (width - padding * 2) / Math.max(labels.length - 1, 1) * index;
          return (
            <text key={label} x={x} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">
              {label}
            </text>
          );
        })}
      </svg>
    </section>
  );
}

function App() {
  const [route, setRoute] = useState(parseRoute);
  const [products] = useState(initialProducts);
  const [cart, setCart] = useState(() => loadJson('cart', []));
  const [orders, setOrders] = useState(() => loadJson('orders', createSeedOrders()));
  const [alerts] = useState(createSeedAlerts);
  const [authUser, setAuthUser] = useState(() => loadJson('authUser', createEmptyUser()));
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [checkoutForm, setCheckoutForm] = useState({
    name: authUser.name || '',
    email: authUser.email || '',
    address: '',
    city: '',
    country: 'United States',
    paymentMethod: 'card',
  });

  useEffect(() => {
    const handleHashChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    saveJson('cart', cart);
  }, [cart]);

  useEffect(() => {
    saveJson('orders', orders);
  }, [orders]);

  useEffect(() => {
    saveJson('authUser', authUser);
    setCheckoutForm((current) => ({
      ...current,
      name: authUser.name || current.name,
      email: authUser.email || current.email,
    }));
  }, [authUser]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(''), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(() => ['All', ...new Set(products.map((item) => item.category))], [products]);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);

  const cartSubtotal = useMemo(
    () => cart.reduce((total, item) => total + item.quantity * item.price, 0),
    [cart],
  );

  const cartTax = cartSubtotal * 0.08;
  const cartShipping = cart.length ? 12 : 0;
  const cartTotal = cartSubtotal + cartTax + cartShipping;

  const featuredProducts = useMemo(() => products.slice(0, 3), [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return products
      .filter((product) => (category === 'All' ? true : product.category === category))
      .filter((product) => {
        if (!normalizedSearch) {
          return true;
        }

        return [product.name, product.description, product.category, ...product.features]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((left, right) => {
        if (sortBy === 'price-low') return left.price - right.price;
        if (sortBy === 'price-high') return right.price - left.price;
        if (sortBy === 'rating') return right.rating - left.rating;
        return left.name.localeCompare(right.name);
      });
  }, [category, products, search, sortBy]);

  const currentProduct = useMemo(
    () => products.find((item) => item.slug === route.slug || item.id === route.slug),
    [products, route.slug],
  );

  const orderStats = useMemo(
    () => ({
      totalRevenue: orders.reduce((total, order) => total + order.total, 0),
      totalOrders: orders.length,
      openOrders: orders.filter((order) => order.status !== 'Delivered').length,
    }),
    [orders],
  );

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }

      return [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} added to cart.`);
  }

  function goToProduct(product) {
    navigate(`/product/${product.slug}`);
  }

  function updateQuantity(productId, delta) {
    setCart((current) => setQuantity(current, productId, delta));
  }

  function removeFromCart(productId) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  function handleAuthSubmit(event, role) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '').trim();
    const name = String(form.get('name') || email.split('@')[0] || 'Guest').trim();
    const userRole = role || String(form.get('role') || 'Customer');
    setAuthUser({ name, email, role: userRole });
    setNotice(`${name} signed in as ${userRole}.`);
    navigate('/profile');
  }

  function handleCheckout(event) {
    event.preventDefault();
    if (!cart.length) {
      setNotice('Your cart is empty.');
      return;
    }

    const newOrder = {
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
      status: 'Processing',
      total: Number(cartTotal.toFixed(2)),
      items: cart.map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
      paymentMethod: checkoutForm.paymentMethod,
      shipping: {
        name: checkoutForm.name,
        address: checkoutForm.address,
        city: checkoutForm.city,
        country: checkoutForm.country,
      },
    };

    setOrders((current) => [newOrder, ...current]);
    setCart([]);
    setNotice(`Order ${newOrder.id} placed successfully.`);
    navigate('/orders');
  }

  const adminMetrics = {
    totalUsers: 12480,
    revenue: '$148,920',
    orders: 2148,
    products: products.length,
    loginAttempts: 638,
    securityAlerts: 22,
    fraudAlerts: 8,
  };

  const sellerMetrics = {
    productViews: 8210,
    conversionRate: '4.8%',
    activeListings: products.length,
    lowStock: products.filter((item) => item.stock < 20).length,
    fulfilledOrders: orders.filter((order) => order.status === 'Delivered').length,
  };

  function renderPage() {
    if (route.path === '/') {
      return (
        <Shell
          eyebrow="Modern commerce"
          title="A responsive React storefront with customer, seller, and admin experiences."
          description="Browse products, manage your cart, complete checkout, review orders, and switch into operational dashboards for administration and selling. Built with Tailwind CSS and optimized for mobile and desktop layouts."
          action={
            <div className="flex flex-wrap gap-3">
              <button onClick={() => navigate('/products')} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110">
                Shop products
              </button>
              <button onClick={() => navigate('/admin')} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                View admin dashboard
              </button>
            </div>
          }
        >
          <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="grid gap-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Products" value={products.length} tone="cyan" hint="Curated catalog" />
                <StatCard label="Orders" value={orders.length} tone="emerald" hint="Recent activity" />
                <StatCard label="Revenue" value={formatCurrency(orderStats.totalRevenue)} tone="amber" hint="Lifetime sales" />
              </div>
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Featured</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Best-selling essentials</h2>
                  </div>
                  <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white" onClick={() => navigate('/products')}>
                    Explore catalog
                  </button>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {featuredProducts.map((product) => (
                    <ProductTile key={product.id} product={product} onAdd={addToCart} onOpen={goToProduct} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Platform highlights</p>
                <div className="mt-5 grid gap-4">
                  {[
                    'Mobile-first commerce experience',
                    'Dedicated admin and seller views',
                    'Persistent cart, profile, and orders',
                    'Fast route switching without page reloads',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <ChartCard
                title="Revenue trend"
                subtitle="Sales performance"
                labels={dashboardTrend.months}
                values={dashboardTrend.revenue}
                stroke="#22c55e"
                fill="rgba(34,197,94,0.16)"
              />
            </div>
          </section>
        </Shell>
      );
    }

    if (route.path === '/login') {
      return (
        <Shell
          eyebrow="Auth"
          title="Login"
          description="Sign in to access your profile, manage orders, and switch into seller or admin views for the dashboard pages."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <form onSubmit={(event) => handleAuthSubmit(event, '')} className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="email" label="Email" type="email" placeholder="you@example.com" />
                <Input name="password" label="Password" type="password" placeholder="••••••••" />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Sign in</button>
                <button type="button" onClick={() => navigate('/register')} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white">
                  Create account
                </button>
                <button type="button" onClick={() => setAuthUser({ name: 'Admin User', email: 'admin@example.com', role: 'Admin' })} className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-3 text-sm font-semibold text-rose-100">
                  Demo admin
                </button>
              </div>
            </form>
            <aside className="rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-950/80 to-slate-900/50 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Access levels</p>
              <div className="mt-5 space-y-4">
                {[
                  ['Customer', 'Browse products, checkout, and track orders.'],
                  ['Seller', 'Manage listings and inventory.'],
                  ['Admin', 'Review metrics, logs, and alerts.'],
                ].map(([role, text]) => (
                  <div key={role} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="font-semibold text-white">{role}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </Shell>
      );
    }

    if (route.path === '/register') {
      return (
        <Shell
          eyebrow="Auth"
          title="Register"
          description="Create a new account to start shopping and keep your cart, profile, and orders synchronized locally in the browser."
        >
          <form onSubmit={(event) => handleAuthSubmit(event, '')} className="grid gap-6 rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)] lg:grid-cols-[1fr_0.8fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input name="name" label="Full name" placeholder="Avery Stone" />
              <Input name="email" label="Email" type="email" placeholder="you@example.com" />
              <Input name="password" label="Password" type="password" placeholder="••••••••" />
              <Select name="role" label="Role">
                <option>Customer</option>
                <option>Seller</option>
                <option>Admin</option>
              </Select>
            </div>
            <div className="flex flex-col justify-between gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Start fast</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  This frontend is designed as a polished shell. You can later wire the form to the Flask backend without changing the layout or routing structure.
                </p>
              </div>
              <button className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Create account</button>
            </div>
          </form>
        </Shell>
      );
    }

    if (route.path === '/products') {
      return (
        <Shell
          eyebrow="Catalog"
          title="Products"
          description="Search, sort, and browse the catalog with a responsive grid that adapts cleanly from phones to large screens."
        >
          <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)] lg:grid-cols-[1.2fr_auto_auto]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} name="search" label="Search" placeholder="Search products, features, categories" />
            <Select value={category} onChange={(event) => setCategory(event.target.value)} name="category" label="Category">
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
            <Select value={sortBy} onChange={(event) => setSortBy(event.target.value)} name="sort" label="Sort">
              <option value="featured">Featured</option>
              <option value="rating">Top rated</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </Select>
          </div>

          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => (
              <ProductTile key={product.id} product={product} onAdd={addToCart} onOpen={goToProduct} />
            ))}
          </section>
        </Shell>
      );
    }

    if (route.path === '/product' && currentProduct) {
      return (
        <Shell
          eyebrow="Catalog"
          title={currentProduct.name}
          description={currentProduct.description}
          action={
            <div className="flex flex-wrap gap-3">
              <button onClick={() => addToCart(currentProduct)} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">
                Add to cart
              </button>
              <button onClick={() => navigate('/products')} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white">
                Back to products
              </button>
            </div>
          }
        >
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className={`rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${currentProduct.palette[0]} p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]`}>
              <div className={`h-full rounded-[1.5rem] bg-gradient-to-br ${currentProduct.palette[1]} p-6`}>
                <div className="flex h-full flex-col justify-between">
                  <span className="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white backdrop-blur">
                    {currentProduct.badge}
                  </span>
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-white/70">{currentProduct.category}</p>
                    <h2 className="mt-2 text-4xl font-black text-white">{currentProduct.name}</h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-white/85 md:text-base">{currentProduct.description}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-5 rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Price</p>
                  <h3 className="mt-2 text-3xl font-black text-white">{formatCurrency(currentProduct.price)}</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">{currentProduct.stock} in stock</span>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Highlights</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {currentProduct.features.map((feature) => (
                    <span key={feature} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Rating" value={currentProduct.rating.toFixed(1)} tone="violet" hint="Customer favorite" />
                <StatCard label="Category" value={currentProduct.category} tone="cyan" hint="Browse similar" />
                <StatCard label="Badge" value={currentProduct.badge} tone="emerald" hint="Curated pick" />
              </div>
            </div>
          </section>
        </Shell>
      );
    }

    if (route.path === '/cart') {
      return (
        <Shell
          eyebrow="Commerce"
          title="Cart"
          description="Review selected items, adjust quantities, and move straight into checkout on a layout that works across devices."
          action={<button onClick={() => navigate('/checkout')} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Checkout</button>}
        >
          <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              {cart.length === 0 ? (
                <EmptyState title="Your cart is empty" text="Add products from the catalog to start building your order." action={<button onClick={() => navigate('/products')} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Browse products</button>} />
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.category}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(item.id, -1)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white">-</button>
                      <span className="min-w-8 text-center text-sm text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white">+</button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-white">{formatCurrency(item.price * item.quantity)}</span>
                      <button onClick={() => removeFromCart(item.id)} className="text-sm text-rose-200 hover:text-rose-100">Remove</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <aside className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Summary</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <Row label="Subtotal" value={formatCurrency(cartSubtotal)} />
                <Row label="Tax" value={formatCurrency(cartTax)} />
                <Row label="Shipping" value={formatCurrency(cartShipping)} />
                <Row label="Total" value={formatCurrency(cartTotal)} strong />
              </div>
            </aside>
          </div>
        </Shell>
      );
    }

    if (route.path === '/checkout') {
      return (
        <Shell
          eyebrow="Commerce"
          title="Checkout"
          description="Complete a polished checkout flow with order summary, shipping details, and payment selection."
        >
          <form onSubmit={handleCheckout} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)] sm:grid-cols-2">
              <Input label="Full name" name="name" value={checkoutForm.name} onChange={(event) => setCheckoutForm((current) => ({ ...current, name: event.target.value }))} />
              <Input label="Email" name="email" type="email" value={checkoutForm.email} onChange={(event) => setCheckoutForm((current) => ({ ...current, email: event.target.value }))} />
              <Input label="Address" name="address" value={checkoutForm.address} onChange={(event) => setCheckoutForm((current) => ({ ...current, address: event.target.value }))} />
              <Input label="City" name="city" value={checkoutForm.city} onChange={(event) => setCheckoutForm((current) => ({ ...current, city: event.target.value }))} />
              <Select label="Country" name="country" value={checkoutForm.country} onChange={(event) => setCheckoutForm((current) => ({ ...current, country: event.target.value }))}>
                <option>United States</option>
                <option>Canada</option>
                <option>United Kingdom</option>
                <option>Australia</option>
              </Select>
              <Select label="Payment method" name="paymentMethod" value={checkoutForm.paymentMethod} onChange={(event) => setCheckoutForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                <option value="card">Card</option>
                <option value="wallet">Wallet</option>
                <option value="bank_transfer">Bank Transfer</option>
              </Select>
            </div>
            <aside className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Order summary</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                {cart.map((item) => (
                  <Row key={item.id} label={`${item.name} × ${item.quantity}`} value={formatCurrency(item.price * item.quantity)} />
                ))}
                <Row label="Subtotal" value={formatCurrency(cartSubtotal)} />
                <Row label="Tax" value={formatCurrency(cartTax)} />
                <Row label="Shipping" value={formatCurrency(cartShipping)} />
                <Row label="Total" value={formatCurrency(cartTotal)} strong />
              </div>
              <button className="mt-5 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">
                Place order
              </button>
            </aside>
          </form>
        </Shell>
      );
    }

    if (route.path === '/profile') {
      return (
        <Shell
          eyebrow="Account"
          title="Profile"
          description="Review your account details, recent activity, and a compact view of your security posture."
        >
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Signed in as</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{authUser.name || 'Guest User'}</h2>
                  <p className="mt-2 text-sm text-slate-400">{authUser.email || 'No email set'}</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">{authUser.role || 'Customer'}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <StatCard label="Orders" value={orders.length} tone="emerald" hint="Stored locally" />
                <StatCard label="Cart Items" value={cartCount} tone="amber" hint="Ready for checkout" />
                <StatCard label="Status" value="Active" tone="cyan" hint="Session live" />
              </div>
            </section>
            <section className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Recent orders</p>
              <div className="mt-4 space-y-4">
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{order.id}</p>
                        <p className="text-sm text-slate-400">{formatDate(order.createdAt)}</p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">{order.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">{order.items.length} item(s) · {formatCurrency(order.total)}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Shell>
      );
    }

    if (route.path === '/orders') {
      return (
        <Shell
          eyebrow="Orders"
          title="Order history"
          description="A compact order feed with shipment status, item counts, and totals."
        >
          <div className="grid gap-4">
            {orders.length === 0 ? (
              <EmptyState title="No orders yet" text="Your orders will appear here after checkout." action={<button onClick={() => navigate('/products')} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Shop now</button>} />
            ) : (
              orders.map((order) => (
                <article key={order.id} className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-lg font-bold text-white">{order.id}</p>
                      <p className="text-sm text-slate-400">{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">{order.status}</span>
                      <span className="text-sm text-slate-300">{order.items.length} items</span>
                      <span className="text-sm font-semibold text-white">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </Shell>
      );
    }

    if (route.path === '/admin') {
      return (
        <Shell
          eyebrow="Admin"
          title="Admin dashboard"
          description="Monitor users, revenue, orders, products, login attempts, security alerts, and fraud alerts through dashboard cards and charts."
        >
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Users" value={adminMetrics.totalUsers} tone="cyan" hint="Registered accounts" />
            <StatCard label="Revenue" value={adminMetrics.revenue} tone="emerald" hint="Gross sales" />
            <StatCard label="Orders" value={adminMetrics.orders} tone="amber" hint="Lifecycle tracked" />
            <StatCard label="Products" value={adminMetrics.products} tone="violet" hint="Catalog count" />
            <StatCard label="Login Attempts" value={adminMetrics.loginAttempts} tone="blue" hint="Auth activity" />
            <StatCard label="Security Alerts" value={adminMetrics.securityAlerts} tone="rose" hint="Defensive events" />
            <StatCard label="Fraud Alerts" value={adminMetrics.fraudAlerts} tone="amber" hint="Risk review" />
          </section>
          <section className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Revenue trend" subtitle="Finance" labels={dashboardTrend.months} values={dashboardTrend.revenue} stroke="#22c55e" fill="rgba(34,197,94,0.16)" />
            <ChartCard title="Operational activity" subtitle="Security + Orders" labels={dashboardTrend.months} values={dashboardTrend.orders} stroke="#38bdf8" fill="rgba(56,189,248,0.15)" />
          </section>
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Alert feed</p>
              <div className="mt-4 space-y-3">
                {alerts.map((alert) => (
                  <div key={`${alert.type}-${alert.time}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <p className="font-semibold text-white">{alert.label}</p>
                      <p className="text-sm text-slate-400">{alert.type} · {alert.time}</p>
                    </div>
                    <span className="rounded-full bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-100">{alert.severity}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Login attempts</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                {dashboardTrend.loginAttempts.map((count, index) => (
                  <Row key={dashboardTrend.months[index]} label={dashboardTrend.months[index]} value={count} strong />
                ))}
              </div>
            </div>
          </section>
        </Shell>
      );
    }

    if (route.path === '/seller') {
      return (
        <Shell
          eyebrow="Seller"
          title="Seller dashboard"
          description="Track listings, product health, and sales performance with a compact operations view." 
        >
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Product views" value={sellerMetrics.productViews} tone="cyan" hint="Traffic" />
            <StatCard label="Conversion rate" value={sellerMetrics.conversionRate} tone="emerald" hint="Conversion" />
            <StatCard label="Active listings" value={sellerMetrics.activeListings} tone="violet" hint="Catalog" />
            <StatCard label="Low stock" value={sellerMetrics.lowStock} tone="amber" hint="Reorder soon" />
            <StatCard label="Fulfilled orders" value={sellerMetrics.fulfilledOrders} tone="rose" hint="Delivered" />
          </section>
          <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/75 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.35)]">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Inventory</p>
              <div className="mt-4 space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div>
                      <p className="font-semibold text-white">{product.name}</p>
                      <p className="text-sm text-slate-400">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(product.price)}</p>
                      <p className="text-sm text-slate-400">{product.stock} in stock</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <ChartCard title="Order velocity" subtitle="Sales" labels={dashboardTrend.months} values={dashboardTrend.orders} stroke="#f59e0b" fill="rgba(245,158,11,0.16)" />
          </section>
        </Shell>
      );
    }

    return <Shell eyebrow="Not found" title="Page not found" description="The requested page could not be resolved." />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.13),_transparent_32%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <header className="sticky top-4 z-40 mb-6 rounded-[1.75rem] border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-4">
              <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-lg font-black shadow-lg shadow-cyan-950/40">
                  S
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-wide text-white">Security Commerce</p>
                  <p className="text-xs text-slate-400">React storefront</p>
                </div>
              </button>
              <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white lg:hidden" onClick={() => navigate('/products')}>
                Shop
              </button>
            </div>
            <nav className="flex flex-wrap items-center gap-2">
              {routeConfig.map((item) => {
                const isActive = route.path === item.path || (item.path === '/products' && route.path === '/product');
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      isActive ? 'bg-white text-slate-950' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button onClick={() => navigate('/login')} className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100">
                {authUser.name ? authUser.name : 'Login'}
              </button>
            </nav>
          </div>
        </header>

        {notice ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 shadow-lg shadow-emerald-950/20">
            {notice}
          </div>
        ) : null}

        {renderPage()}
      </div>
    </div>
  );
}

function Input({ label, name, type = 'text', value, onChange, placeholder }) {
  const fieldProps =
    value !== undefined
      ? { value, onChange: onChange || (() => {}) }
      : { defaultValue: '' };

  return (
    <label className="grid gap-2 text-sm text-slate-200">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        {...fieldProps}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
      />
    </label>
  );
}

function Select({ label, name, value, onChange, children }) {
  return (
    <label className="grid gap-2 text-sm text-slate-200">
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
      >
        {children}
      </select>
    </label>
  );
}

function Row({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 ${strong ? 'text-white' : 'text-slate-300'}`}>
      <span>{label}</span>
      <span className={strong ? 'font-black' : 'font-semibold'}>{value}</span>
    </div>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="grid place-items-center rounded-[1.75rem] border border-dashed border-white/15 bg-white/5 px-6 py-14 text-center">
      <div className="max-w-md space-y-3">
        <h3 className="text-2xl font-black text-white">{title}</h3>
        <p className="text-sm leading-7 text-slate-300">{text}</p>
        <div className="pt-2">{action}</div>
      </div>
    </div>
  );
}

export default App;