import {
  CheckCircle2,
  Copy,
  Download,
  LoaderCircle,
} from "lucide-react";
import {
  NavLink,
  useSearchParams,
} from "react-router-dom";
import {
  useEffect,
  useState,
} from "react";
import {
  getOrder,
  type OrderResult,
} from "../services/storeApi";

export default function PurchaseSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";

  const [order, setOrder] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing Stripe Checkout Session ID.");
      return;
    }

    window.localStorage.setItem(
      "otl_store_last_checkout_session",
      sessionId,
    );

    let cancelled = false;
    let attempts = 0;

    async function load() {
      try {
        const result = await getOrder(sessionId);
        if (cancelled) return;

        if (result.ready) {
          setOrder(result);
          return;
        }

        attempts += 1;
        if (attempts < 12) {
          window.setTimeout(load, 1500);
          return;
        }

        setError("Payment is still processing. Refresh this page in a moment.");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load your order.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function copyKey() {
    if (order?.licenseKey) {
      await navigator.clipboard.writeText(order.licenseKey);
    }
  }

  if (error) {
    return (
      <main className="store-shell narrow-page">
        <div className="success-card">
          <h1>We received your checkout.</h1>
          <p>{error}</p>
          <NavLink to="/streamsafe" className="button secondary full-width">
            Back to StreamSafe
          </NavLink>
        </div>
      </main>
    );
  }

  if (!order?.ready) {
    return (
      <main className="store-shell narrow-page">
        <div className="success-card">
          <LoaderCircle size={48} className="success-icon spin" />
          <h1>Finishing your purchase...</h1>
          <p>Creating your permanent StreamSafe license.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="store-shell narrow-page">
      <div className="success-card">
        <CheckCircle2 size={58} className="success-icon" />
        <h1>StreamSafe is yours.</h1>
        <p>
          Your perpetual license has been created for {order.email}.
        </p>

        <div className="license-key-box">
          <div>
            <span>License key</span>
            <strong>{order.licenseKey}</strong>
          </div>
          <button onClick={copyKey} aria-label="Copy license key">
            <Copy size={17} />
          </button>
        </div>

        <a
          href={order.downloadUrl}
          className="button primary full-width"
        >
          <Download size={17} />
          Download StreamSafe
        </a>

        <div className="success-actions">
          <NavLink to="/account">My Software</NavLink>
          <NavLink to="/support">Installation Guide</NavLink>
        </div>
      </div>
    </main>
  );
}
