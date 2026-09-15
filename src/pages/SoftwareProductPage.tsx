import {
  Check,
  Download,
  Infinity as InfinityIcon,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { StoreProduct } from "../data/products";
import { getSoftwareProduct, startProductCheckout } from "../services/storeApi";

export default function SoftwareProductPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutStarting, setCheckoutStarting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getSoftwareProduct(slug)
      .then((loaded) => {
        if (active) setProduct(loaded);
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load product.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  async function buyProduct() {
    if (!product) return;

    if (!user) {
      navigate(`/login?return=${encodeURIComponent(`/software/${product.slug}`)}`);
      return;
    }

    try {
      setError(null);
      setCheckoutStarting(true);
      await startProductCheckout(product.slug);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
      setCheckoutStarting(false);
    }
  }

  if (loading) {
    return (
      <main className="store-shell product-page">
        <div className="software-empty-state">Loading product...</div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="store-shell product-page">
        <div className="software-empty-state">
          {error || "Software product not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="store-shell product-page">
      <div className="breadcrumbs">
        Store <span>/</span> Software <span>/</span> {product.name}
      </div>

      <section className="product-hero-grid">
        <div className="product-detail-copy">
          <div className="product-title-with-icon">
            <img src={product.icon} alt="" />
            <div>
              <span className="eyebrow dark">ONETIME LABS SOFTWARE</span>
              <h1>{product.name}</h1>
              <p>{product.tagline}</p>
            </div>
          </div>

          <p className="product-lead">{product.description}</p>

          {product.features.length ? (
            <ul className="feature-list">
              {product.features.map((feature) => (
                <li key={feature}>
                  <Check size={17} />
                  {feature}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="purchase-box">
            <div>
              <strong>{product.price}</strong>
              <span>Pay once. No monthly subscription.</span>
            </div>
            <button
              className="button primary purchase-button"
              onClick={buyProduct}
              disabled={checkoutStarting}
            >
              {checkoutStarting
                ? "Opening Checkout..."
                : user
                  ? `Buy ${product.name}`
                  : "Sign in to Buy"}
            </button>
          </div>

          {error && (
            <div className="checkout-error" role="alert">
              {error}
            </div>
          )}

          <div className="license-note">
            <InfinityIcon size={18} />
            <div>
              <strong>Buy once. Keep it.</strong>
              <span>Your license is tied to your OneTime Labs account.</span>
            </div>
          </div>
        </div>

        <div className="product-preview-column">
          <div className="requirements-card">
            <h3>Product details</h3>
            <div className="requirement-row">
              <Monitor size={18} />
              <div>
                <strong>{product.platform || "Desktop software"}</strong>
                <span>Version {product.version || "current"}</span>
              </div>
            </div>
            <div className="requirement-row">
              <Download size={18} />
              <div>
                <strong>Private download</strong>
                <span>Your account creates a fresh one-time download link.</span>
              </div>
            </div>
            <div className="requirement-row">
              <ShieldCheck size={18} />
              <div>
                <strong>Licensed to you</strong>
                <span>Activation is checked against your issued license.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
