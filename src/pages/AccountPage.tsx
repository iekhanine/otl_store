import {
  Copy,
  Download,
  FileText,
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  getOrder,
  type OrderResult,
} from "../services/storeApi";
import { streamSafe } from "../data/products";

export default function AccountPage() {
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = window.localStorage.getItem(
      "otl_store_last_checkout_session",
    );

    if (!sessionId) {
      setLoading(false);
      return;
    }

    getOrder(sessionId)
      .then(result => setOrder(result.ready ? result : null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, []);

  async function copyKey() {
    if (order?.licenseKey) {
      await navigator.clipboard.writeText(order.licenseKey);
    }
  }

  return (
    <main className="store-shell account-page">
      <div className="section-heading account-heading">
        <div>
          <span className="eyebrow dark">MY SOFTWARE</span>
          <h1>My Software</h1>
          <p>Your latest purchase on this browser.</p>
        </div>
      </div>

      {loading ? (
        <div className="prototype-note wide-note">
          <LoaderCircle size={18} className="spin" /> Loading purchase...
        </div>
      ) : !order ? (
        <div className="prototype-note wide-note">
          No purchase is saved in this browser yet.
        </div>
      ) : (
        <article className="library-card">
          <div className="library-product">
            <img src={streamSafe.icon} alt="" />
            <div>
              <h2>StreamSafe</h2>
              <span>Perpetual License</span>
            </div>
            <span className="status-pill">Active</span>
          </div>

          <div className="library-details">
            <div>
              <span>License key</span>
              <div className="library-license">
                <code>{order.licenseKey}</code>
                <button onClick={copyKey}>
                  <Copy size={15} />
                </button>
              </div>
            </div>
            <div>
              <span>Version</span>
              <strong>v{streamSafe.version}</strong>
            </div>
            <div>
              <span>Platform</span>
              <strong>{streamSafe.platform}</strong>
            </div>
          </div>

          <div className="library-actions">
            <a className="button primary" href={order.downloadUrl}>
              <Download size={16} />
              Download Latest
            </a>
            <a className="button secondary" href="/support">
              <FileText size={16} />
              Installation Guide
            </a>
          </div>
        </article>
      )}
    </main>
  );
}
