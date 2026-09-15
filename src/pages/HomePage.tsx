import {
  ArrowRight,
  Box,
  Boxes,
  PackageCheck,
  ShieldCheck,
  Store,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import { NavLink } from "react-router-dom";
import HardwareCard from "../components/marketplace/HardwareCard";
import ProductCard from "../components/ProductCard";
import { products, type StoreProduct } from "../data/products";
import { getSoftwareProducts } from "../services/storeApi";
import {
  getMarketplaceListings,
  type MarketplaceListing,
} from "../services/marketplaceApi";

/* ==========================================================
   STORE HOME 001
   Commerce-first storefront
   ========================================================== */

export default function HomePage() {
  const [software, setSoftware] = useState<StoreProduct[]>(products);
  const [hardware, setHardware] = useState<MarketplaceListing[]>([]);

  useEffect(() => {
    getSoftwareProducts()
      .then((loaded) => {
        if (loaded.length) setSoftware(loaded);
      })
      .catch(() => setSoftware(products));

    getMarketplaceListings(8)
      .then(setHardware)
      .catch(() => setHardware([]));
  }, []);

  return (
    <main className="store-shell storefront-page">
      {/* ======================================================
          STORE HOME 002
          Shop by department

          RAM and storage are hardware categories, not separate
          top-level departments.
          ====================================================== */}
      <section className="storefront-departments">
        <div className="storefront-title-row">
          <div>
            <span className="eyebrow dark">SHOP</span>
            <h1>Shop by department</h1>
          </div>
        </div>

        <div className="department-card-grid department-card-grid-primary">
          <article className="department-card department-card-parent">
            <div className="department-card-copy">
              <span className="department-card-kicker">ONETIME LABS SOFTWARE</span>
              <NavLink to="/software" className="department-card-title-link">
                Software
                <ArrowRight size={15} />
              </NavLink>
              <p>One-time purchase applications built and distributed by OneTime Labs.</p>
            </div>

            <div className="department-subcategory-row" aria-label="Software categories">
              <NavLink to="/software">All Software</NavLink>
              <NavLink to="/streamsafe">StreamSafe</NavLink>
            </div>
          </article>

          <article className="department-card department-card-parent">
            <div className="department-card-copy">
              <span className="department-card-kicker">MARKETPLACE HARDWARE</span>
              <NavLink to="/hardware" className="department-card-title-link">
                Hardware
                <ArrowRight size={15} />
              </NavLink>
              <p>PC components, memory, storage, systems, and other physical inventory.</p>
            </div>

            <div className="department-subcategory-row" aria-label="Hardware categories">
              <NavLink to="/hardware?q=RAM">RAM</NavLink>
              <NavLink to="/hardware?q=storage">Storage</NavLink>
              <NavLink to="/hardware">All Hardware</NavLink>
            </div>
          </article>
        </div>
      </section>

      {/* ======================================================
          STORE HOME 003
          Software shelf — first-party products first
          ====================================================== */}
      <section id="software" className="storefront-section storefront-shelf">
        <div className="storefront-section-heading">
          <div>
            <span className="eyebrow dark">SOFTWARE</span>
            <h2>Software</h2>
            <p>One-time purchase software from OneTime Labs.</p>
          </div>
          <NavLink to="/software">
            Shop all software <ArrowRight size={15} />
          </NavLink>
        </div>

        <div className="product-list">
          {software.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* ======================================================
          STORE HOME 004
          Hardware marketplace shelf
          ====================================================== */}
      <section className="storefront-section storefront-shelf">
        <div className="storefront-section-heading">
          <div>
            <span className="eyebrow dark">HARDWARE</span>
            <h2>Hardware</h2>
            <p>Current inventory from approved sellers.</p>
          </div>
          <NavLink to="/hardware">
            Shop all hardware <ArrowRight size={15} />
          </NavLink>
        </div>

        {hardware.length ? (
          <div className="hardware-grid compact-grid">
            {hardware.map((product) => (
              <HardwareCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="store-shelf-empty">
            <div className="store-shelf-empty-icon">
              <Boxes size={28} />
            </div>
            <div>
              <strong>No hardware on the shelves yet.</strong>
              <span>
                Seller inventory will appear here as soon as listings are published.
              </span>
            </div>
            <NavLink className="button secondary" to="/seller">
              Sell hardware
            </NavLink>
          </div>
        )}
      </section>

      {/* ======================================================
          STORE HOME 005
          Seller strip
          ====================================================== */}
      <section className="store-seller-strip">
        <div className="store-seller-strip-icon">
          <Store size={30} />
        </div>
        <div>
          <span className="eyebrow dark">SELL ON ONETIME LABS</span>
          <h2>Have hardware to sell?</h2>
          <p>
            Create a seller account, list inventory, track online orders,
            and record local cash sales from one dashboard.
          </p>
        </div>
        <NavLink className="button primary" to="/seller">
          Seller Center
          <ArrowRight size={15} />
        </NavLink>
      </section>

      {/* ======================================================
          STORE HOME 006
          Store assurances
          ====================================================== */}
      <section className="store-trust-row storefront-trust-row">
        <span><ShieldCheck size={16} /> Approved sellers</span>
        <span><PackageCheck size={16} /> Seller-managed inventory</span>
        <span><Box size={16} /> Shipping & local pickup</span>
        <span><Store size={16} /> Direct marketplace</span>
      </section>
    </main>
  );
}
