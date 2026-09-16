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
  useRef,
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
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStarting, setDownloadStarting] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const autoDownloadStarted = useRef(false);

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

  useEffect(() => {
    if (
      !order?.ready ||
      !order.licenseKey ||
      !order.downloadUrl ||
      autoDownloadStarted.current
    ) {
      return;
    }

    // The success page has rendered the license key at this point. Start the
    // protected one-time download immediately, but keep the manual button on
    // screen in case the browser blocks or interrupts the automatic download.
    autoDownloadStarted.current = true;
    void download();
  }, [order]);

  async function copyKey() {
    if (order?.licenseKey) {
      await navigator.clipboard.writeText(order.licenseKey);
    }
  }

  async function download() {
    if (!order?.downloadUrl || downloadStarting) return;

    try {
      setDownloadError(null);
      setDownloadStarting(true);
      await downloadSoftware(order.downloadUrl);
      setDownloadStarted(true);
    } catch (downloadErrorValue) {
      setDownloadError(
        downloadErrorValue instanceof Error
          ? downloadErrorValue.message
          : "Unable to download StreamSafe.",
      );
    } finally {
      setDownloadStarting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="store-shell narrow-page">
        <div className="success-card">
          <LoaderCircle size={48} className="success-icon spin" />
          <h1>Loading your account...</h1>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to={`/login?return=${encodeURIComponent(`/purchase-success?session_id=${sessionId}`)}`}
        replace
      />
    );
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
        <h1>
          {order.environment === "test"
            ? "Test checkout complete."
            : "StreamSafe is yours."}
        </h1>
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
          disabled={downloadStarting}
        >
          {downloadStarting ? (
            <LoaderCircle size={17} className="spin" />
          ) : (
            <Download size={17} />
          )}
          DOWNLOAD NOW
        </button>

        <div className="prototype-note">
          {downloadError
            ? `Automatic download could not start: ${downloadError} Click DOWNLOAD NOW to try again.`
            : downloadStarted
              ? "Your download has started. If it does not appear, click DOWNLOAD NOW."
              : "Your download will start automatically. If your browser blocks it, click DOWNLOAD NOW."}
        </div>

        <div className="success-actions">
          <NavLink to="/account">My Software</NavLink>
          <NavLink to="/support">Installation Guide</NavLink>
        </div>
      </div>
    </main>
  );
}
