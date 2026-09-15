import {
  CheckCircle2,
  Copy,
  Download,
  LoaderCircle,
} from "lucide-react";
import {
  NavLink,
  useSearchParams,
  Navigate,
} from "react-router-dom";
import {
  useEffect,
  useState,
} from "react";
import {
  downloadSoftware,
  getOrder,
  type OrderResult,
} from "../services/storeApi";
import { useAuth } from "../context/AuthContext";

export default function PurchaseSuccessPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";

  const [order, setOrder] = useState<OrderResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
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
  }, [sessionId, user]);

  async function copyKey() {
    if (order?.licenseKey) {
      await navigator.clipboard.writeText(order.licenseKey);
    }
  }

  async function download() {
    if (!order?.downloadUrl) return;
    try {
      setError(null);
      await downloadSoftware(order.downloadUrl);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download StreamSafe.");
    }
  }


  if (authLoading) {
    return <main className="store-shell narrow-page"><div className="success-card"><LoaderCircle size={48} className="success-icon spin" /><h1>Loading your account...</h1></div></main>;
  }

  if (!user) {
    return <Navigate to={`/login?return=${encodeURIComponent(`/purchase-success?session_id=${sessionId}`)}`} replace />;
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
        <h1>{order.environment === "test" ? "Test checkout complete." : "StreamSafe is yours."}</h1>
        <p>
          {order.environment === "test"
            ? `No money moved. A non-production test license was created for ${order.email}.`
            : `Your perpetual license has been created for ${order.email}.`}
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

        <button
          type="button"
          onClick={() => void download()}
          className="button primary full-width"
        >
          <Download size={17} />
          {order.environment === "test" ? "Download StreamSafe (Test)" : "Download StreamSafe"}
        </button>

        <div className="success-actions">
          <NavLink to="/account">My Software</NavLink>
          <NavLink to="/support">Installation Guide</NavLink>
        </div>
      </div>
    </main>
  );
}
