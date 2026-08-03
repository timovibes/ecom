import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    client.get(`/api/v1/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Product not found"));
  }, [id]);

  async function addToCart() {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await client.post("/api/v1/cart/items", { product_id: Number(id), quantity: 1 });
      setAdded(true);
    } catch {
      setError("Could not add to cart");
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!product) return null;

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 24, marginBottom: 12 }}>{product.name}</h2>
      <p className="price" style={{ fontSize: 20, marginBottom: 12 }}>
        {(product.price_minor / 100).toFixed(2)} {product.currency.toUpperCase()}
      </p>
      <p className="muted" style={{ marginBottom: 20 }}>{product.description}</p>
      <p className="muted" style={{ marginBottom: 20 }}>
        {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : "Out of stock"}
      </p>
      <button className="primary" onClick={addToCart} disabled={product.stock_quantity === 0}>
        Add to cart
      </button>
      {added && <p className="muted" style={{ marginTop: 8 }}>Added to cart.</p>}
    </div>
  );
}