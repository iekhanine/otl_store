import {
  ArrowRight,
  Check,
  Monitor,
  PackageOpen,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { NavLink } from "react-router-dom";
import {
  products,
  softwareProductPath,
  softwareTypeLabels,
  type SoftwareType,
  type StoreProduct,
} from "../data/products";
import { getSoftwareProducts } from "../services/storeApi";

/* ==========================================================
   SOFTWARE PAGE 001
   Store-first software catalog
   ========================================================== */

type SoftwareFilter = "all" | SoftwareType;

const softwareFilters: Array<{
  key: SoftwareFilter;
  label: string;
}> = [
  { key: "all", label: "All" },
  { key: "windows", label: "Windows" },
  { key: "web", label: "Web Apps" },
  { key: "macos", label: "macOS" },
  { key: "linux", label: "Linux" },
];

export default function SoftwarePage() {
  const [filter, setFilter] = useState<SoftwareFilter>("all");
  const [catalog, setCatalog] = useState<StoreProduct[]>(products);

  useEffect(() => {
    let active = true;

    getSoftwareProducts()
      .then((loaded) => {
        if (active && loaded.length) setCatalog(loaded);
      })
      .catch((error) => {
        console.warn("Using bundled software catalog fallback:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const featuredProduct = catalog.find((product) => product.featured) ?? catalog[0];

  const visibleProducts = useMemo(() => {
    if (filter === "all") {
      return catalog;
    }

    return catalog.filter((product) => product.softwareType === filter);
  }, [catalog, filter]);

  return (
    <main className="store-shell software-page">
      {/* ====================================================
          SOFTWARE PAGE 002
          Page heading
          ==================================================== */}
      <section className="software-page-heading">
        <div>
          <span className="eyebrow dark">ONETIME LABS SOFTWARE</span>
          <h1>Software</h1>
          <p>
            Software built by OneTime Labs. Buy it, install it, and keep it.
          </p>
        </div>
      </section>

      {/* ====================================================
          SOFTWARE PAGE 003
          Featured product — intentionally compact
          ==================================================== */}
      {featuredProduct ? (
        <FeaturedSoftware product={featuredProduct} />
      ) : null}

      {/* ====================================================
          SOFTWARE PAGE 004
          Catalog controls
          ==================================================== */}
      <section className="software-catalog-section">
        <div className="software-catalog-heading">
          <div>
            <span className="eyebrow dark">BROWSE</span>
            <h2>All software</h2>
            <p>Browse OneTime Labs software by platform.</p>
          </div>

          <div className="software-filter" aria-label="Filter software by platform">
            {softwareFilters.map((item) => (
              <button
                key={item.key}
                type="button"
                className={filter === item.key ? "active" : ""}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {visibleProducts.length ? (
          <div className="software-list">
            {visibleProducts.map((product) => (
              <SoftwareListItem key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="software-empty-state">
            <PackageOpen size={24} />
            <div>
              <strong>No software in this category yet.</strong>
              <span>More OneTime Labs software will show up here as it is released.</span>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* ==========================================================
   SOFTWARE PAGE 005
   Featured software strip
   ========================================================== */

function FeaturedSoftware({ product }: { product: StoreProduct }) {
  return (
    <section className="software-featured-card" aria-label={`Featured software: ${product.name}`}>
      <div className="software-featured-icon">
        <img src={product.icon} alt="" />
      </div>

      <div className="software-featured-copy">
        <div className="software-featured-label-row">
          <span className="software-featured-label">FEATURED</span>
          <span className="software-platform-badge">
            {softwareTypeLabels[product.softwareType]}
          </span>
        </div>

        <h2>{product.name}</h2>
        <p className="software-featured-tagline">{product.tagline}</p>
        <p className="software-featured-description">{product.description}</p>

        <div className="software-featured-meta">
          <span><Monitor size={13} /> {product.platform}</span>
          <span><Check size={13} /> One-time purchase</span>
        </div>
      </div>

      <div className="software-featured-buy">
        <strong>{product.price}</strong>
        <span>Lifetime license</span>
        <NavLink to={softwareProductPath(product)} className="button primary">
          View product
          <ArrowRight size={15} />
        </NavLink>
      </div>
    </section>
  );
}

/* ==========================================================
   SOFTWARE PAGE 006
   Catalog list item
   ========================================================== */

function SoftwareListItem({ product }: { product: StoreProduct }) {
  return (
    <article className="software-list-item">
      <div className="software-list-icon">
        <img src={product.icon} alt="" />
      </div>

      <div className="software-list-copy">
        <div className="software-list-title-row">
          <h3>{product.name}</h3>
          <span className="software-platform-badge">
            {softwareTypeLabels[product.softwareType]}
          </span>
        </div>
        <p>{product.tagline}</p>
        <span className="software-list-platform">{product.platform}</span>
      </div>

      <div className="software-list-price">
        <strong>{product.price}</strong>
        <span>One-time</span>
      </div>

      <NavLink to={softwareProductPath(product)} className="button secondary software-list-action">
        View
        <ArrowRight size={14} />
      </NavLink>
    </article>
  );
}
