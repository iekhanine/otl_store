import {
  ArrowRight,
  PackageOpen,
  Search,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import HardwareCard from "../components/marketplace/HardwareCard";
import {
  getMarketplaceListings,
  type MarketplaceListing,
} from "../services/marketplaceApi";

/* ==========================================================
   HARDWARE PAGE 001
   Public hardware marketplace
   ========================================================== */

export default function HardwarePage() {
  const [products, setProducts] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [condition, setCondition] = useState("all");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const listings = await getMarketplaceListings(100);
      setProducts(listings);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load hardware.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const query = searchParams.get("q") ?? "";
    setSearch(query);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return products.filter((product) => {
      const text = `${product.title} ${product.brand ?? ""} ${product.model ?? ""} ${product.subcategory}`.toLowerCase();
      const matchesSearch = !needle || text.includes(needle);
      const matchesCondition =
        condition === "all" || product.condition === condition;

      return matchesSearch && matchesCondition;
    });
  }, [products, search, condition]);

  const conditions = Array.from(
    new Set(products.map((product) => product.condition)),
  ).filter(Boolean);

  /* ========================================================
     HARDWARE PAGE 002
     Header
     ======================================================== */

  return (
    <main className="store-shell marketplace-page">
      <div className="marketplace-page-heading">
        <div>
          <span className="eyebrow dark">HARDWARE MARKETPLACE</span>
          <h1>Hardware</h1>
          <p>
            RAM and other hardware sold by approved OneTime Labs sellers.
          </p>
        </div>
      </div>

      {/* ======================================================
          HARDWARE PAGE 003
          Loading / unavailable states
          ====================================================== */}

      {loading ? (
        <div className="prototype-note wide-note">Loading hardware...</div>
      ) : error ? (
        <section className="hardware-unavailable" role="status">
          <PackageOpen size={28} />
          <div>
            <h2>Hardware is temporarily unavailable.</h2>
            <p>{error}</p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => void loadProducts()}
          >
            Try again
          </button>
        </section>
      ) : products.length === 0 ? (
        <HardwareEmptyState />
      ) : (
        <>
          {/* ==================================================
              HARDWARE PAGE 004
              Search and filters
              ================================================== */}

          <div className="marketplace-filterbar">
            <label className="marketplace-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search RAM, brands, part numbers..."
              />
            </label>

            <label className="marketplace-select">
              <SlidersHorizontal size={16} />
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
              >
                <option value="all">All conditions</option>
                {conditions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* ==================================================
              HARDWARE PAGE 005
              Product grid / filtered empty state
              ================================================== */}

          {filtered.length === 0 ? (
            <div className="marketplace-empty">
              <Search size={24} />
              <h2>No matching hardware.</h2>
              <p>
                Try a different search or change the condition filter.
              </p>
            </div>
          ) : (
            <div className="hardware-grid">
              {filtered.map((product) => (
                <HardwareCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

/* ==========================================================
   HARDWARE PAGE 006
   Empty marketplace landing state
   ========================================================== */

function HardwareEmptyState() {
  return (
    <section className="hardware-empty-storefront">
      <div className="hardware-empty-storefront-main">
        <PackageOpen size={34} />
        <div>
          <span className="eyebrow dark">HARDWARE</span>
          <h2>No hardware is listed yet.</h2>
          <p>
            This shelf is empty right now. New seller inventory will appear
            here automatically when products are published.
          </p>
        </div>
      </div>

      <div className="hardware-empty-storefront-actions">
        <NavLink className="button primary" to="/seller">
          <Store size={16} />
          Sell hardware
        </NavLink>

        <NavLink className="button secondary" to="/software">
          Browse software
          <ArrowRight size={15} />
        </NavLink>
      </div>
    </section>
  );
}
