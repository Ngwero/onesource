const API = "/api/products";
const CATEGORIES_API = "/api/categories";
const HERO_API = "/api/hero/slides";
const ORDERS_API = "/api/orders";
const HEALTH = "/api/health";
const ADMIN_STATS = "/api/admin/stats";
let SHOP = "http://localhost:5173";

async function detectShopUrl() {
  const host = location.hostname || "localhost";
  for (const port of [5173, 5174, 5175]) {
    try {
      await fetch(`http://${host}:${port}/`, {
        mode: "no-cors",
        signal: AbortSignal.timeout(1200),
      });
      SHOP = `http://${host}:${port}`;
      document.querySelectorAll("[data-shop-link]").forEach((a) => {
        a.href = SHOP;
      });
      return;
    } catch {
      /* try next port */
    }
  }
}

let categories = [];
let products = [];
let heroSlides = [];
let orders = [];
let editingOrderId = null;
let editingId = null;
let editingHeroId = null;
let currentView = "dashboard";
let confirmCallback = null;
let lastRefresh = null;
let productsPage = 1;
let ordersPage = 1;
let productsPageSize = 50;
let ordersPageSize = 50;
let productsSort = { key: "updatedAt", dir: "desc" };
const selectedProductIds = new Set();
let showInactiveHero = false;

const CHART_PALETTE = [
  "#2e5e4a",
  "#3d7a62",
  "#b4cf5a",
  "#e8b82a",
  "#5c8f75",
  "#1a3d31",
  "#9cb84a",
  "#c99a1a",
  "#6b9268",
  "#244a3b",
  "#d4a017",
  "#8fa88a",
];

let dashboardCharts = {};

function destroyDashboardCharts() {
  Object.values(dashboardCharts).forEach((chart) => {
    try {
      chart?.destroy();
    } catch {
      /* ignore */
    }
  });
  dashboardCharts = {};
}

function buildCategoryPieSlices() {
  const counts = new Map();
  for (const p of products) {
    const id = normalizeCategoryId(p.category);
    const name = catName(id);
    const icon = catIcon(id);
    const key = id;
    const prev = counts.get(key) || { label: `${icon} ${name}`, count: 0 };
    prev.count += 1;
    counts.set(key, prev);
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  const topN = 7;
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const labels = top.map((x) => x.label);
  const data = top.map((x) => x.count);
  if (rest.length) {
    labels.push("Other");
    data.push(rest.reduce((s, x) => s + x.count, 0));
  }
  return { labels, data };
}

function renderDashboardPieChart(canvasId, emptyId, labels, data, extra = {}) {
  const canvas = $(canvasId);
  const emptyEl = emptyId ? $(emptyId) : null;
  if (!canvas) return;

  const total = data.reduce((s, n) => s + n, 0);
  if (total === 0) {
    if (dashboardCharts[canvasId]) {
      dashboardCharts[canvasId].destroy();
      delete dashboardCharts[canvasId];
    }
    canvas.style.display = "none";
    if (emptyEl) {
      emptyEl.hidden = false;
    }
    return;
  }

  canvas.style.display = "";
  if (emptyEl) emptyEl.hidden = true;

  if (typeof Chart === "undefined") {
    if (emptyEl) {
      emptyEl.textContent = "Charts library loading… refresh the page.";
      emptyEl.hidden = false;
    }
    return;
  }

  if (dashboardCharts[canvasId]) {
    dashboardCharts[canvasId].destroy();
  }

  const colors =
    extra.colors ?? labels.map((_, i) => CHART_PALETTE[i % CHART_PALETTE.length]);

  dashboardCharts[canvasId] = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderColor: "#ffffff",
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: extra.cutout ?? "55%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 10,
            font: { family: "'DM Sans', system-ui, sans-serif", size: 11 },
            color: "#3d423c",
          },
        },
        tooltip: {
          backgroundColor: "#1a3d31",
          titleFont: { family: "'DM Sans', system-ui, sans-serif", weight: "600" },
          bodyFont: { family: "'DM Sans', system-ui, sans-serif" },
          padding: 10,
          callbacks: {
            label(ctx) {
              const v = ctx.parsed ?? 0;
              const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${v.toLocaleString()} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

function computeStockPieBuckets() {
  let healthy = 0;
  let low = 0;
  let out = 0;
  for (const p of products) {
    if (!p.inStock || p.stockQuantity <= 0) out += 1;
    else if (p.stockQuantity <= 10) low += 1;
    else healthy += 1;
  }
  return { healthy, low, out };
}

function renderDashboardCharts(stats, orderStats) {
  destroyDashboardCharts();

  const cat = buildCategoryPieSlices();
  renderDashboardPieChart("chartCategoryPie", "chartCategoryPieEmpty", cat.labels, cat.data);

  const stock = computeStockPieBuckets();
  renderDashboardPieChart(
    "chartStockPie",
    null,
    ["In stock (>10 units)", "Low stock (1–10)", "Out of stock"],
    [stock.healthy, stock.low, stock.out],
    { colors: ["#2e5e4a", "#e8b82a", "#b42318"] }
  );

  const statusCounts = {};
  for (const key of Object.keys(ORDER_STATUS_LABELS)) statusCounts[key] = 0;
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  });
  const orderLabels = [];
  const orderData = [];
  for (const [id, label] of Object.entries(ORDER_STATUS_LABELS)) {
    const n = statusCounts[id] || 0;
    if (n > 0) {
      orderLabels.push(label);
      orderData.push(n);
    }
  }
  renderDashboardPieChart("chartOrdersPie", "chartOrdersPieEmpty", orderLabels, orderData);
}

const LEGACY_CATEGORY_MAP = {
  fruit: "fresh-fruits",
  berries: "fresh-fruits",
  citrus: "fresh-fruits",
  tropical: "fresh-fruits",
  vegetables: "fresh-vegetables",
  "salad-herbs": "fresh-vegetables",
  "root-veg": "roots-and-tubers",
  "root-crops-and-tubers": "roots-and-tubers",
};

const $ = (id) => document.getElementById(id);

const viewTitles = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  products: "Products",
  inventory: "Inventory",
  catalog: "Categories",
  categories: "Category banners",
  hero: "Hero carousel",
  orders: "Orders",
  customers: "Customers",
  settings: "Settings",
};

function normalizeCategoryId(raw) {
  if (!raw?.trim()) return "uncategorized";
  const trimmed = raw.trim();
  const mapped = LEGACY_CATEGORY_MAP[trimmed] ?? trimmed;
  if (categories.some((c) => c.id === mapped)) return mapped;
  const byName = categories.find((c) => c.name.toLowerCase() === mapped.toLowerCase());
  return byName?.id ?? mapped;
}

function categoryMatchAliases(categoryId) {
  const normalized = normalizeCategoryId(categoryId);
  const aliases = new Set([normalized, categoryId.trim()]);
  for (const [legacy, target] of Object.entries(LEGACY_CATEGORY_MAP)) {
    if (target === normalized) aliases.add(legacy);
  }
  return [...aliases];
}

function productMatchesCategory(productCategory, filterCategoryId) {
  if (!filterCategoryId) return true;
  const raw = (productCategory ?? "").trim();
  if (!raw) return false;
  const aliases = categoryMatchAliases(filterCategoryId);
  if (aliases.includes(raw)) return true;
  return normalizeCategoryId(raw) === normalizeCategoryId(filterCategoryId);
}

function paginate(items, page, size) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), pages);
  const start = (safePage - 1) * size;
  return { items: items.slice(start, start + size), page: safePage, pages, total };
}

function renderPagination(elId, metaId, { page, pages, total }, onPage) {
  const el = $(elId);
  const meta = $(metaId);
  if (meta) meta.textContent = `${total.toLocaleString()} total · page ${page} of ${pages}`;
  if (!el) return;
  if (pages <= 1) {
    el.innerHTML = "";
    return;
  }
  const btns = [];
  btns.push(`<button type="button" class="btn btn-secondary btn-sm" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Prev</button>`);
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) {
    btns.push(`<button type="button" class="btn btn-secondary btn-sm${i === page ? " active" : ""}" data-page="${i}">${i}</button>`);
  }
  btns.push(`<button type="button" class="btn btn-secondary btn-sm" data-page="${page + 1}" ${page >= pages ? "disabled" : ""}>Next</button>`);
  el.innerHTML = btns.join("");
  el.querySelectorAll("[data-page]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = Number(btn.dataset.page);
      if (next >= 1 && next <= pages) onPage(next);
    });
  });
}

function updateTopbarMeta() {
  const el = $("topbarMeta");
  if (!el) return;
  const refreshed = lastRefresh
    ? `Updated ${lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
    : "";
  el.textContent = `${products.length} products · ${orders.length} orders${refreshed ? ` · ${refreshed}` : ""}`;
}

function updateNavBadges() {
  const pc = $("navProductsCount");
  if (pc) pc.textContent = String(products.length);
  const placed = orders.filter((o) => o.status === "placed").length;
  const ob = $("navOrdersBadge");
  if (ob) {
    if (placed > 0) {
      ob.textContent = String(placed);
      ob.style.display = "";
    } else {
      ob.style.display = "none";
    }
  }
}

const ORDER_STATUS_LABELS = {
  placed: "Placed",
  confirmed: "Confirmed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const addProductBtnDefaultHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add product</span>`;
const addHeroBtnHtml = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span>Add slide</span>`;

function setLoading(on) {
  $("loading").classList.toggle("show", on);
}

function toast(msg, isError = false) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3200);
}

function showError(msg) {
  const b = $("errorBanner");
  if (msg) {
    b.textContent = msg;
    b.classList.add("show");
  } else {
    b.classList.remove("show");
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(n) {
  return "USh " + Number(n).toLocaleString("en-UG", { maximumFractionDigits: 0 });
}

function orderStatusBadge(status) {
  const map = {
    placed: "badge-placed",
    confirmed: "badge-confirmed",
    out_for_delivery: "badge-delivery",
    delivered: "badge-delivered",
    cancelled: "badge-cancelled",
  };
  const cls = map[status] || "badge-placed";
  const label = ORDER_STATUS_LABELS[status] || status;
  return `<span class="badge ${cls}">${escapeHtml(label)}</span>`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortOrderId(id) {
  return id ? String(id).slice(0, 8) : "";
}

function stockBadge(p) {
  if (!p.inStock || p.stockQuantity <= 0)
    return '<span class="badge badge-out">Out of stock</span>';
  if (p.stockQuantity <= 10)
    return '<span class="badge badge-low">Low stock</span>';
  return '<span class="badge badge-ok">In stock</span>';
}

function catName(id) {
  return categories.find((c) => c.id === id)?.name ?? id;
}

function catIcon(id) {
  return categories.find((c) => c.id === id)?.icon ?? "📦";
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      data.error || (Array.isArray(data.details) ? data.details.join(", ") : "") || res.statusText
    );
  return data;
}

async function checkHealth() {
  try {
    const res = await fetch(ADMIN_STATS);
    const data = await res.json();
    const pill = $("apiStatus");
    const text = $("apiStatusText");
    if (res.ok && data.ok) {
      pill.className = "status-pill ok";
      text.textContent = `Live · ${data.products} products · ${data.orders} orders · ${formatMoney(data.ordersSummary?.revenue ?? 0)} revenue`;
    } else {
      const fallback = await fetch(HEALTH).then((r) => r.json()).catch(() => ({}));
      if (fallback.ok) {
        pill.className = "status-pill ok";
        text.textContent = `API live · ${fallback.products} products`;
      } else {
        pill.className = "status-pill err";
        text.textContent = data.error || fallback.error || "API unavailable";
      }
    }
  } catch {
    $("apiStatus").className = "status-pill err";
    $("apiStatusText").textContent = "Cannot reach API";
  }
}

function getFilteredProducts(opts = {}) {
  const q = (opts.search ?? "").toLowerCase();
  const cat = opts.category ?? "";
  const stock = opts.stock ?? "";
  const prime = opts.prime ?? "";
  const sale = opts.sale ?? "";

  let list = products.filter((p) => {
    if (q && !`${p.title} ${p.id} ${p.category} ${p.description}`.toLowerCase().includes(q))
      return false;
    if (cat && !productMatchesCategory(p.category, cat)) return false;
    if (stock === "in" && (!p.inStock || p.stockQuantity <= 0)) return false;
    if (stock === "low" && (p.stockQuantity <= 0 || p.stockQuantity > 10)) return false;
    if (stock === "out" && p.inStock && p.stockQuantity > 0) return false;
    if (prime === "yes" && !p.prime) return false;
    if (prime === "no" && p.prime) return false;
    if (sale === "yes" && !(p.originalPrice && p.originalPrice > p.price)) return false;
    return true;
  });

  const key = opts.sortKey ?? productsSort.key;
  const dir = opts.sortDir ?? productsSort.dir;
  const mult = dir === "asc" ? 1 : -1;
  list = [...list].sort((a, b) => {
    let av = a[key];
    let bv = b[key];
    if (key === "category") {
      av = catName(a.category);
      bv = catName(b.category);
    }
    if (key === "updatedAt") {
      av = new Date(a.updatedAt || 0).getTime();
      bv = new Date(b.updatedAt || 0).getTime();
    }
    if (typeof av === "string") return mult * av.localeCompare(bv);
    return mult * ((av ?? 0) - (bv ?? 0));
  });
  return list;
}

function computeStats() {
  const total = products.length;
  const live = products.filter((p) => p.inStock && p.stockQuantity > 0).length;
  const out = products.filter((p) => !p.inStock || p.stockQuantity <= 0).length;
  const low = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 10).length;
  const value = products.reduce((s, p) => s + p.price * p.stockQuantity, 0);
  const units = products.reduce((s, p) => s + p.stockQuantity, 0);
  return { total, live, out, low, value, units };
}

function renderStatsHtml(stats, prefix = "") {
  return `
    <div class="stat-card accent">
      <div class="label">Total products</div>
      <div class="value">${stats.total}</div>
      <div class="sub">In catalogue</div>
    </div>
    <div class="stat-card accent">
      <div class="label">Live on shop</div>
      <div class="value">${stats.live}</div>
      <div class="sub">In stock & visible</div>
    </div>
    <div class="stat-card warn">
      <div class="label">Low stock</div>
      <div class="value">${stats.low}</div>
      <div class="sub">≤ 10 units</div>
    </div>
    <div class="stat-card danger">
      <div class="label">Out of stock</div>
      <div class="value">${stats.out}</div>
      <div class="sub">Hidden from shop</div>
    </div>
    <div class="stat-card">
      <div class="label">Stock value (RRP)</div>
      <div class="value" style="font-size:1.35rem">${formatMoney(stats.value)}</div>
      <div class="sub">${stats.units.toLocaleString()} units on hand</div>
    </div>
  `;
}

function productRow(p, opts = {}) {
  const compact = opts.compact;
  const shopLink = `${SHOP}/product/${p.id}`;
  const checked = selectedProductIds.has(p.id) ? " checked" : "";
  return `
    <tr>
      ${compact ? "" : `<td><input type="checkbox" class="product-select" data-id="${escapeHtml(p.id)}"${checked} /></td>`}
      <td>
        <div class="product-cell">
          <img class="product-thumb" src="${escapeHtml(p.image)}" alt="" loading="lazy" onerror="this.style.opacity=0.3" />
          <div class="product-meta">
            <strong>${escapeHtml(p.title)}</strong>
            <small>${escapeHtml(p.id)}${p.prime ? ' · <span class="badge badge-prime">Prime</span>' : ""}</small>
          </div>
        </div>
      </td>
      <td>${catIcon(p.category)} ${escapeHtml(catName(p.category))}</td>
      ${compact ? "" : `<td>${formatMoney(p.price)}</td>`}
      ${compact ? "" : `<td>${p.originalPrice ? formatMoney(p.originalPrice) : "—"}</td>`}
      ${compact ? "" : `<td>★ ${p.rating} <small style="color:var(--muted)">(${p.reviewCount})</small></td>`}
      <td>
        ${opts.inventory
          ? `<div class="stock-control">
              <button type="button" class="btn btn-secondary btn-sm" onclick="adjustStock('${p.id}', -10)">−10</button>
              <input type="number" min="0" value="${p.stockQuantity}" onchange="quickStock('${p.id}', this.value)" />
              <button type="button" class="btn btn-secondary btn-sm" onclick="adjustStock('${p.id}', 10)">+10</button>
              <button type="button" class="btn btn-ghost btn-sm" onclick="quickStock('${p.id}', 0)">Zero</button>
            </div>`
          : `<input type="number" min="0" value="${p.stockQuantity}" style="width:70px" onchange="quickStock('${p.id}', this.value)" />`}
      </td>
      <td>${stockBadge(p)}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Edit</button>
          ${!compact ? `<a href="${shopLink}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">View</a>` : ""}
          ${opts.inventory ? "" : `<button type="button" class="btn btn-ghost btn-sm" onclick="duplicateProduct('${p.id}')">Duplicate</button>`}
        </div>
      </td>
    </tr>`;
}

function computeOrderStats() {
  const total = orders.length;
  const placed = orders.filter((o) => o.status === "placed").length;
  const active = orders.filter((o) =>
    ["confirmed", "out_for_delivery"].includes(o.status)
  ).length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + Number(o.total || 0), 0);
  return { total, placed, active, delivered, revenue };
}

function renderOrderStatsHtml() {
  const s = computeOrderStats();
  return `
    <div class="stat-card accent">
      <div class="label">Total orders</div>
      <div class="value">${s.total}</div>
      <div class="sub">All time</div>
    </div>
    <div class="stat-card accent">
      <div class="label">New / placed</div>
      <div class="value">${s.placed}</div>
      <div class="sub">Needs confirmation</div>
    </div>
    <div class="stat-card warn">
      <div class="label">In progress</div>
      <div class="value">${s.active}</div>
      <div class="sub">Confirmed or delivering</div>
    </div>
    <div class="stat-card">
      <div class="label">Delivered</div>
      <div class="value">${s.delivered}</div>
      <div class="sub">Completed</div>
    </div>
    <div class="stat-card">
      <div class="label">Order value</div>
      <div class="value" style="font-size:1.35rem">${formatMoney(s.revenue)}</div>
      <div class="sub">Excludes cancelled</div>
    </div>
  `;
}

function getFilteredOrders() {
  const q = ($("searchOrders")?.value ?? "").toLowerCase();
  const status = $("filterOrderStatus")?.value ?? "";
  return orders.filter((o) => {
    if (status && o.status !== status) return false;
    if (
      q &&
      !`${o.full_name} ${o.email} ${o.id} ${o.city} ${o.phone || ""} ${o.district || ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  });
}

function updateSortHeaders() {
  document.querySelectorAll("th.sortable").forEach((th) => {
    const key = th.dataset.sort;
    th.classList.toggle("sorted", key === productsSort.key);
    const ind = th.querySelector(".sort-ind");
    if (ind) ind.textContent = key === productsSort.key ? (productsSort.dir === "asc" ? "↑" : "↓") : "↕";
  });
}

function renderOrdersTable() {
  const rows = getFilteredOrders();
  ordersPageSize = Number($("ordersPageSize")?.value || 50);
  const { items, page, pages, total } = paginate(rows, ordersPage, ordersPageSize);
  ordersPage = page;
  $("ordersTable").innerHTML =
    items.length === 0
      ? `<tr><td colspan="8" class="empty">${
          orders.length === 0
            ? "No orders yet — they appear here when customers checkout on the shop."
            : "No orders match your filters."
        }</td></tr>`
      : items
              .map((o) => {
            const itemCount = (o.order_items || []).reduce(
              (s, i) => s + Number(i.quantity),
              0
            );
            return `
          <tr>
            <td><strong>#${escapeHtml(shortOrderId(o.id))}</strong><br><small style="color:var(--muted)">${escapeHtml(o.id)}</small></td>
            <td>${escapeHtml(o.full_name)}<br><small>${escapeHtml(o.email)}</small></td>
            <td>${escapeHtml(o.city)}${o.district ? `<br><small>${escapeHtml(o.district)}</small>` : ""}</td>
            <td>${itemCount} ${itemCount === 1 ? "item" : "items"}</td>
            <td><strong>${formatMoney(o.total)}</strong></td>
            <td>${orderStatusBadge(o.status)}</td>
            <td>${formatDateTime(o.created_at)}</td>
            <td><button type="button" class="btn btn-secondary btn-sm" onclick="viewOrder('${o.id}')">View</button></td>
          </tr>`;
              })
              .join("");
  if ($("orderStats")) $("orderStats").innerHTML = renderOrderStatsHtml();
  renderPagination("ordersPagination", "ordersTableMeta", { page, pages, total }, (p) => {
    ordersPage = p;
    renderOrdersTable();
  });
}

async function ordersApi(path, opts = {}) {
  const res = await fetch(ORDERS_API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function loadOrders(showToastOnError = false) {
  try {
    const data = await ordersApi("?admin=true");
    orders = data.orders || [];
    renderOrdersTable();
    return true;
  } catch (e) {
    if (showToastOnError) toast(e.message, true);
    orders = [];
    renderOrdersTable();
    return false;
  }
}

function renderOrderDrawer(order) {
  const items = order.order_items || [];
  $("orderDrawerTitle").textContent = `Order #${shortOrderId(order.id)}`;
  $("orderDrawerSubtitle").textContent = formatDateTime(order.created_at);
  $("orderDrawerBody").innerHTML = `
    <div class="form-section">
      <h3>Customer</h3>
      <dl class="order-detail-grid">
        <div><dt>Name</dt><dd>${escapeHtml(order.full_name)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(order.email)}</dd></div>
        <div><dt>Phone</dt><dd>${escapeHtml(order.phone || "—")}</dd></div>
        <div class="full"><dt>Delivery address</dt><dd>
          ${escapeHtml(order.address_line1)}${order.address_line2 ? "<br>" + escapeHtml(order.address_line2) : ""}<br>
          ${escapeHtml(order.city)}${order.district ? ", " + escapeHtml(order.district) : ""}
        </dd></div>
        ${
          order.notes
            ? `<div class="full"><dt>Delivery notes</dt><dd>${escapeHtml(order.notes)}</dd></div>`
            : ""
        }
      </dl>
    </div>
    <div class="form-section">
      <h3>Line items (${items.length})</h3>
      <table class="order-items-table">
        <thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Line total</th></tr></thead>
        <tbody>
          ${items
            .map(
              (i) => `
            <tr>
              <td>${escapeHtml(i.product_title)}<br><small style="color:var(--muted)">${escapeHtml(i.product_id)}</small></td>
              <td>${i.quantity}</td>
              <td>${formatMoney(i.unit_price)}</td>
              <td>${formatMoney(i.line_total)}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="form-section">
      <h3>Totals</h3>
      <dl class="order-detail-grid">
        <div><dt>Subtotal</dt><dd>${formatMoney(order.subtotal)}</dd></div>
        <div><dt>Delivery</dt><dd>${Number(order.delivery_fee) === 0 ? "FREE" : formatMoney(order.delivery_fee)}</dd></div>
        <div><dt>Total</dt><dd><strong>${formatMoney(order.total)}</strong></dd></div>
        <div><dt>Account</dt><dd>${order.user_id ? "Registered user" : "Guest checkout"}</dd></div>
      </dl>
    </div>
  `;
  const sel = $("orderStatusSelect");
  sel.innerHTML = Object.entries(ORDER_STATUS_LABELS)
    .map(([v, label]) => `<option value="${v}">${label}</option>`)
    .join("");
  sel.value = order.status;
}

function openOrderDrawer() {
  $("drawer").classList.remove("open");
  $("heroDrawer").classList.remove("open");
  $("overlay").classList.add("open");
  $("orderDrawer").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeOrderDrawer() {
  $("orderDrawer").classList.remove("open");
  editingOrderId = null;
  const errEl = $("orderSaveError");
  if (errEl) {
    errEl.style.display = "none";
    errEl.textContent = "";
  }
  if (!$("drawer").classList.contains("open") && !$("heroDrawer").classList.contains("open")) {
    $("overlay").classList.remove("open");
    document.body.style.overflow = "";
  }
}

window.viewOrder = (id) => {
  const o = orders.find((x) => x.id === id);
  if (!o) return;
  editingOrderId = id;
  renderOrderDrawer(o);
  openOrderDrawer();
};

function renderDashboard() {
  const stats = computeStats();
  const os = computeOrderStats();
  $("dashStats").innerHTML =
    renderStatsHtml(stats) +
    `
        <div class="stat-card accent">
          <div class="label">Orders</div>
          <div class="value">${os.total}</div>
          <div class="sub">${os.placed} new · <button type="button" class="btn btn-ghost btn-sm" data-view="orders" style="padding:0;min-height:auto">Manage →</button></div>
        </div>`;

  const ql = $("dashQuickLinks");
  if (ql) {
    ql.innerHTML = `
      <a class="quick-link-card" href="#" data-view="products"><strong>Add product</strong><span>Create a new listing</span></a>
      <a class="quick-link-card" href="#" data-view="orders"><strong>Review orders</strong><span>${os.placed} awaiting action</span></a>
      <a class="quick-link-card" href="#" data-view="inventory"><strong>Low stock</strong><span>${stats.low} SKUs need restock</span></a>
      <a class="quick-link-card" href="${SHOP}" target="_blank" rel="noopener"><strong>View shop</strong><span>Open storefront</span></a>
    `;
    ql.querySelectorAll("[data-view]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        switchView(a.dataset.view);
      });
    });
  }

  const byCat = {};
  categories.forEach((c) => (byCat[c.id] = 0));
  products.forEach((p) => {
    const id = normalizeCategoryId(p.category);
    if (byCat[id] != null) byCat[id]++;
    else byCat[id] = (byCat[id] ?? 0) + 1;
  });
  const max = Math.max(1, ...Object.values(byCat));
  $("categoryChart").innerHTML = categories
    .map((c) => {
      const n = byCat[c.id] || 0;
      const pct = (n / max) * 100;
      return `
        <div class="bar-row">
          <span class="name">${c.icon} ${escapeHtml(c.name)}</span>
          <div class="track"><div class="fill" style="width:${pct}%"></div></div>
          <span class="count">${n}</span>
        </div>`;
    })
    .join("");

  const attention = products
    .filter((p) => !p.inStock || p.stockQuantity <= 0 || p.stockQuantity <= 10)
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .slice(0, 8);

  $("attentionList").innerHTML =
    attention.length === 0
      ? '<div class="empty"><p>All products are well stocked.</p></div>'
      : `<div class="table-wrap"><table class="data-table"><tbody>${attention
          .map(
            (p) => `
          <tr>
            <td><strong>${escapeHtml(p.title)}</strong></td>
            <td>${p.stockQuantity} units</td>
            <td>${stockBadge(p)}</td>
            <td><button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Restock</button></td>
          </tr>`
          )
          .join("")}</tbody></table></div>`;

  const recent = [...products]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 6);
  $("recentTable").innerHTML =
    recent.length === 0
      ? '<tr><td colspan="4" class="empty">No products yet</td></tr>'
      : recent
          .map(
            (p) => `
      <tr>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td>${catIcon(p.category)} ${escapeHtml(catName(p.category))}</td>
        <td>${p.stockQuantity}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Edit</button></td>
      </tr>`
          )
          .join("");

  const recentOrders = [...orders].slice(0, 5);
  const dro = $("dashRecentOrders");
  if (dro) {
    dro.innerHTML =
      recentOrders.length === 0
        ? '<tr><td colspan="5" class="empty">No orders yet</td></tr>'
        : recentOrders
            .map(
              (o) => `
      <tr>
        <td>#${escapeHtml(shortOrderId(o.id))}</td>
        <td>${escapeHtml(o.full_name)}</td>
        <td>${formatMoney(o.total)}</td>
        <td>${orderStatusBadge(o.status)}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="viewOrder('${o.id}')">View</button></td>
      </tr>`
            )
            .join("");
  }

  renderDashboardCharts(stats, os);
}

function renderProductsTable() {
  const filtered = getFilteredProducts({
    search: $("searchProducts")?.value,
    category: $("filterCategory")?.value,
    stock: $("filterStock")?.value,
    prime: $("filterPrime")?.value,
    sale: $("filterSale")?.value,
    sortKey: productsSort.key,
    sortDir: productsSort.dir,
  });
  productsPageSize = Number($("productsPageSize")?.value || 50);
  const { items, page, pages, total } = paginate(filtered, productsPage, productsPageSize);
  productsPage = page;
  $("productsTable").innerHTML =
    items.length === 0
      ? `<tr><td colspan="9"><div class="empty">No products match your filters</div></td></tr>`
      : items.map((p) => productRow(p)).join("");
  renderPagination("productsPagination", "productsTableMeta", { page, pages, total }, (p) => {
    productsPage = p;
    renderProductsTable();
  });
  const bulk = $("bulkBar");
  if (bulk) bulk.classList.toggle("show", selectedProductIds.size > 0);
  const bc = $("bulkCount");
  if (bc) bc.textContent = `${selectedProductIds.size} selected`;
  document.querySelectorAll(".product-select").forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) selectedProductIds.add(cb.dataset.id);
      else selectedProductIds.delete(cb.dataset.id);
      renderProductsTable();
    });
  });
  const all = $("selectAllProducts");
  if (all) {
    all.checked = items.length > 0 && items.every((p) => selectedProductIds.has(p.id));
    all.onchange = () => {
      items.forEach((p) => {
        if (all.checked) selectedProductIds.add(p.id);
        else selectedProductIds.delete(p.id);
      });
      renderProductsTable();
    };
  }
  updateSortHeaders();
}

function renderInventory() {
  const stats = computeStats();
  $("invStats").innerHTML = `
    <div class="stat-card"><div class="label">Total units</div><div class="value">${stats.units.toLocaleString()}</div></div>
    <div class="stat-card warn"><div class="label">Low stock SKUs</div><div class="value">${stats.low}</div></div>
    <div class="stat-card danger"><div class="label">Out of stock SKUs</div><div class="value">${stats.out}</div></div>
  `;

  const filtered = getFilteredProducts({
    search: $("searchInventory").value,
    stock: $("filterInvStock").value === "low" ? "low" : $("filterInvStock").value === "out" ? "out" : "",
  });

  $("inventoryTable").innerHTML =
    filtered.length === 0
      ? `<tr><td colspan="6"><div class="empty">No inventory records</div></td></tr>`
      : filtered
          .map(
            (p) => `
    <tr>
      <td>
        <div class="product-cell">
          <img class="product-thumb" src="${escapeHtml(p.image)}" alt="" loading="lazy" />
          <div class="product-meta"><strong>${escapeHtml(p.title)}</strong></div>
        </div>
      </td>
      <td><code style="font-size:0.75rem">${escapeHtml(p.id)}</code></td>
      <td><strong>${p.stockQuantity}</strong> ${escapeHtml(p.unit)}</td>
      <td>
        <div class="stock-control">
          <button type="button" class="btn btn-secondary btn-sm" onclick="adjustStock('${p.id}', -10)">−10</button>
          <input type="number" min="0" value="${p.stockQuantity}" onchange="quickStock('${p.id}', this.value)" />
          <button type="button" class="btn btn-secondary btn-sm" onclick="adjustStock('${p.id}', 10)">+10</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="quickStock('${p.id}', 0)">Set 0</button>
        </div>
      </td>
      <td>${stockBadge(p)}</td>
      <td><button type="button" class="btn btn-secondary btn-sm" onclick="editProduct('${p.id}')">Edit</button></td>
    </tr>`
          )
          .join("");
}

function countProductsInCategory(catId) {
  return products.filter((p) => productMatchesCategory(p.category, catId)).length;
}

function productPreviewForCategory(catId) {
  const p = products.find((x) => productMatchesCategory(x.category, catId));
  return p?.image;
}

function renderCategoryBannerCards(targetId) {
  const grid = $(targetId);
  if (!grid) return;
  grid.innerHTML = categories
    .filter((c) => c.active !== false)
    .map((c) => {
      const fallback = productPreviewForCategory(c.id);
      const displaySrc = c.image || fallback;
      const productCount = countProductsInCategory(c.id);
      return `
    <article class="banner-card" data-category-id="${c.id}">
      <div class="banner-card-preview" id="banner-preview-${c.id}">
        ${
          displaySrc
            ? `<img src="${escapeHtml(displaySrc)}" alt="" onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\'><span>${c.icon}</span>Image failed to load</div>'" />`
            : `<div class="placeholder"><span>${c.icon}</span>No image — uses first product or empty</div>`
        }
      </div>
      <div class="banner-card-body">
        <h3><span>${c.icon}</span> ${escapeHtml(c.name)}</h3>
        <p class="meta">ID: <code>${c.id}</code> · ${productCount} product${productCount === 1 ? "" : "s"}</p>
        <p class="upload-hint" style="margin-top:0">Upload (→ WebP) or paste URL</p>
        <div class="upload-row">
          <input type="file" id="banner-file-${c.id}" accept="image/jpeg,image/png,image/webp,image/gif" />
          <button type="button" class="btn btn-secondary btn-sm" onclick="uploadBannerFile('${c.id}')">Upload → WebP</button>
        </div>
        <label class="field-label" for="banner-url-${c.id}">Banner image URL</label>
        <input type="url" id="banner-url-${c.id}" value="${escapeHtml(c.image || "")}" placeholder="https://…" oninput="previewCategoryBanner('${c.id}')" />
        <div class="banner-card-actions">
          <button type="button" class="btn btn-primary btn-sm" onclick="saveCategoryBanner('${c.id}')">Save banner</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="clearCategoryBanner('${c.id}')">Clear (use product)</button>
          ${
            categoriesCanDelete
              ? `<button type="button" class="btn btn-danger btn-sm" onclick="deleteCategory('${c.id}', ${productCount})">Delete category</button>`
              : `<button type="button" class="btn btn-danger btn-sm" disabled title="Run categories-active.sql in Supabase">Delete (setup SQL)</button>`
          }
        </div>
      </div>
    </article>`;
        })
        .join("");
}

function renderCategories() {
  renderCategoryBannerCards("categoryBannerGrid");
  renderCategoryBannerCards("categoryBannerGridLegacy");
}

window.previewCategoryBanner = (id) => {
  const url = resolveUploadUrl(document.getElementById(`banner-url-${id}`)?.value.trim());
  const box = document.getElementById(`banner-preview-${id}`);
  const cat = categories.find((x) => x.id === id);
  if (!box || !cat) return;
  const fallback = productPreviewForCategory(id);
  const src = url || fallback;
  if (src) {
    box.innerHTML = `<img src="${escapeHtml(src)}" alt="" onerror="console.error('[admin] banner load failed:', '${escapeHtml(src)}')" />`;
  } else {
    box.innerHTML = `<div class="placeholder"><span>${cat.icon}</span>Preview</div>`;
  }
};

async function uploadImageFile(file, { folder = "products", urlInputId, previewFn }) {
  if (!file) {
    toast("Choose an image file first", true);
    return null;
  }
  const fd = new FormData();
  fd.append("image", file);
  fd.append("folder", folder);
  setLoading(true);
  try {
    const res = await fetch("/api/upload/image", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    if (urlInputId) {
      const el = document.getElementById(urlInputId);
      if (el) el.value = data.url;
    }
    if (previewFn) previewFn();
    toast(
      data.storageNote
        ? `WebP saved (${data.storage}) — ${data.storageNote}`
        : `Image converted to WebP (${data.storage})`
    );
    return data.url;
  } catch (e) {
    toast(e.message, true);
    return null;
  } finally {
    setLoading(false);
  }
}

window.uploadBannerFile = async (id) => {
  const input = document.getElementById(`banner-file-${id}`);
  const file = input?.files?.[0];
  const url = await uploadImageFile(file, {
    folder: "categories",
    urlInputId: `banner-url-${id}`,
    previewFn: () => previewCategoryBanner(id),
  });
  if (url && categoriesTableReady) {
    await categoriesApi(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ image: url }),
    });
    toast("Banner uploaded and saved");
    await loadCategories();
    renderCategories();
  } else if (url) {
    toast("WebP uploaded — click Save banner after categories table is set up", true);
  }
  if (input) input.value = "";
};

async function categoriesApi(path, opts = {}) {
  const res = await fetch(CATEGORIES_API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

window.saveCategoryBanner = async (id) => {
  if (!categoriesTableReady) {
    toast("Run categories.sql in Supabase first (see banner at top)", true);
    return;
  }
  const url = document.getElementById(`banner-url-${id}`)?.value.trim() ?? "";
  setLoading(true);
  try {
    await categoriesApi(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ image: url }),
    });
    toast("Category banner saved — refresh the shop to see it");
    await loadCategories();
    renderCategories();
  } catch (e) {
    toast(e.message, true);
  } finally {
    setLoading(false);
  }
};

window.deleteCategory = (id, productCount) => {
  if (!categoriesCanDelete) {
    toast("Run server/supabase/categories-active.sql in Supabase SQL Editor first", true);
    return;
  }
  const cat = categories.find((c) => c.id === id);
  const name = cat?.name ?? id;
  const msg =
    productCount > 0
      ? `Delete "${name}"? It will be hidden from the shop. ${productCount} product(s) will keep this category until you change them.`
      : `Delete "${name}"? It will be removed from the shop.`;
  confirmDialog("Delete category", msg, async () => {
    closeConfirm();
    setLoading(true);
    try {
      const result = await categoriesApi(`/${id}`, { method: "DELETE" });
      toast(result.message || "Category deleted");
      await loadCategories();
      renderAll();
    } catch (e) {
      toast(e.message, true);
    } finally {
      setLoading(false);
    }
  });
};

window.clearCategoryBanner = async (id) => {
  setLoading(true);
  try {
    await categoriesApi(`/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ image: "" }),
    });
    toast("Banner cleared — using product preview on shop");
    await loadCategories();
    renderCategories();
  } catch (e) {
    toast(e.message, true);
  } finally {
    setLoading(false);
  }
};

function heroSlideCardHtml(s) {
  return `
        <article class="banner-card">
          <div class="banner-card-preview">
            <img src="${escapeHtml(resolveUploadUrl(s.image))}" alt="" onerror="this.style.opacity=0.35" />
          </div>
          <div class="banner-card-body">
            <h3>${escapeHtml(s.title)}</h3>
            <p class="meta">Order ${s.sortOrder ?? 0} · <code>${escapeHtml(s.id)}</code>${s.active === false ? " · <span class=badge badge-out>Inactive</span>" : ""}</p>
            <p style="font-size:0.8rem;color:var(--muted);margin:0.35rem 0 0">${escapeHtml(s.badge || "")}</p>
            <p style="font-size:0.8rem;margin:0.25rem 0 0.75rem;line-height:1.4">${escapeHtml((s.subtitle || "").slice(0, 80))}${(s.subtitle || "").length > 80 ? "…" : ""}</p>
            <div class="banner-card-actions">
              <button type="button" class="btn btn-primary btn-sm" onclick="editHeroSlide('${s.id}')">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deleteHeroSlide('${s.id}')">Remove</button>
            </div>
          </div>
        </article>`;
}

function renderHeroSlides() {
  const sorted = [...heroSlides].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const active = sorted.filter((s) => s.active !== false);
  const inactive = sorted.filter((s) => s.active === false);
  $("heroSlideGrid").innerHTML = active.map(heroSlideCardHtml).join("") || '<div class="empty" style="padding:2rem">No active slides</div>';
  const inSec = $("heroInactiveSection");
  const inGrid = $("heroInactiveGrid");
  if (showInactiveHero && inactive.length) {
    if (inSec) inSec.style.display = "";
    if (inGrid) inGrid.innerHTML = inactive.map(heroSlideCardHtml).join("");
  } else if (inSec) {
    inSec.style.display = "none";
  }
}

async function heroApi(path, opts = {}) {
  const res = await fetch(HERO_API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function loadHeroSlides() {
  const data = await heroApi("?admin=true");
  heroSlides = data.slides || [];
}

function openHeroDrawer(mode = "add") {
  $("overlay").classList.add("open");
  $("heroDrawer").classList.add("open");
  document.body.style.overflow = "hidden";
  if (mode === "add") resetHeroForm();
}

function closeHeroDrawer() {
  $("heroDrawer").classList.remove("open");
  if (
    !$("drawer").classList.contains("open") &&
    !$("orderDrawer").classList.contains("open")
  ) {
    $("overlay").classList.remove("open");
    document.body.style.overflow = "";
  }
}

function resetHeroForm() {
  editingHeroId = null;
  $("heroForm").reset();
  $("heroDrawerTitle").textContent = "Add hero slide";
  $("heroDrawerSubtitle").textContent = "Shown on the homepage carousel";
  $("heroEditId").value = "";
  $("heroId").disabled = false;
  $("heroSortOrder").value = heroSlides.filter((s) => s.active !== false).length;
  $("heroActive").checked = true;
  $("heroCta").value = "Shop now";
  $("heroCtaHref").value = "/categories";
  $("deleteHeroBtn").style.display = "none";
  $("heroSubmitBtn").textContent = "Save slide";
  $("heroPreview").classList.remove("visible");
}

function updateHeroPreview() {
  const url = resolveUploadUrl($("heroImage").value.trim());
  const img = $("heroPreview");
  if (url) {
    img.src = url;
    img.classList.add("visible");
  } else {
    img.classList.remove("visible");
  }
}

window.editHeroSlide = (id) => {
  const s = heroSlides.find((x) => x.id === id);
  if (!s) return;
  editingHeroId = id;
  $("heroDrawerTitle").textContent = "Edit hero slide";
  $("heroDrawerSubtitle").textContent = `Slide ${id}`;
  $("heroEditId").value = id;
  $("heroId").value = id;
  $("heroId").disabled = true;
  $("heroSortOrder").value = s.sortOrder ?? 0;
  $("heroImage").value = s.image || "";
  $("heroBadge").value = s.badge || "";
  $("heroTitle").value = s.title || "";
  $("heroSubtitle").value = s.subtitle || "";
  $("heroCta").value = s.cta || "Shop now";
  $("heroCtaHref").value = s.ctaHref || "/categories";
  $("heroCta2").value = s.cta2 || "";
  $("heroCta2Href").value = s.cta2Href || "";
  $("heroActive").checked = s.active !== false;
  $("deleteHeroBtn").style.display = "inline-flex";
  $("heroSubmitBtn").textContent = "Save changes";
  updateHeroPreview();
  openHeroDrawer("edit");
};

window.deleteHeroSlide = (id) => {
  const s = heroSlides.find((x) => x.id === id);
  confirmDialog(
    "Remove hero slide",
    `Remove "${s?.title || id}" from the homepage carousel?`,
    async () => {
      closeConfirm();
      setLoading(true);
      try {
        await heroApi(`/${id}`, { method: "DELETE" });
        toast("Hero slide removed");
        await loadHeroSlides();
        renderHeroSlides();
      } catch (e) {
        toast(e.message, true);
      } finally {
        setLoading(false);
      }
    }
  );
};

function renderAnalytics() {
  const os = computeOrderStats();
  $("analyticsStats").innerHTML = renderOrderStatsHtml() + `
    <div class="stat-card"><div class="label">Catalogue</div><div class="value">${products.length}</div><div class="sub">Total SKUs</div></div>`;

  const statusCounts = {};
  for (const s of Object.keys(ORDER_STATUS_LABELS)) statusCounts[s] = 0;
  orders.forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  });
  const maxO = Math.max(1, ...Object.values(statusCounts));
  $("ordersStatusChart").innerHTML = Object.entries(ORDER_STATUS_LABELS)
    .map(([id, label]) => {
      const n = statusCounts[id] || 0;
      return `<div class="bar-row"><span class="name">${escapeHtml(label)}</span><div class="track"><div class="fill" style="width:${(n / maxO) * 100}%"></div></div><span class="count">${n}</span></div>`;
    })
    .join("");

  const byCat = {};
  categories.forEach((c) => (byCat[c.id] = 0));
  products.forEach((p) => {
    const id = normalizeCategoryId(p.category);
    byCat[id] = (byCat[id] ?? 0) + 1;
  });
  const maxC = Math.max(1, ...Object.values(byCat));
  $("analyticsCategoryChart").innerHTML = categories
    .map((c) => {
      const n = byCat[c.id] || 0;
      return `<div class="bar-row"><span class="name">${c.icon} ${escapeHtml(c.name)}</span><div class="track"><div class="fill" style="width:${(n / maxC) * 100}%"></div></div><span class="count">${n}</span></div>`;
    })
    .join("");

  const sales = new Map();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    for (const item of o.order_items || []) {
      const key = item.product_id;
      const prev = sales.get(key) || { title: item.product_title, qty: 0, rev: 0 };
      prev.qty += Number(item.quantity);
      prev.rev += Number(item.line_total);
      sales.set(key, prev);
    }
  }
  const top = [...sales.values()].sort((a, b) => b.rev - a.rev).slice(0, 10);
  $("topSellersTable").innerHTML =
    top.length === 0
      ? '<tr><td colspan="3" class="empty">No sales data yet</td></tr>'
      : top
          .map(
            (r) => `<tr><td>${escapeHtml(r.title)}</td><td>${r.qty}</td><td>${formatMoney(r.rev)}</td></tr>`
          )
          .join("");
}

function renderCatalog() {
  const tbody = $("catalogTable");
  if (!tbody) return;
  tbody.innerHTML = categories
    .filter((c) => c.active !== false)
    .map((c) => {
      const n = countProductsInCategory(c.id);
      const hasBanner = Boolean(c.image?.trim());
      return `
      <tr>
        <td><span>${c.icon}</span> <strong>${escapeHtml(c.name)}</strong><br><code style="font-size:0.7rem">${c.id}</code></td>
        <td>${n}</td>
        <td>${n > 0 ? '<span class="badge badge-ok">Visible</span>' : '<span class="badge badge-out">Empty</span>'}</td>
        <td>${hasBanner ? '<span class="badge badge-ok">Set</span>' : '<span class="badge badge-low">Product fallback</span>'}</td>
        <td class="cat-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="filterByCategory('${c.id}')">Products</button>
          <a href="${SHOP}/category/${c.id}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">Shop</a>
          <button type="button" class="btn btn-ghost btn-sm" onclick="openCatalogBanners('${c.id}')">Banner</button>
        </td>
      </tr>`;
    })
    .join("");
}

window.openCatalogBanners = (id) => {
  document.querySelectorAll("[data-catalog-tab]").forEach((b) => {
    b.classList.toggle("active", b.dataset.catalogTab === "banners");
  });
  $("catalogTabList")?.classList.remove("active");
  $("catalogTabBanners")?.classList.add("active");
  setTimeout(() => document.getElementById(`banner-url-${id}`)?.focus(), 100);
};

function getCustomers() {
  const map = new Map();
  for (const o of orders) {
    const key = (o.email || "").toLowerCase();
    if (!key) continue;
    const prev = map.get(key) || {
      name: o.full_name,
      email: o.email,
      phone: o.phone,
      orders: 0,
      spent: 0,
      last: o.created_at,
      city: o.city,
    };
    prev.orders += 1;
    if (o.status !== "cancelled") prev.spent += Number(o.total || 0);
    if (new Date(o.created_at) > new Date(prev.last)) {
      prev.last = o.created_at;
      prev.name = o.full_name;
      prev.city = o.city;
    }
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.spent - a.spent);
}

function renderCustomers() {
  const q = ($("searchCustomers")?.value ?? "").toLowerCase();
  const list = getCustomers().filter(
    (c) => !q || `${c.name} ${c.email} ${c.city}`.toLowerCase().includes(q)
  );
  $("customersGrid").innerHTML =
    list.length === 0
      ? '<div class="empty" style="grid-column:1/-1;padding:3rem">No customers yet — derived from order history.</div>'
      : list
          .map(
            (c) => `
    <article class="customer-card">
      <h3>${escapeHtml(c.name)}</h3>
      <p class="email">${escapeHtml(c.email)}</p>
      <div class="stats">
        <span><strong>${c.orders}</strong> orders</span>
        <span><strong>${formatMoney(c.spent)}</strong> spent</span>
      </div>
      <p style="font-size:0.75rem;color:var(--muted);margin:0.75rem 0 0">Last order ${formatDateTime(c.last)} · ${escapeHtml(c.city || "")}</p>
    </article>`
          )
          .join("");
}

function renderSettings() {
  const links = $("settingsLinks");
  if (links) {
    links.innerHTML = `
      <p style="margin:0 0 0.75rem"><strong>Storefront</strong><br><a href="${SHOP}" target="_blank" rel="noopener">${SHOP}</a></p>
      <p style="margin:0 0 0.75rem"><strong>Admin API</strong><br><code>${location.origin}/api</code></p>
      <p style="margin:0"><strong>Uploads</strong><br><code>${location.origin}/uploads/</code></p>`;
  }
  const setup = $("setupChecklist");
  if (setup) {
    const checks = [
      { ok: products.length > 0, label: "Products loaded", hint: "cd server && npm run dev" },
      { ok: categoriesTableReady, label: "Categories table", hint: "server/supabase/categories.sql" },
      { ok: heroSlides.length > 0, label: "Hero slides", hint: "server/supabase/hero-slides.sql + npm run seed:hero" },
      { ok: orders.length >= 0, label: "Orders table", hint: "server/supabase/orders.sql" },
    ];
    setup.innerHTML = checks
      .map(
        (c) => `
      <li>
        <span class="setup-icon ${c.ok ? "ok" : "pending"}">${c.ok ? "✓" : "!"}</span>
        <div><strong>${c.label}</strong><br><span style="font-size:0.8rem;color:var(--muted)">${c.hint}</span></div>
      </li>`
      )
      .join("");
  }
}

function exportProductsCsv(list) {
  const rows = list || products;
  const headers = ["id", "title", "category", "price", "originalPrice", "stockQuantity", "inStock", "unit", "rating", "reviewCount", "prime", "image"];
  const lines = [headers.join(",")];
  for (const p of rows) {
    lines.push(
      headers
        .map((h) => {
          const v = p[h];
          const s = v == null ? "" : String(v);
          return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `one-source-products-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(`Exported ${rows.length} products`);
}

function renderAll() {
  renderDashboard();
  renderAnalytics();
  renderProductsTable();
  renderInventory();
  renderCatalog();
  renderCategories();
  renderHeroSlides();
  renderOrdersTable();
  renderCustomers();
  renderSettings();
  updateNavBadges();
  updateTopbarMeta();
}

window.filterByCategory = (id) => {
  switchView("products");
  $("filterCategory").value = id;
  renderProductsTable();
};

function switchView(name) {
  currentView = name;
  closeDrawer();
  closeHeroDrawer();
  closeOrderDrawer();
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  document.querySelectorAll(".view").forEach((v) => {
    v.classList.toggle("active", v.id === `view-${name}`);
  });
  $("pageTitle").textContent = viewTitles[name] || name;
  const hideAdd = ["orders", "customers", "analytics", "settings", "catalog"].includes(name);
  $("addProductBtn").style.display = hideAdd ? "none" : "";
  const addBtn = $("addProductBtn");
  if (addBtn) {
    addBtn.className = "btn btn-primary btn-icon-label";
    addBtn.innerHTML = name === "hero" ? addHeroBtnHtml : addProductBtnDefaultHtml;
  }
  $("exportCsvBtn").style.display = name === "products" ? "" : "none";
  if (name === "orders") loadOrders();
  if (name === "sidebar") return;
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarBackdrop")?.classList.remove("show");
}

function openDrawer(mode = "add") {
  $("overlay").classList.add("open");
  $("drawer").classList.add("open");
  document.body.style.overflow = "hidden";
  if (mode === "add") resetForm();
}

function closeDrawer() {
  $("drawer").classList.remove("open");
  if (!$("heroDrawer").classList.contains("open") && !$("orderDrawer").classList.contains("open")) {
    $("overlay").classList.remove("open");
    document.body.style.overflow = "";
  }
}

function confirmDialog(title, message, onOk) {
  $("confirmTitle").textContent = title;
  $("confirmMessage").textContent = message;
  $("confirmModal").classList.add("open");
  confirmCallback = onOk;
}

function closeConfirm() {
  $("confirmModal").classList.remove("open");
  confirmCallback = null;
}

window.quickStock = async (id, qty) => {
  try {
    await api(`/${id}/stock`, {
      method: "PATCH",
      body: JSON.stringify({ stockQuantity: Number(qty) }),
    });
    toast("Stock updated");
    await loadProducts(false);
  } catch (e) {
    toast(e.message, true);
  }
};

window.adjustStock = async (id, delta) => {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  const next = Math.max(0, p.stockQuantity + delta);
  await quickStock(id, next);
};

window.editProduct = (id) => {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  editingId = id;
  $("drawerTitle").textContent = "Edit product";
  $("drawerSubtitle").textContent = `SKU ${id} · Last updated ${p.updatedAt ? new Date(p.updatedAt).toLocaleString("en-GB") : "—"}`;
  $("editId").value = id;
  $("id").value = id;
  $("id").disabled = true;
  $("title").value = p.title;
  $("price").value = p.price;
  $("originalPrice").value = p.originalPrice ?? "";
  $("stockQuantity").value = p.stockQuantity;
  $("unit").value = p.unit;
  $("category").value = p.category;
  $("image").value = p.image;
  $("rating").value = p.rating;
  $("reviewCount").value = p.reviewCount;
  $("prime").checked = p.prime;
  $("description").value = p.description;
  $("delivery").value = p.delivery;
  $("deleteBtn").style.display = "inline-flex";
  $("submitBtn").textContent = "Save changes";
  updatePreview();
  openDrawer("edit");
};

window.duplicateProduct = (id) => {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  editingId = null;
  $("drawerTitle").textContent = "Duplicate product";
  $("drawerSubtitle").textContent = "Based on " + p.title;
  $("editId").value = "";
  $("id").value = "";
  $("id").disabled = false;
  $("title").value = p.title + " (copy)";
  $("price").value = p.price;
  $("originalPrice").value = p.originalPrice ?? "";
  $("stockQuantity").value = p.stockQuantity;
  $("unit").value = p.unit;
  $("category").value = p.category;
  $("image").value = p.image;
  $("rating").value = p.rating;
  $("reviewCount").value = 0;
  $("prime").checked = p.prime;
  $("description").value = p.description;
  $("delivery").value = p.delivery;
  $("deleteBtn").style.display = "none";
  $("submitBtn").textContent = "Create duplicate";
  updatePreview();
  openDrawer("add");
};

function resetForm() {
  editingId = null;
  $("productForm").reset();
  $("drawerTitle").textContent = "Add product";
  $("drawerSubtitle").textContent = "New listing appears on the shop when stock > 0";
  $("editId").value = "";
  $("id").disabled = false;
  $("stockQuantity").value = 100;
  $("prime").checked = true;
  $("delivery").value = "FREE same-day delivery Tomorrow";
  $("rating").value = 4.5;
  $("deleteBtn").style.display = "none";
  $("submitBtn").textContent = "Save product";
  $("preview").classList.remove("visible");
}

function resolveUploadUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) {
    return url;
  }
  return url;
}

function updatePreview() {
  const url = resolveUploadUrl($("image").value.trim());
  const img = $("preview");
  if (url) {
    img.src = url;
    img.classList.add("visible");
    img.onerror = () => {
      console.error("[admin] image failed to load:", url);
      toast("Image URL did not load — check server is running on :3001", true);
    };
  } else {
    img.classList.remove("visible");
  }
}

let categoriesTableReady = true;
let categoriesCanDelete = false;

async function loadCategories() {
  let cats = [];
  try {
    const data = await categoriesApi("?admin=true");
    cats = data.categories;
    categoriesCanDelete = data.canDelete === true;
  } catch (e) {
    try {
      const data = await api("/categories?admin=true");
      cats = data.categories;
      categoriesCanDelete = data.canDelete === true;
    } catch {
      categoriesTableReady = false;
      categoriesCanDelete = false;
      throw e;
    }
  }
  categories = cats;
  categoriesTableReady = true;
  const opts = cats.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("");
  $("category").innerHTML = opts;
  $("filterCategory").innerHTML =
    '<option value="">All categories</option>' +
    cats.map((c) => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join("");
}

async function loadProducts(showLoader = true) {
  if (showLoader) setLoading(true);
  try {
    const data = await api("?admin=true");
    products = data.products;
    lastRefresh = new Date();
    showError(null);
    renderAll();
    await checkHealth();
  } catch (e) {
    showError(e.message + " — Run: cd server && npm run dev");
    toast(e.message, true);
  } finally {
    if (showLoader) setLoading(false);
  }
}

// Events
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});
document.querySelectorAll("[data-view]").forEach((el) => {
  if (el.classList.contains("nav-btn")) return;
  el.addEventListener("click", () => switchView(el.dataset.view));
});

$("addProductBtn").addEventListener("click", () => {
  if (currentView === "hero") {
    resetHeroForm();
    openHeroDrawer("add");
  } else {
    resetForm();
    openDrawer("add");
  }
});
$("closeDrawer").addEventListener("click", closeDrawer);
$("closeHeroDrawer").addEventListener("click", closeHeroDrawer);
$("overlay").addEventListener("click", () => {
  closeDrawer();
  closeHeroDrawer();
  closeOrderDrawer();
});
$("closeOrderDrawer").addEventListener("click", closeOrderDrawer);

async function saveOrderStatus() {
  const errEl = $("orderSaveError");
  errEl.style.display = "none";
  errEl.textContent = "";

  if (!editingOrderId) {
    toast("Open an order first", true);
    return;
  }

  const status = $("orderStatusSelect").value;
  const btn = $("saveOrderStatusBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    const data = await ordersApi(`/${encodeURIComponent(editingOrderId)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!data.order) throw new Error("No order returned from server");

    const idx = orders.findIndex((o) => o.id === editingOrderId);
    if (idx >= 0) orders[idx] = data.order;

    toast("Order status updated");
    renderOrdersTable();
    renderDashboard();
    renderOrderDrawer(data.order);
  } catch (e) {
    const msg = e.message || "Failed to save status";
    errEl.textContent = msg;
    errEl.style.display = "block";
    toast(msg, true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save status";
  }
}

$("saveOrderStatusBtn").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  saveOrderStatus();
});

$("refreshBtn").addEventListener("click", async () => {
  setLoading(true);
  try {
    await loadHeroSlides().catch(() => {});
    await loadOrders().catch(() => {});
    await loadProducts(false);
  } finally {
    setLoading(false);
  }
});

$("searchOrders")?.addEventListener("input", () => {
  ordersPage = 1;
  renderOrdersTable();
});
$("filterOrderStatus")?.addEventListener("change", () => {
  ordersPage = 1;
  renderOrdersTable();
});
$("ordersPageSize")?.addEventListener("change", () => {
  ordersPage = 1;
  renderOrdersTable();
});
$("searchCustomers")?.addEventListener("input", renderCustomers);
$("showInactiveHero")?.addEventListener("change", (e) => {
  showInactiveHero = e.target.checked;
  renderHeroSlides();
});
$("exportCsvBtn")?.addEventListener("click", () => {
  exportProductsCsv(
    getFilteredProducts({
      search: $("searchProducts")?.value,
      category: $("filterCategory")?.value,
      stock: $("filterStock")?.value,
      prime: $("filterPrime")?.value,
      sale: $("filterSale")?.value,
    })
  );
});
$("exportAllCsvBtn")?.addEventListener("click", () => exportProductsCsv(products));
$("refreshAllBtn")?.addEventListener("click", () => $("refreshBtn")?.click());
$("bulkSetStockBtn")?.addEventListener("click", async () => {
  const qty = Number($("bulkStockValue")?.value ?? 0);
  const ids = [...selectedProductIds];
  if (!ids.length) return;
  setLoading(true);
  try {
    for (const id of ids) {
      await api(`/${id}/stock`, {
        method: "PATCH",
        body: JSON.stringify({ stockQuantity: qty }),
      });
    }
    toast(`Updated stock for ${ids.length} products`);
    selectedProductIds.clear();
    await loadProducts(false);
  } catch (e) {
    toast(e.message, true);
  } finally {
    setLoading(false);
  }
});
$("bulkClearBtn")?.addEventListener("click", () => {
  selectedProductIds.clear();
  renderProductsTable();
});
$("menuToggle")?.addEventListener("click", () => {
  $("sidebar")?.classList.toggle("open");
  $("sidebarBackdrop")?.classList.toggle("show");
});
$("sidebarBackdrop")?.addEventListener("click", () => {
  $("sidebar")?.classList.remove("open");
  $("sidebarBackdrop")?.classList.remove("show");
});
document.querySelectorAll("[data-catalog-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-catalog-tab]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    $("catalogTabList")?.classList.toggle("active", btn.dataset.catalogTab === "list");
    $("catalogTabBanners")?.classList.toggle("active", btn.dataset.catalogTab === "banners");
  });
});

$("searchProducts")?.addEventListener("input", () => {
  productsPage = 1;
  renderProductsTable();
});
$("filterCategory")?.addEventListener("change", () => {
  productsPage = 1;
  renderProductsTable();
});
$("filterStock")?.addEventListener("change", () => {
  productsPage = 1;
  renderProductsTable();
});
$("filterPrime")?.addEventListener("change", () => {
  productsPage = 1;
  renderProductsTable();
});
$("filterSale")?.addEventListener("change", () => {
  productsPage = 1;
  renderProductsTable();
});
$("productsPageSize")?.addEventListener("change", () => {
  productsPage = 1;
  renderProductsTable();
});
document.querySelectorAll("th.sortable").forEach((th) => {
  th.addEventListener("click", () => {
    const key = th.dataset.sort;
    if (productsSort.key === key) {
      productsSort.dir = productsSort.dir === "asc" ? "desc" : "asc";
    } else {
      productsSort = { key, dir: "asc" };
    }
    renderProductsTable();
  });
});
$("searchInventory").addEventListener("input", renderInventory);
$("filterInvStock").addEventListener("change", renderInventory);

$("image").addEventListener("input", updatePreview);
$("uploadProductImageBtn").addEventListener("click", async () => {
  const file = $("imageFile").files?.[0];
  await uploadImageFile(file, {
    folder: "products",
    urlInputId: "image",
    previewFn: updatePreview,
  });
  $("imageFile").value = "";
});
$("resetFormBtn").addEventListener("click", resetForm);

$("deleteBtn").addEventListener("click", () => {
  if (!editingId) return;
  confirmDialog(
    "Delete product",
    "This permanently removes the product from the catalogue and shop.",
    async () => {
      closeConfirm();
      try {
        await api(`/${editingId}`, { method: "DELETE" });
        toast("Product deleted");
        closeDrawer();
        resetForm();
        await loadProducts();
      } catch (e) {
        toast(e.message, true);
      }
    }
  );
});

$("confirmCancel").addEventListener("click", closeConfirm);
$("confirmBackdrop").addEventListener("click", closeConfirm);
$("confirmOk").addEventListener("click", () => {
  if (confirmCallback) confirmCallback();
});

$("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    id: $("id").value.trim() || undefined,
    title: $("title").value,
    price: Number($("price").value),
    originalPrice: $("originalPrice").value ? Number($("originalPrice").value) : undefined,
    stockQuantity: Number($("stockQuantity").value),
    unit: $("unit").value,
    category: $("category").value,
    image: $("image").value,
    rating: Number($("rating").value),
    reviewCount: Number($("reviewCount").value),
    prime: $("prime").checked,
    description: $("description").value,
    delivery: $("delivery").value,
    inStock: Number($("stockQuantity").value) > 0,
  };

  setLoading(true);
  try {
    if (editingId) {
      await api(`/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
      toast("Product updated — live on shop");
    } else {
      await api("", { method: "POST", body: JSON.stringify(body) });
      toast("Product created — live on shop");
    }
    closeDrawer();
    resetForm();
    await loadProducts(false);
  } catch (err) {
    toast(err.message, true);
  } finally {
    setLoading(false);
  }
});

$("heroImage").addEventListener("input", updateHeroPreview);
$("uploadHeroImageBtn").addEventListener("click", async () => {
  const file = $("heroImageFile").files?.[0];
  await uploadImageFile(file, {
    folder: "hero",
    urlInputId: "heroImage",
    previewFn: updateHeroPreview,
  });
  $("heroImageFile").value = "";
});
$("resetHeroFormBtn").addEventListener("click", resetHeroForm);

$("deleteHeroBtn").addEventListener("click", () => {
  if (!editingHeroId) return;
  deleteHeroSlide(editingHeroId);
});

$("heroForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    id: $("heroId").value.trim() || undefined,
    sortOrder: Number($("heroSortOrder").value),
    image: $("heroImage").value.trim(),
    badge: $("heroBadge").value.trim(),
    title: $("heroTitle").value.trim(),
    subtitle: $("heroSubtitle").value.trim(),
    cta: $("heroCta").value.trim(),
    ctaHref: $("heroCtaHref").value.trim(),
    cta2: $("heroCta2").value.trim() || undefined,
    cta2Href: $("heroCta2Href").value.trim() || undefined,
    active: $("heroActive").checked,
  };
  setLoading(true);
  try {
    if (editingHeroId) {
      await heroApi(`/${editingHeroId}`, { method: "PUT", body: JSON.stringify(body) });
      toast("Hero slide updated — refresh the shop");
    } else {
      await heroApi("", { method: "POST", body: JSON.stringify(body) });
      toast("Hero slide created");
    }
    closeHeroDrawer();
    resetHeroForm();
    await loadHeroSlides();
    renderHeroSlides();
  } catch (err) {
    toast(err.message, true);
  } finally {
    setLoading(false);
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDrawer();
    closeHeroDrawer();
    closeOrderDrawer();
    closeConfirm();
  }
});

(async () => {
  setLoading(true);
  await detectShopUrl();
  try {
    await loadCategories().catch(() => {
      showError(
        "Products API is OK. To save category banner images, run server/supabase/categories.sql in Supabase, then: cd server && npm run seed:categories"
      );
    });
    await loadHeroSlides().catch(() => {
      showError(
        "Hero slides use defaults until you run server/supabase/hero-slides.sql, then: cd server && npm run seed:hero"
      );
    });
    await loadOrders().catch(() => {
      showError(
        (document.getElementById("errorBanner").textContent || "") +
          " Orders need server/supabase/orders.sql in Supabase SQL Editor."
      );
    });
    await loadProducts(false);
    await checkHealth();
  } catch (e) {
    showError(
      (e?.message || "Cannot reach API") + " — Run: cd server && npm run dev"
    );
  } finally {
    setLoading(false);
  }
})();
