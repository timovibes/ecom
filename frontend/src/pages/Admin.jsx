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

  function loadAll() {
    client.get("/api/v1/products/").then((res) => setProducts(res.data)).catch(() => {});
    client.get("/api/v1/categories/").then((res) => setCategories(res.data)).catch(() => {});
    client.get("/api/v1/admin/orders").then((res) => setOrders(res.data)).catch(() => setError("Admin access required"));
  }

  useEffect(loadAll, []);

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