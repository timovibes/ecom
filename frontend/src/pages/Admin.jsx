import { useEffect, useState } from "react";
import client from "../api/client";

const ROWS_PER_PAGE = 10;

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="confirm-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function AdminPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="pagination">
      <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1}>
        Prev
      </button>
      <span className="muted">Page {page} of {totalPages}</span>
      <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
        Next
      </button>
    </div>
  );
}

function formatMoney(minor, currency = "kes") {
  return `${(minor / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

function RevenueChart({ points }) {
  if (points.length === 0) {
    return <p className="muted">No revenue in this period yet.</p>;
  }
  const max = Math.max(...points.map((p) => p.revenue_minor), 1);
  return (
    <div className="revenue-chart">
      {points.map((p) => (
        <div className="revenue-chart-bar-wrap" key={p.date} title={`${p.date}: ${formatMoney(p.revenue_minor)}`}>
          <div
            className="revenue-chart-bar"
            style={{ height: `${Math.max(2, (p.revenue_minor / max) * 100)}%` }}
          />
          <span className="revenue-chart-label">{p.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const [newProduct, setNewProduct] = useState({ name: "", price_minor: "", stock_quantity: "", category_id: "" });
  const [newCategory, setNewCategory] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null); // { id, name } | null

  const [productsPage, setProductsPage] = useState(1);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);

  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [revenuePoints, setRevenuePoints] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");

  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    max_uses: "",
    expires_at: "",
  });

  function loadAll() {
    client.get("/api/v1/products/").then((res) => setProducts(res.data)).catch(() => {});
    client.get("/api/v1/categories/").then((res) => setCategories(res.data)).catch(() => {});
    client.get("/api/v1/admin/orders").then((res) => setOrders(res.data)).catch(() => setError("Admin access required"));
  }

  useEffect(loadAll, []);

  // Load analytics lazily, only when that tab is opened.
  useEffect(() => {
    if (tab !== "analytics") return;
    setAnalyticsLoading(true);
    setAnalyticsError("");
    Promise.all([
      client.get("/api/v1/admin/analytics/summary"),
      client.get("/api/v1/admin/analytics/revenue", { params: { days: 30 } }),
      client.get("/api/v1/admin/analytics/top-products", { params: { limit: 5 } }),
      client.get("/api/v1/admin/analytics/low-stock", { params: { threshold: 5 } }),
    ])
      .then(([summaryRes, revenueRes, topRes, lowRes]) => {
        setAnalyticsSummary(summaryRes.data);
        setRevenuePoints(revenueRes.data);
        setTopProducts(topRes.data);
        setLowStock(lowRes.data);
      })
      .catch(() => setAnalyticsError("Could not load analytics"))
      .finally(() => setAnalyticsLoading(false));
  }, [tab]);

  function loadCoupons() {
    setCouponsLoading(true);
    setCouponError("");
    client.get("/api/v1/admin/coupons")
      .then((res) => setCoupons(res.data))
      .catch(() => setCouponError("Could not load coupons"))
      .finally(() => setCouponsLoading(false));
  }

  useEffect(() => {
    if (tab !== "coupons") return;
    loadCoupons();
  }, [tab]);

  // Keep each tab's page in range if the underlying list shrinks (e.g. after a delete).
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(products.length / ROWS_PER_PAGE));
    setProductsPage((p) => Math.min(p, maxPage));
  }, [products.length]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(categories.length / ROWS_PER_PAGE));
    setCategoriesPage((p) => Math.min(p, maxPage));
  }, [categories.length]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(orders.length / ROWS_PER_PAGE));
    setOrdersPage((p) => Math.min(p, maxPage));
  }, [orders.length]);

  async function createProduct(e) {
    e.preventDefault();
    try {
      await client.post("/api/v1/products/", {
        name: newProduct.name,
        price_minor: Number(newProduct.price_minor),
        stock_quantity: Number(newProduct.stock_quantity),
        category_id: newProduct.category_id ? Number(newProduct.category_id) : null,
      });
      setNewProduct({ name: "", price_minor: "", stock_quantity: "", category_id: "" });
      setProductsPage(1);
      loadAll();
    } catch {
      setError("Could not create product");
    }
  }

  async function createCategory(e) {
    e.preventDefault();
    try {
      await client.post("/api/v1/categories/", { name: newCategory });
      setNewCategory("");
      setCategoriesPage(1);
      loadAll();
    } catch {
      setError("Could not create category");
    }
  }

  function requestDeleteProduct(product) {
    setPendingDelete({ id: product.id, name: product.name });
  }

  async function confirmDeleteProduct() {
    if (!pendingDelete) return;
    await client.delete(`/api/v1/products/${pendingDelete.id}`);
    setPendingDelete(null);
    loadAll();
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  async function updateOrderStatus(id, status) {
    await client.patch(`/api/v1/admin/orders/${id}/status`, { status });
    loadAll();
  }

  async function createCoupon(e) {
    e.preventDefault();
    setCouponError("");
    try {
      await client.post("/api/v1/admin/coupons", {
        code: newCoupon.code,
        discount_type: newCoupon.discount_type,
        discount_value: Number(newCoupon.discount_value),
        max_uses: newCoupon.max_uses ? Number(newCoupon.max_uses) : null,
        expires_at: newCoupon.expires_at ? new Date(newCoupon.expires_at).toISOString() : null,
      });
      setNewCoupon({ code: "", discount_type: "percentage", discount_value: "", max_uses: "", expires_at: "" });
      loadCoupons();
    } catch (err) {
      setCouponError(err.response?.data?.detail || "Could not create coupon");
    }
  }

  async function toggleCoupon(id) {
    await client.patch(`/api/v1/admin/coupons/${id}/toggle`);
    loadCoupons();
  }

  async function deleteCoupon(id) {
    await client.delete(`/api/v1/admin/coupons/${id}`);
    loadCoupons();
  }

  if (error) return <p className="error">{error}</p>;

  const productsTotalPages = Math.max(1, Math.ceil(products.length / ROWS_PER_PAGE));
  const productsPageItems = products.slice((productsPage - 1) * ROWS_PER_PAGE, productsPage * ROWS_PER_PAGE);

  const categoriesTotalPages = Math.max(1, Math.ceil(categories.length / ROWS_PER_PAGE));
  const categoriesPageItems = categories.slice((categoriesPage - 1) * ROWS_PER_PAGE, categoriesPage * ROWS_PER_PAGE);

  const ordersTotalPages = Math.max(1, Math.ceil(orders.length / ROWS_PER_PAGE));
  const ordersPageItems = orders.slice((ordersPage - 1) * ROWS_PER_PAGE, ordersPage * ROWS_PER_PAGE);

  return (
    <div>
      <h2 className="page-heading">Admin</h2>
      <div className="admin-tabs">
        <button className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Products</button>
        <button className={tab === "categories" ? "active" : ""} onClick={() => setTab("categories")}>Categories</button>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Orders</button>
        <button className={tab === "analytics" ? "active" : ""} onClick={() => setTab("analytics")}>Analytics</button>
        <button className={tab === "coupons" ? "active" : ""} onClick={() => setTab("coupons")}>Coupons</button>
      </div>

      {tab === "products" && (
        <div>
          <form onSubmit={createProduct} className="admin-form">
            <div className="field">
              <label>Name</label>
              <input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
            </div>
            <div className="field">
              <label>Price (minor unit)</label>
              <input value={newProduct.price_minor} onChange={(e) => setNewProduct({ ...newProduct, price_minor: e.target.value })} required />
            </div>
            <div className="field">
              <label>Stock</label>
              <input value={newProduct.stock_quantity} onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} required />
            </div>
            <div className="field">
              <label>Category</label>
              <select value={newProduct.category_id} onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button className="primary" type="submit">Add product</button>
          </form>
          {productsPageItems.map((p) => (
            <div key={p.id} className="admin-row">
              <span>{p.name} — {(p.price_minor / 100).toFixed(2)} {p.currency.toUpperCase()} — stock: {p.stock_quantity}</span>
              <button className="admin-row-delete" onClick={() => requestDeleteProduct(p)}>Delete</button>
            </div>
          ))}
          <AdminPagination page={productsPage} totalPages={productsTotalPages} onPageChange={setProductsPage} />
        </div>
      )}

      {tab === "categories" && (
        <div>
          <form onSubmit={createCategory} className="admin-form">
            <div className="field">
              <label>Category name</label>
              <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required />
            </div>
            <button className="primary" type="submit">Add category</button>
          </form>
          {categoriesPageItems.map((c) => <div key={c.id} className="admin-row"><span>{c.name}</span></div>)}
          <AdminPagination page={categoriesPage} totalPages={categoriesTotalPages} onPageChange={setCategoriesPage} />
        </div>
      )}

      {tab === "orders" && (
        <div>
          {ordersPageItems.map((o) => (
            <div key={o.id} className="admin-row">
              <span>Order #{o.id} — {(o.total_amount_minor / 100).toFixed(2)} {o.currency.toUpperCase()}</span>
              <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                <option value="pending">pending</option>
                <option value="paid">paid</option>
                <option value="declined">declined</option>
                <option value="shipped">shipped</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          ))}
          <AdminPagination page={ordersPage} totalPages={ordersTotalPages} onPageChange={setOrdersPage} />
        </div>
      )}

      {tab === "analytics" && (
        <div className="admin-analytics">
          {analyticsLoading && <p className="muted">Loading analytics...</p>}
          {analyticsError && <p className="error">{analyticsError}</p>}

          {!analyticsLoading && !analyticsError && analyticsSummary && (
            <>
              <div className="analytics-summary-grid">
                <div className="analytics-summary-card">
                  <span className="analytics-summary-label">Total revenue</span>
                  <span className="analytics-summary-value">
                    {formatMoney(analyticsSummary.total_revenue_minor)}
                  </span>
                </div>
                <div className="analytics-summary-card">
                  <span className="analytics-summary-label">Paid orders</span>
                  <span className="analytics-summary-value">{analyticsSummary.order_count}</span>
                </div>
                <div className="analytics-summary-card">
                  <span className="analytics-summary-label">Avg order value</span>
                  <span className="analytics-summary-value">
                    {formatMoney(analyticsSummary.average_order_value_minor)}
                  </span>
                </div>
                <div className="analytics-summary-card">
                  <span className="analytics-summary-label">Low stock items</span>
                  <span className="analytics-summary-value">{analyticsSummary.low_stock_count}</span>
                </div>
              </div>

              <div className="analytics-section">
                <h3 className="analytics-section-heading">Revenue — last 30 days</h3>
                <RevenueChart points={revenuePoints} />
              </div>

              <div className="analytics-columns">
                <div className="analytics-section">
                  <h3 className="analytics-section-heading">Top products</h3>
                  {topProducts.length === 0 && <p className="muted">No sales yet.</p>}
                  {topProducts.map((p) => (
                    <div key={p.product_id} className="admin-row">
                      <span>{p.name} — {p.quantity_sold} sold</span>
                      <span>{formatMoney(p.revenue_minor)}</span>
                    </div>
                  ))}
                </div>

                <div className="analytics-section">
                  <h3 className="analytics-section-heading">Low stock</h3>
                  {lowStock.length === 0 && <p className="muted">Nothing running low.</p>}
                  {lowStock.map((p) => (
                    <div key={p.id} className="admin-row">
                      <span>{p.name}</span>
                      <span className="low-stock-count">{p.stock_quantity} left</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "coupons" && (
        <div>
          <form onSubmit={createCoupon} className="admin-form">
            <div className="field">
              <label>Code</label>
              <input
                value={newCoupon.code}
                onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                placeholder="e.g. WELCOME10"
                required
              />
            </div>
            <div className="field">
              <label>Type</label>
              <select
                value={newCoupon.discount_type}
                onChange={(e) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off (minor unit)</option>
              </select>
            </div>
            <div className="field">
              <label>{newCoupon.discount_type === "percentage" ? "Percent (1-100)" : "Amount (minor unit)"}</label>
              <input
                value={newCoupon.discount_value}
                onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Max uses (optional)</label>
              <input
                value={newCoupon.max_uses}
                onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
            <div className="field">
              <label>Expires (optional)</label>
              <input
                type="date"
                value={newCoupon.expires_at}
                onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
              />
            </div>
            <button className="primary" type="submit">Create coupon</button>
          </form>

          {couponError && <p className="error">{couponError}</p>}
          {couponsLoading && <p className="muted">Loading coupons...</p>}

          {!couponsLoading && coupons.length === 0 && <p className="muted">No coupons yet.</p>}

          {!couponsLoading && coupons.map((c) => (
            <div key={c.id} className="admin-row">
              <span>
                <strong>{c.code}</strong>{" "}
                {c.discount_type === "percentage" ? `${c.discount_value}% off` : `${(c.discount_value / 100).toFixed(2)} off`}
                {" — used "}{c.times_used}{c.max_uses ? ` / ${c.max_uses}` : ""}
                {c.expires_at ? ` — expires ${new Date(c.expires_at).toLocaleDateString()}` : ""}
                {" — "}
                <span className={c.active ? "coupon-status-active" : "coupon-status-inactive"}>
                  {c.active ? "active" : "inactive"}
                </span>
              </span>
              <span>
                <button onClick={() => toggleCoupon(c.id)}>{c.active ? "Deactivate" : "Activate"}</button>
                <button className="admin-row-delete" onClick={() => deleteCoupon(c.id)}>Delete</button>
              </span>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          message={`Delete "${pendingDelete.name}"? This can't be undone.`}
          onConfirm={confirmDeleteProduct}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}