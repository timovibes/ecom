import { useEffect, useState } from "react";
import client from "../api/client";

export default function Admin() {
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");

  const [newProduct, setNewProduct] = useState({ name: "", price_minor: "", stock_quantity: "", category_id: "" });
  const [newCategory, setNewCategory] = useState("");

  function loadAll() {
    client.get("/api/v1/products/").then((res) => setProducts(res.data)).catch(() => {});
    client.get("/api/v1/categories/").then((res) => setCategories(res.data)).catch(() => {});
    client.get("/api/v1/admin/orders").then((res) => setOrders(res.data)).catch(() => setError("Admin access required"));
  }

  useEffect(loadAll, []);

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
      loadAll();
    } catch {
      setError("Could not create category");
    }
  }

  async function deleteProduct(id) {
    await client.delete(`/api/v1/products/${id}`);
    loadAll();
  }

  async function updateOrderStatus(id, status) {
    await client.patch(`/api/v1/admin/orders/${id}/status`, { status });
    loadAll();
  }

  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2 style={{ marginBottom: 20 }}>Admin</h2>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab("products")}>Products</button>
        <button onClick={() => setTab("categories")}>Categories</button>
        <button onClick={() => setTab("orders")}>Orders</button>
      </div>

      {tab === "products" && (
        <div>
          <form onSubmit={createProduct} style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <input placeholder="Name" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required style={{ maxWidth: 160 }} />
            <input placeholder="Price (minor unit)" value={newProduct.price_minor} onChange={(e) => setNewProduct({ ...newProduct, price_minor: e.target.value })} required style={{ maxWidth: 160 }} />
            <input placeholder="Stock" value={newProduct.stock_quantity} onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: e.target.value })} required style={{ maxWidth: 100 }} />
            <select value={newProduct.category_id} onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })} style={{ maxWidth: 160 }}>
              <option value="">No category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="primary" type="submit">Add product</button>
          </form>
          {products.map((p) => (
            <div key={p.id} className="card" style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span>{p.name} — {(p.price_minor / 100).toFixed(2)} {p.currency.toUpperCase()} — stock: {p.stock_quantity}</span>
              <button onClick={() => deleteProduct(p.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {tab === "categories" && (
        <div>
          <form onSubmit={createCategory} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input placeholder="Category name" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required style={{ maxWidth: 200 }} />
            <button className="primary" type="submit">Add category</button>
          </form>
          {categories.map((c) => <div key={c.id} className="card" style={{ marginBottom: 8 }}>{c.name}</div>)}
        </div>
      )}

      {tab === "orders" && (
        <div>
          {orders.map((o) => (
            <div key={o.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Order #{o.id} — {(o.total_amount_minor / 100).toFixed(2)} {o.currency.toUpperCase()}</span>
                <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value)}>
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="declined">declined</option>
                  <option value="shipped">shipped</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}