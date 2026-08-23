import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

function Stars({ value, size = 14 }) {
  const rounded = Math.round(value || 0);
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= rounded ? "star-filled" : "star-empty"}>★</span>
      ))}
    </span>
  );
}

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

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [reviewError, setReviewError] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // If we arrived via a product card, this brings you back to the exact filtered/sorted view.
  const backTo = location.state?.from || "/shop";

  useEffect(() => {
    client.get(`/api/v1/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Product not found"));
  }, [id]);

  function loadReviews() {
    setReviewsLoading(true);
    client.get(`/api/v1/products/${id}/reviews/`)
      .then((res) => setReviews(res.data))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }

  useEffect(loadReviews, [id]);

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

  async function submitReview(e) {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      await client.post(`/api/v1/products/${id}/reviews/`, {
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment || null,
      });
      setReviewForm({ rating: 5, comment: "" });
      loadReviews();
    } catch (err) {
      setReviewError(err.response?.data?.detail || "Could not submit review");
    } finally {
      setReviewSubmitting(false);
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

          {product.review_count > 0 && (
            <div className="product-detail-rating">
              <Stars value={product.average_rating} size={15} />
              <span className="muted">
                {product.average_rating} ({product.review_count} review{product.review_count === 1 ? "" : "s"})
              </span>
            </div>
          )}

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

      <section className="reviews-section">
        <h3 className="reviews-heading">Reviews</h3>

        {reviewsLoading && <p className="muted">Loading reviews...</p>}

        {!reviewsLoading && reviews.length === 0 && (
          <p className="muted">No reviews yet — be the first to share your thoughts.</p>
        )}

        {!reviewsLoading && reviews.length > 0 && (
          <div className="review-list">
            {reviews.map((r) => (
              <div key={r.id} className="review-item">
                <div className="review-item-header">
                  <Stars value={r.rating} />
                  <span className="review-item-author">{r.user_name}</span>
                  <span className="muted">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.comment && <p className="review-item-comment">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitReview} className="review-form">
          <h4 className="review-form-heading">Write a review</h4>
          {reviewError && <p className="error">{reviewError}</p>}
          <div className="field">
            <label>Rating</label>
            <select
              value={reviewForm.rating}
              onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Comment (optional)</label>
            <input
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              placeholder="Share your experience..."
            />
          </div>
          <button className="primary" type="submit" disabled={reviewSubmitting}>
            {reviewSubmitting ? "Submitting..." : "Submit review"}
          </button>
        </form>
      </section>
    </div>
  );
}