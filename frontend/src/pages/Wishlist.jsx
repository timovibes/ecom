import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    client.get("/api/v1/wishlist/")
      .then((res) => setItems(res.data.items))
      .catch(() => setError("Could not load wishlist"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function remove(productId) {
    try {
      await client.delete(`/api/v1/wishlist/${productId}`);
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
    } catch {
      setError("Could not remove item");
    }
  }

  if (loading) return <p className="muted">Loading your wishlist...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div>
      <h2>Your wishlist</h2>

      {items.length === 0 && (
        <p className="muted">Nothing saved yet. Browse the shop and tap the heart on any product.</p>
      )}

      <div className="wishlist-grid">
        {items.map((item) => (
          <div key={item.id} className="wishlist-card">
            <Link to={`/products/${item.product.id}`}>
              {item.product.image_url ? (
                <img src={item.product.image_url} alt={item.product.name} />
              ) : (
                <div className="no-image small">No image</div>
              )}
              <h4>{item.product.name}</h4>
              <p>{(item.product.price_minor / 100).toFixed(2)} {item.product.currency.toUpperCase()}</p>
            </Link>
            <button className="secondary" onClick={() => remove(item.product.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}