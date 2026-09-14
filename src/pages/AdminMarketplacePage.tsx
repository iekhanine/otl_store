import { Boxes, CircleDollarSign, LoaderCircle, ShieldCheck, Store } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatMoney, getMarketplaceAdmin, setListingStatus, setSellerStatus, type AdminMarketplaceData, type ListingStatus, type SellerStatus } from "../services/marketplaceApi";

export default function AdminMarketplacePage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminMarketplaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try { setData(await getMarketplaceAdmin()); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load administration."); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const salesTotal = useMemo(() => data?.sales.reduce((sum, sale) => sum + sale.subtotal_cents, 0) ?? 0, [data]);

  if (authLoading || (user && loading)) return <main className="store-shell admin-marketplace-page"><div className="prototype-note wide-note"><LoaderCircle className="spin" size={18} /> Loading marketplace admin...</div></main>;
  if (!user) return <main className="store-shell admin-marketplace-page"><div className="seller-signin-card"><ShieldCheck size={28} /><h1>Store Administration</h1><p>Sign in with a OneTime Labs administrator account.</p><NavLink className="button primary" to="/login?return=/admin">Sign in</NavLink></div></main>;
  if (error) return <main className="store-shell admin-marketplace-page"><div className="checkout-error">{error}</div><p className="admin-help">If this is your first admin login, set <code>STORE_ADMIN_EMAILS</code> in Vercel to your account email or add your auth user to <code>store_admins</code>.</p></main>;
  if (!data) return null;

  async function sellerStatus(id: string, status: SellerStatus) { await setSellerStatus(id, status); await load(); }
  async function listingStatus(id: string, status: ListingStatus) { await setListingStatus(id, status); await load(); }

  return <main className="store-shell admin-marketplace-page">
    <div className="seller-page-heading"><div><span className="eyebrow dark">ONETIME LABS</span><h1>Marketplace Admin</h1><p>Approve sellers, review inventory, and see Store activity.</p></div></div>
    <section className="seller-summary-grid"><article><Store size={20} /><div><strong>{data.sellers.length}</strong><span>Sellers</span></div></article><article><Boxes size={20} /><div><strong>{data.listings.length}</strong><span>Listings</span></div></article><article><CircleDollarSign size={20} /><div><strong>{formatMoney(salesTotal)}</strong><span>Recorded sales</span></div></article><article><ShieldCheck size={20} /><div><strong>{data.sellers.filter(s => s.status === "pending").length}</strong><span>Pending approvals</span></div></article></section>

    <section className="admin-panel-section"><div className="seller-section-heading"><div><span className="eyebrow dark">SELLERS</span><h2>Seller approvals</h2></div></div><div className="admin-table">{data.sellers.map(seller => <article key={seller.id}><div><strong>{seller.display_name}</strong><span>{seller.email}</span></div><span className={`seller-status ${seller.status}`}>{seller.status}</span><div className="admin-row-actions">{seller.status !== "approved" && <button className="button primary small" onClick={() => void sellerStatus(seller.id, "approved")}>Approve</button>}{seller.status !== "suspended" && <button className="button secondary small" onClick={() => void sellerStatus(seller.id, "suspended")}>Suspend</button>}{seller.status === "suspended" && <button className="button secondary small" onClick={() => void sellerStatus(seller.id, "pending")}>Restore</button>}</div></article>)}</div></section>

    <section className="admin-panel-section"><div className="seller-section-heading"><div><span className="eyebrow dark">INVENTORY</span><h2>Marketplace listings</h2></div></div><div className="admin-table listings">{data.listings.map(listing => <article key={listing.id}><div><strong>{listing.title}</strong><span>{listing.store_sellers?.display_name || "Seller"} · {formatMoney(listing.price_cents)} · {listing.quantity} available</span></div><span className={`listing-status ${listing.status}`}>{listing.status.replace("_", " ")}</span><div className="admin-row-actions">{listing.status !== "published" && listing.quantity > 0 && <button className="button primary small" onClick={() => void listingStatus(listing.id, "published")}>Publish</button>}{listing.status === "published" && <button className="button secondary small" onClick={() => void listingStatus(listing.id, "draft")}>Unpublish</button>}{listing.status !== "archived" && <button className="text-action" onClick={() => void listingStatus(listing.id, "archived")}>Archive</button>}</div></article>)}</div></section>
  </main>;
}
