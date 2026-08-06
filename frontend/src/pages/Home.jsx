import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

const PAGE_SIZE = 12;
const SECTION_PREVIEW_SIZE = 6;

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
];

function sortProducts(products, sortBy) {
  const sorted = [...products];
  switch (sortBy) {
    case "price_asc":
      return sorted.sort((a, b) => a.price_minor - b.price_minor);
    case "price_desc":
      return sorted.sort((a, b) => b.price_minor - a.price_minor);
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "newest":
    default:
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
}

function ProductCard({ p }) {
  return (
    <Link to={`/products/${p.id}`} className="card product-card">
      <div className="product-thumb">
        {p.image_url
          ? <img src={p.image_url} alt={p.name} loading="lazy" />
          : <span className="muted">No image</span>}
        {p.stock_quantity === 0 && <span className="badge product-card-badge">OUT OF STOCK</span>}
      </div>
      <h3 className="product-card-name">{p.name}</h3>
      <p className="price">{(p.price_minor / 100).toFixed(2)} {p.currency.toUpperCase()}</p>
    </Link>
  );
}

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/api/v1/categories/")
      .then((res) => setCategories(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (categoryId) params.category_id = categoryId;
    client.get("/api/v1/products/", { params })
      .then((res) => {
        setProducts(res.data);
        setError("");
      })
      .catch(() => setError("Could not load products"))
      .finally(() => setLoading(false));
  }, [search, categoryId]);

  // Reset to page 1 whenever the result set or sort order changes underneath the pager.
  useEffect(() => {
    setPage(1);
  }, [search, categoryId, sortBy]);

  const browsingAll = !search && !categoryId;

  const sectioned = useMemo(() => {
    if (!browsingAll) return [];
    const byCategory = new Map();
    const uncategorized = [];
    for (const p of products) {
      if (p.category_id == null) {
        uncategorized.push(p);
        continue;
      }
      if (!byCategory.has(p.category_id)) byCategory.set(p.category_id, []);
      byCategory.get(p.category_id).push(p);
    }
    const sections = categories
      .filter((c) => byCategory.has(c.id))
      .map((c) => ({ id: c.id, name: c.name, items: sortProducts(byCategory.get(c.id), "newest") }));
    if (uncategorized.length > 0) {
      sections.push({ id: "none", name: "More", items: sortProducts(uncategorized, "newest") });
    }
    return sections;
  }, [browsingAll, products, categories]);

  const sortedFlat = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sortedFlat.length / PAGE_SIZE));
  const pageItems = sortedFlat.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="filters-bar">
        <input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          style={{ maxWidth: 200 }}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {!browsingAll && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{ maxWidth: 200 }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading products...</p>}

      {!loading && !error && products.length === 0 && (
        <p className="muted">No products found.</p>
      )}

      {!loading && !error && browsingAll && sectioned.map((section) => (
        <div key={section.id} className="product-section">
          <div className="product-section-header">
            <h2>{section.name}</h2>
            {section.items.length > SECTION_PREVIEW_SIZE && (
              <button onClick={() => setCategoryId(section.id === "none" ? "" : String(section.id))}>
                View all ({section.items.length})
              </button>
            )}
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {section.items.slice(0, SECTION_PREVIEW_SIZE).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      ))}

      {!loading && !error && !browsingAll && (
        <>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {pageItems.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </button>
              <span className="muted">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}