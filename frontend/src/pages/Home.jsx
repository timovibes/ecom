import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import client from "../api/client";

const PAGE_SIZE = 12;
const SECTION_PREVIEW_SIZE = 8;
const SECTIONS_PER_PAGE = 2;
const SKELETON_COUNT = 8;

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

function ProductCard({ p, backTo }) {
  return (
    <Link to={`/products/${p.id}`} state={{ from: backTo }} className="card product-card">
      <div className="product-thumb">
        {p.image_url
          ? <img src={p.image_url} alt={p.name} loading="lazy" />
          : <span className="muted">No image</span>}
        {p.stock_quantity === 0 && <span className="badge product-card-badge">OUT OF STOCK</span>}
      </div>
      <h3 className="product-card-name">{p.name}</h3>
      <p className="price">
        {(p.price_minor / 100).toFixed(2)}
        <span className="price-currency">{p.currency.toUpperCase()}</span>
      </p>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="card skeleton-card">
      <div className="skeleton-thumb" />
      <div className="skeleton-line skeleton-line-name" />
      <div className="skeleton-line skeleton-line-price" />
    </div>
  );
}

function SectionControls({ canShowMore, canShowLess, onShowMore, onShowLess }) {
  if (!canShowMore && !canShowLess) return null;
  return (
    <div className="section-controls">
      {canShowMore && <button onClick={onShowMore}>Show more categories</button>}
      {canShowLess && <button onClick={onShowLess}>Show less</button>}
    </div>
  );
}

export default function Home() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("q") || "";
  const categoryId = searchParams.get("category") || "";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [visibleSections, setVisibleSections] = useState(SECTIONS_PER_PAGE);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function updateFilterParams(updates) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    }, { replace: true });
  }

  const setSearch = (value) => updateFilterParams({ q: value });
  const setCategoryId = (value) => updateFilterParams({ category: value });

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
    if (!search && !categoryId) params.limit = 100; // browsing-all: need full catalog to group by category
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

  // Reset section pagination whenever we come back to the "browsing all" view.
  useEffect(() => {
    setVisibleSections(SECTIONS_PER_PAGE);
  }, [search, categoryId]);

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

  // Category -> product count, only meaningful while browsing the full catalog.
  const categoryCounts = useMemo(() => {
    const counts = new Map();
    if (!browsingAll) return counts;
    for (const p of products) {
      const key = p.category_id == null ? "none" : p.category_id;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [browsingAll, products]);

  const visibleSectioned = sectioned.slice(0, visibleSections);
  const canShowMore = visibleSections < sectioned.length;
  const canShowLess = visibleSections > SECTIONS_PER_PAGE;

  const sortedFlat = useMemo(() => sortProducts(products, sortBy), [products, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sortedFlat.length / PAGE_SIZE));
  const pageItems = sortedFlat.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters = Boolean(search || categoryId);

  const selectCategory = (id) => {
    setCategoryId(id);
    setSidebarOpen(false);
  };

  const clearSearch = () => setSearch("");
  const clearCategory = () => setCategoryId("");
  const clearAll = () => updateFilterParams({ q: "", category: "" });

  const activeCategoryName = categoryId
    ? categories.find((c) => String(c.id) === String(categoryId))?.name
    : null;

  const handleShowMore = () => setVisibleSections((n) => n + SECTIONS_PER_PAGE);
  const handleShowLess = () => setVisibleSections(SECTIONS_PER_PAGE);

  const activeFilterCount = (search ? 1 : 0) + (categoryId ? 1 : 0);

  // Passed to product links so their detail-page breadcrumb can return to this exact view.
  const backTo = location.pathname + location.search;

  return (
    <div className="shop">
      {sidebarOpen && (
        <div className="sidebar-backdrop open" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`shop-sidebar${sidebarOpen ? " open" : ""}`}>
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
          Close
        </button>

        <div className="sidebar-section">
          <h2 className="sidebar-heading">Search</h2>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="sidebar-section">
          <h2 className="sidebar-heading">Categories</h2>
          <ul className="category-list">
            <li className={`category-item${!categoryId ? " active" : ""}`}>
              <button onClick={() => selectCategory("")}>
                All products
                {browsingAll && <span className="category-item-count">{products.length}</span>}
              </button>
            </li>
            {categories.map((c) => (
              <li
                key={c.id}
                className={`category-item${String(categoryId) === String(c.id) ? " active" : ""}`}
              >
                <button onClick={() => selectCategory(String(c.id))}>
                  {c.name}
                  {browsingAll && categoryCounts.has(c.id) && (
                    <span className="category-item-count">{categoryCounts.get(c.id)}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="shop-main">
        <div className="results-bar">
          <button className="mobile-filter-toggle" onClick={() => setSidebarOpen(true)}>
            Filters
          </button>
          <span className="results-count">
            {loading
              ? "Loading products..."
              : browsingAll
                ? `${products.length} product${products.length === 1 ? "" : "s"}`
                : `${sortedFlat.length} result${sortedFlat.length === 1 ? "" : "s"}`}
          </span>
          {!loading && !browsingAll && (
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </div>

        {!loading && hasActiveFilters && (
          <div className="filter-chips">
            {activeCategoryName && (
              <button className="filter-chip" onClick={clearCategory}>
                {activeCategoryName} <span className="filter-chip-x">×</span>
              </button>
            )}
            {search && (
              <button className="filter-chip" onClick={clearSearch}>
                "{search}" <span className="filter-chip-x">×</span>
              </button>
            )}
            {activeFilterCount > 1 && (
              <button className="filter-chip filter-chip-clear-all" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        )}

        {error && <p className="error">{error}</p>}

        {loading && (
          <div className="grid product-grid">
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="empty-state">
            <p className="empty-state-message">
              {hasActiveFilters ? "No products match your filters." : "No products found."}
            </p>
            {hasActiveFilters && (
              <button className="primary" onClick={clearAll}>Clear filters</button>
            )}
          </div>
        )}

        {!loading && !error && browsingAll && visibleSectioned.map((section) => (
          <div key={section.id} className="product-section">
            <div className="product-section-header">
              <h2>{section.name}</h2>
              {section.items.length > SECTION_PREVIEW_SIZE && (
                <button onClick={() => selectCategory(section.id === "none" ? "" : String(section.id))}>
                  View all ({section.items.length})
                </button>
              )}
            </div>
            <div className="grid product-grid">
              {section.items.slice(0, SECTION_PREVIEW_SIZE).map((p) => (
                <ProductCard key={p.id} p={p} backTo={backTo} />
              ))}
            </div>
          </div>
        ))}

        {!loading && !error && browsingAll && (
          <SectionControls
            canShowMore={canShowMore}
            canShowLess={canShowLess}
            onShowMore={handleShowMore}
            onShowLess={handleShowLess}
          />
        )}

        {!loading && !error && !browsingAll && products.length > 0 && (
          <>
            <div className="grid product-grid">
              {pageItems.map((p) => (
                <ProductCard key={p.id} p={p} backTo={backTo} />
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
    </div>
  );
}