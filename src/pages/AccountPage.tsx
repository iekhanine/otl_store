import { Copy, Download, FileText, LoaderCircle, LogIn, Store } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { downloadSoftware, getMySoftware, type SoftwareEntitlement } from "../services/storeApi";
import { streamSafe } from "../data/products";

export default function AccountPage() {
  const { user, loading: authLoading } = useAuth();
  const [software, setSoftware] = useState<SoftwareEntitlement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    getMySoftware()
      .then(setSoftware)
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : "Unable to load software."))
      .finally(() => setLoading(false));
  }, [user]);

  async function copyKey(key: string) { await navigator.clipboard.writeText(key); }

  async function download(item: SoftwareEntitlement) {
    try { setError(null); await downloadSoftware(item.downloadUrl); }
    catch (downloadError) { setError(downloadError instanceof Error ? downloadError.message : "Unable to download software."); }
  }

  if (authLoading) return <main className="store-shell account-page"><div className="prototype-note wide-note"><LoaderCircle size={18} className="spin" /> Loading account...</div></main>;

  if (!user) return <main className="store-shell account-page"><div className="section-heading account-heading"><div><span className="eyebrow dark">STORE ACCOUNT</span><h1>Your account</h1><p>Sign in to access purchases, seller tools, licenses, and private downloads.</p></div></div><div className="prototype-note wide-note account-signin-note"><LogIn size={18} /><span>Your Store activity is attached to your OneTime Labs account.</span><NavLink className="button primary" to="/login?return=/account">Sign in</NavLink></div></main>;

  return <main className="store-shell account-page">
    <div className="section-heading account-heading"><div><span className="eyebrow dark">STORE ACCOUNT</span><h1>Your account</h1><p>{user.email}</p></div></div>

    <section className="account-shortcuts"><NavLink to="/seller"><Store size={20} /><div><strong>Seller Center</strong><span>Create listings, track inventory, and record cash sales.</span></div></NavLink></section>

    <div className="section-heading account-subheading"><div><span className="eyebrow dark">SOFTWARE</span><h2>My Software</h2></div></div>
    {loading ? <div className="prototype-note wide-note"><LoaderCircle size={18} className="spin" /> Loading software...</div> : error ? <div className="checkout-error">{error}</div> : software.length === 0 ? <div className="prototype-note wide-note">No software purchases are attached to this account yet.</div> : software.map(item => <article className="library-card" key={item.orderId}><div className="library-product"><img src={streamSafe.icon} alt="" /><div><h2>{item.productName}</h2><span>Lifetime License</span></div><span className="status-pill">{item.status}</span></div><div className="library-details"><div><span>License key</span><div className="library-license"><code>{item.licenseKey}</code><button onClick={() => void copyKey(item.licenseKey)}><Copy size={15} /></button></div></div><div><span>Version</span><strong>v{item.version}</strong></div><div><span>Platform</span><strong>Windows</strong></div></div><div className="library-actions"><button className="button primary" type="button" onClick={() => void download(item)}><Download size={16} /> Download Latest</button><a className="button secondary" href="/support"><FileText size={16} /> Installation Guide</a></div></article>)}
  </main>;
}
