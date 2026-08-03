import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    client.get("/api/v1/products/", { params: search ? { search } : {} })
      .then((res) => setProducts(res.data))
      .catch(() => setError("Could not load products"));
  }, [search]);

  return (
    <div>
      <input
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 24, maxWidth: 320 }}
      />
      {error && <p className="error">{error}</p>}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {products.map((p) => (
          <Link to={`/products/${p.id}`} key={p.id} className="card">
            <h3 style={{ fontSize: 15, marginBottom: 8 }}>{p.name}</h3>
            <p className="price">{(p.price_minor / 100).toFixed(2)} {p.currency.toUpperCase()}</p>
            {p.stock_quantity === 0 && <span className="badge">OUT OF STOCK</span>}
          </Link>
        ))}
      </div>
      {products.length === 0 && !error && <p className="muted">No products found.</p>}
    </div>
  );
}