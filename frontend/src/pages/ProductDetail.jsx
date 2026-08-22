import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const { user } = useAuth();
  const { refreshCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // If we arrived via a product card, this brings you back to the exact filtered/sorted view.
  const backTo = location.state?.from || "/shop";

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
      await client.post("/api/v1/cart/items", { product_id: Number(id), quantity: qty });
      setAdded(true);
      refreshCart();
    } catch {
      setError("Could not add to cart");
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!product) return null;

  const inStock = product.stock_quantity > 0;

  return (
    <div>
      <nav className="breadcrumb">
        <Link to={backTo}>Products</Link>
        {product.category_name && (
          <>
            <span className="sep">/</span>
            <span>{product.category_name}</span>
          </>
        )}
        <span className="sep">/</span>
        <span className="current">{product.name}</span>
      </nav>

      <div className="product-detail">
        <div className="product-detail-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="no-image">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="0" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>Image coming soon</span>
            </div>
          )}
        </div>

        <div className="product-detail-info">
          {product.category_name && (
            <p className="product-detail-eyebrow">{product.category_name}</p>
          )}
          <h2>{product.name}</h2>
          <p className="product-detail-price">
            {(product.price_minor / 100).toFixed(2)} {product.currency.toUpperCase()}
          </p>

          <hr className="product-detail-divider" />

          <p className="product-detail-description">{product.description}</p>

          <div className={`stock-indicator ${!inStock ? "out-text" : ""}`}>
            <span className={`stock-dot ${!inStock ? "out" : ""}`} />
            {inStock ? `${product.stock_quantity} in stock` : "Out of stock"}
          </div>

          {inStock && (
            <div className="qty-selector">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label={`Decrease quantity, currently ${qty}`}
              >
                -
              </button>
              <span>{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock_quantity, q + 1))}
                aria-label={`Increase quantity, currently ${qty}`}
              >
                +
              </button>
            </div>
          )}

          <div className="product-detail-actions">
            <button className="primary" onClick={addToCart} disabled={!inStock}>
              {inStock ? "Add to cart" : "Out of stock"}
            </button>
          </div>

          {added && (
            <div className="added-banner">
              <span>Added to your bag</span>
              <Link to="/cart">View bag</Link>
            </div>
          )}

          <div className="product-detail-meta">
            <span>Complimentary shipping on all orders</span>
            <span>Returns accepted within 30 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}