import {
  Download,
  Infinity as InfinityIcon,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";

import ProductCard from "../components/ProductCard";
import StreamSafePreview from "../components/StreamSafePreview";
import { products } from "../data/products";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="store-shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              ONE-TIME PURCHASES. LIFETIME VALUE.
            </div>

            <h1>
              Software that
              <br />
              works for you.
            </h1>

            <p>
              Windows software from OneTime Labs.
              Buy it once. Install it. Keep it.
            </p>

            <div className="hero-actions">
              <a href="#software" className="button primary large">
                Browse Software
              </a>
              <NavLink
                to="/streamsafe"
                className="button secondary large"
              >
                View StreamSafe
              </NavLink>
            </div>

            <div className="hero-benefits">
              <span><ShieldCheck size={16} /> One-time purchase</span>
              <span><InfinityIcon size={16} /> Lifetime license</span>
              <span><Download size={16} /> Instant download</span>
              <span><Rocket size={16} /> Future updates</span>
            </div>
          </div>

          <div className="hero-visual">
            <StreamSafePreview />
          </div>
        </div>
      </section>

      <main className="store-shell page-content">
        <section id="software" className="section-block">
          <div className="section-heading">
            <div>
              <span className="eyebrow dark">WINDOWS SOFTWARE</span>
              <h2>Our Software</h2>
              <p>
                Downloadable Windows applications from OneTime Labs.
              </p>
            </div>
          </div>

          <div className="product-list">
            {products.map(product => (
              <ProductCard
                key={product.slug}
                product={product}
              />
            ))}
          </div>
        </section>

        <section className="principles-grid">
          <div className="principle">
            <div className="principle-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <strong>One-time purchase</strong>
              <span>No subscriptions. No recurring software fee.</span>
            </div>
          </div>

          <div className="principle">
            <div className="principle-icon">
              <Download size={22} />
            </div>
            <div>
              <strong>Your installer</strong>
              <span>Download the EXE and install it on your Windows PC.</span>
            </div>
          </div>

          <div className="principle">
            <div className="principle-icon">
              <InfinityIcon size={22} />
            </div>
            <div>
              <strong>Future updates included</strong>
              <span>Your StreamSafe license remains valid as the app improves.</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
