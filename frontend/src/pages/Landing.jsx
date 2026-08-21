import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

export default function Landing() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    client.get("/api/v1/categories/")
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  return (
    <div className="landing">
      <section className="landing-hero">
        <p className="landing-eyebrow">The Aurelian Collection</p>
        <h1 className="landing-headline">Quiet luxury, considered detail.</h1>
        <p className="landing-subhead">
          Outerwear, knitwear, and tailoring made to last — designed for people who prefer
          substance over noise.
        </p>
        <Link to="/shop" className="primary landing-cta">Shop the collection</Link>
      </section>

      {categories.length > 0 && (
        <section className="landing-categories">
          <h2 className="landing-section-heading">Shop by category</h2>
          <div className="landing-category-grid">
            {categories.map((c) => (
              <Link
                key={c.id}
                to={`/shop?category=${c.id}`}
                className="landing-category-card"
              >
                <span className="landing-category-name">{c.name}</span>
                <span className="landing-category-arrow">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="landing-strip">
        <div className="landing-strip-item">
          <span className="landing-strip-title">Complimentary shipping</span>
          <span className="muted">On all orders, no minimum</span>
        </div>
        <div className="landing-strip-item">
          <span className="landing-strip-title">30-day returns</span>
          <span className="muted">Simple, no questions asked</span>
        </div>
        <div className="landing-strip-item">
          <span className="landing-strip-title">Considered materials</span>
          <span className="muted">Sourced for longevity, not trend</span>
        </div>
      </section>
    </div>
  );
}