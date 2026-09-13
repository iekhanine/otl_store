import {
  Check,
  Download,
  Infinity as InfinityIcon,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import StreamSafePreview from "../components/StreamSafePreview";
import { streamSafe } from "../data/products";
import { startStreamSafeCheckout } from "../services/storeApi";

export default function StreamSafePage() {
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutStarting, setCheckoutStarting] = useState(false);

  async function buyStreamSafe() {
    try {
      setCheckoutError(null);
      setCheckoutStarting(true);
      await startStreamSafeCheckout();
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Unable to start checkout.",
      );
      setCheckoutStarting(false);
    }
  }

  return (
    <main className="store-shell product-page">
      <div className="breadcrumbs">
        Store <span>/</span> StreamSafe
      </div>

      <section className="product-hero-grid">
        <div className="product-detail-copy">
          <div className="product-title-with-icon">
            <img src={streamSafe.icon} alt="" />
            <div>
              <span className="eyebrow dark">WINDOWS SOFTWARE</span>
              <h1>StreamSafe</h1>
              <p>{streamSafe.tagline}</p>
            </div>
          </div>

          <p className="product-lead">
            {streamSafe.description}
          </p>

          <ul className="feature-list">
            {streamSafe.features.map(feature => (
              <li key={feature}>
                <Check size={17} />
                {feature}
              </li>
            ))}
          </ul>

          <div className="purchase-box">
            <div>
              <strong>{streamSafe.price}</strong>
              <span>One-time purchase. No subscription.</span>
            </div>

            <button
              className="button primary purchase-button"
              onClick={buyStreamSafe}
              disabled={checkoutStarting}
            >
              {checkoutStarting
                ? "Opening Checkout..."
                : "Buy StreamSafe"}
            </button>
          </div>

          {checkoutError && (
            <div className="checkout-error" role="alert">
              {checkoutError}
            </div>
          )}

          <div className="license-note">
            <InfinityIcon size={18} />
            <div>
              <strong>Buy once. Keep it.</strong>
              <span>
                Your StreamSafe license includes future StreamSafe updates.
              </span>
            </div>
          </div>
        </div>

        <div className="product-preview-column">
          <StreamSafePreview />

          <div className="requirements-card">
            <h3>System requirements</h3>
            <div className="requirement-row">
              <Monitor size={18} />
              <div>
                <strong>Windows 10 or Windows 11</strong>
                <span>64-bit desktop application</span>
              </div>
            </div>
            <div className="requirement-row">
              <Download size={18} />
              <div>
                <strong>Installer download</strong>
                <span>Delivered as a Windows installer / EXE.</span>
              </div>
            </div>
            <div className="requirement-row">
              <ShieldCheck size={18} />
              <div>
                <strong>Lifetime license</strong>
                <span>Activate StreamSafe after purchase.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
