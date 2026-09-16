import {
  Archive,
  Banknote,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Clock3,
  LoaderCircle,
  PackagePlus,
  Plus,
  Store,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Navigate } from "react-router-dom";
import CashSaleDialog from "../components/marketplace/CashSaleDialog";
import ListingEditDialog from "../components/marketplace/ListingEditDialog";
import ListingEditor from "../components/marketplace/ListingEditor";
import { useAuth } from "../context/AuthContext";
import {
  archiveSellerSale,
  formatMoney,
  getSellerApplication,
  getSellerListings,
  getSellerProfile,
  getSellerSales,
  openSellerStripe,
  submitSellerApplication,
  updateListing,
  type MarketplaceListing,
  type SellerApplication,
  type SellerProfile,
  type SellerSale,
} from "../services/marketplaceApi";

/* ==========================================================
   HEADER 001
   SELLER CENTER CACHE

   Seller Center uses session-scoped stale-while-revalidate data.
   Returning to the browser/tab no longer blanks the page and
   shows Loading Seller Center for every auth token refresh.
   ========================================================== */

type SellerCenterCache = {
  savedAt: number;
  seller: SellerProfile | null;
  application: SellerApplication | null;
  listings: MarketplaceListing[];
  sales: SellerSale[];
  archivedSales: SellerSale[];
};

const SELLER_CACHE_TTL_MS = 5 * 60 * 1000;

function cacheKey(userId: string) {
  return `otl-store-seller-center:${userId}`;
}

function readSellerCache(userId: string): SellerCenterCache | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SellerCenterCache;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > SELLER_CACHE_TTL_MS) {
      sessionStorage.removeItem(cacheKey(userId));
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeSellerCache(userId: string, snapshot: Omit<SellerCenterCache, "savedAt">) {
  try {
    sessionStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ ...snapshot, savedAt: Date.now() }),
    );
  } catch {
    // Cache failure should never block Seller Center.
  }
}

/* ==========================================================
   HEADER 002
   SELLER CENTER
   ========================================================== */

export default function SellerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [application, setApplication] = useState<SellerApplication | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [sales, setSales] = useState<SellerSale[]>([]);
  const [archivedSales, setArchivedSales] = useState<SellerSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cashListing, setCashListing] = useState<MarketplaceListing | null>(null);
  const [editListing, setEditListing] = useState<MarketplaceListing | null>(null);
  const [showListingEditor, setShowListingEditor] = useState(false);
  const [showArchives, setShowArchives] = useState(false);
  const [stripeBusy, setStripeBusy] = useState(false);

  /* ========================================================
     HEADER 003
     Load seller account/application with cached first paint
     ======================================================== */

  const load = useCallback(async (foreground = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (foreground) setLoading(true);
    setError(null);

    try {
      const profile = await getSellerProfile();
      setSeller(profile);

      if (profile) {
        setApplication(null);

        if (profile.status !== "suspended") {
          const [sellerListings, sellerSales, sellerArchivedSales] = await Promise.all([
            getSellerListings(),
            getSellerSales(false),
            getSellerSales(true),
          ]);

          setListings(sellerListings);
          setSales(sellerSales);
          setArchivedSales(sellerArchivedSales);
        } else {
          setListings([]);
          setSales([]);
          setArchivedSales([]);
        }

        return;
      }

      const sellerApplication = await getSellerApplication();
      setApplication(sellerApplication);
      setListings([]);
      setSales([]);
      setArchivedSales([]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load Seller Center.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const cached = readSellerCache(userId);

    if (cached) {
      setSeller(cached.seller);
      setApplication(cached.application);
      setListings(cached.listings ?? []);
      setSales(cached.sales ?? []);
      setArchivedSales(cached.archivedSales ?? []);
      setLoading(false);
      void load(false);
      return;
    }

    void load(true);
  }, [userId, load]);

  useEffect(() => {
    if (!userId || loading) return;

    writeSellerCache(userId, {
      seller,
      application,
      listings,
      sales,
      archivedSales,
    });
  }, [userId, loading, seller, application, listings, sales, archivedSales]);

  const activeListings = useMemo(
    () => listings.filter(listing => listing.status !== "archived"),
    [listings],
  );

  const archivedListings = useMemo(
    () => listings.filter(listing => listing.status === "archived"),
    [listings],
  );

  const totalSales = useMemo(
    () => sales.reduce(
      (sum, sale) => sum + sale.subtotal_cents,
      0,
    ),
    [sales],
  );

  const unitsAvailable = useMemo(
    () => activeListings.reduce(
      (sum, listing) => sum + listing.quantity,
      0,
    ),
    [activeListings],
  );

  /* ========================================================
     HEADER 004
     Authentication + onboarding gates
     ======================================================== */

  if (authLoading) {
    return (
      <main className="store-shell seller-page">
        <div className="prototype-note wide-note">
          <LoaderCircle className="spin" size={18} />
          Checking your account...
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?return=/seller" replace />;
  }

  if (loading) {
    return (
      <main className="store-shell seller-page">
        <div className="prototype-note wide-note">
          <LoaderCircle className="spin" size={18} />
          Loading Seller Center...
        </div>
      </main>
    );
  }

  if (error && !seller && !application) {
    return (
      <main className="store-shell seller-page">
        <div className="checkout-error">{error}</div>
      </main>
    );
  }

  if (!seller) {
    if (application) {
      return (
        <SellerApplicationStatus
          application={application}
          onRefresh={() => void load(true)}
        />
      );
    }

    return (
      <SellerApplicationForm
        email={user.email ?? ""}
        onSubmitted={setApplication}
      />
    );
  }

  /* ========================================================
     HEADER 005
     Listing + sale actions
     ======================================================== */

  async function setStatus(
    listing: MarketplaceListing,
    status: "draft" | "published" | "archived",
  ) {
    try {
      setError(null);
      const updated = await updateListing(listing.id, { status });

      setListings(current =>
        current.map(item =>
          item.id === updated.id ? updated : item,
        ),
      );
    } catch (statusError) {
      setError(
        statusError instanceof Error
          ? statusError.message
          : "Unable to update listing.",
      );
    }
  }

  async function archiveSale(sale: SellerSale) {
    try {
      setError(null);
      await archiveSellerSale(sale.id);
      setSales(current => current.filter(item => item.id !== sale.id));
      setArchivedSales(current => [
        { ...sale, archived_at: new Date().toISOString() },
        ...current,
      ]);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive sale.",
      );
    }
  }

  async function handleStripe() {
    if (!seller || seller.uses_platform_stripe) return;

    try {
      setStripeBusy(true);
      setError(null);

      const result = await openSellerStripe(
        seller.stripe_onboarding_complete ? "manage" : "connect",
      );

      if (result.url) {
        window.location.assign(result.url);
        return;
      }

      await load(false);
    } catch (stripeError) {
      setError(
        stripeError instanceof Error
          ? stripeError.message
          : "Unable to connect Stripe.",
      );
    } finally {
      setStripeBusy(false);
    }
  }

  return (
    <main className="store-shell seller-page">
      <div className="seller-page-heading">
        <div>
          <span className="eyebrow dark">SELLER CENTER</span>
          <h1>{seller.display_name}</h1>
          <p>Manage listings, inventory, cash sales, and payouts.</p>
        </div>
        <span className={`seller-status ${seller.status}`}>
          {seller.status}
        </span>
      </div>

      {seller.status === "pending" && (
        <div className="seller-alert pending">
          <strong>Approval pending.</strong>
          <span>
            OneTime Labs is reviewing this seller account before public publishing is enabled.
          </span>
        </div>
      )}

      {seller.status === "suspended" && (
        <div className="seller-alert suspended">
          <strong>Seller account suspended.</strong>
          <span>
            Listings and seller actions are temporarily unavailable.
          </span>
        </div>
      )}

      {error && <div className="checkout-error seller-page-error">{error}</div>}

      <section className="seller-summary-grid">
        <article>
          <Boxes size={20} />
          <div>
            <strong>{activeListings.length}</strong>
            <span>Listings</span>
          </div>
        </article>

        <article>
          <PackagePlus size={20} />
          <div>
            <strong>{unitsAvailable}</strong>
            <span>Units available</span>
          </div>
        </article>

        <article>
          <CircleDollarSign size={20} />
          <div>
            <strong>{formatMoney(totalSales)}</strong>
            <span>Active sales history</span>
          </div>
        </article>

        <article>
          <WalletCards size={20} />
          <div>
            <strong>
              {seller.uses_platform_stripe
                ? "OTL Stripe"
                : seller.stripe_onboarding_complete
                  ? "Connected"
                  : "Not connected"}
            </strong>
            <span>Stripe payouts</span>
          </div>
        </article>
      </section>

      <section className="seller-stripe-card">
        <div>
          <WalletCards size={21} />
          <div>
            <strong>Seller payments</strong>
            <span>
              {seller.uses_platform_stripe
                ? "Payments settle directly to the OneTime Labs Stripe account."
                : seller.stripe_onboarding_complete
                  ? "Stripe seller account connected."
                  : "Connect Stripe to receive marketplace payouts."}
            </span>
          </div>
        </div>
        <button
          className="button secondary"
          disabled={seller.uses_platform_stripe || stripeBusy || seller.status !== "approved"}
          onClick={() => void handleStripe()}
        >
          {seller.uses_platform_stripe
            ? "OneTime Labs Stripe"
            : stripeBusy
              ? "Opening Stripe..."
              : seller.stripe_onboarding_complete
                ? "Manage Stripe"
                : "Connect Stripe"}
        </button>
      </section>

      {/* =====================================================
          HEADER 006
          Compact create-listing launcher directly below payments
          ===================================================== */}

      <section className="seller-create-listing-launcher">
        <div>
          <PackagePlus size={21} />
          <div>
            <strong>List hardware for sale</strong>
            <span>RAM, motherboards, GPUs, CPUs, storage, and other hardware.</span>
          </div>
        </div>
        <button
          type="button"
          className="button primary"
          onClick={() => setShowListingEditor(current => !current)}
          disabled={seller.status === "suspended"}
        >
          {showListingEditor ? <ChevronUp size={16} /> : <Plus size={16} />}
          {showListingEditor ? "Close Form" : "Create a Listing"}
        </button>
      </section>

      {showListingEditor && (
        <ListingEditor
          user={user}
          seller={seller}
          onCancel={() => setShowListingEditor(false)}
          onCreated={listing => {
            setListings(current => [listing, ...current]);
            setShowListingEditor(false);
          }}
        />
      )}

      <section className="seller-section">
        <div className="seller-section-heading">
          <div>
            <span className="eyebrow dark">INVENTORY</span>
            <h2>Your listings</h2>
          </div>
        </div>

        {activeListings.length === 0 ? (
          <div className="marketplace-empty compact">
            <p>No active hardware listings yet.</p>
          </div>
        ) : (
          <div className="seller-listing-table">
            {activeListings.map(listing => (
              <article
                key={listing.id}
                className="seller-listing-row"
              >
                <div className="seller-listing-thumb">
                  {listing.image_urls?.[0]
                    ? <img src={listing.image_urls[0]} alt="" />
                    : <Boxes size={22} />}
                </div>

                <div className="seller-listing-info">
                  <strong>{listing.title}</strong>
                  <span>
                    {listing.subcategory} · {listing.condition} · {listing.quantity} available · {formatMoney(listing.price_cents)}
                  </span>
                </div>

                <span className={`listing-status ${listing.status}`}>
                  {listing.status.replace("_", " ")}
                </span>

                <div className="seller-listing-actions">
                  <button
                    className="button secondary small"
                    onClick={() => setEditListing(listing)}
                  >
                    Edit
                  </button>

                  {listing.cash_sale_allowed && listing.quantity > 0 && (
                    <button
                      className="button cash-button small"
                      onClick={() => setCashListing(listing)}
                    >
                      <Banknote size={15} />
                      Sold - Cash
                    </button>
                  )}

                  {seller.status === "approved" &&
                    listing.status !== "published" &&
                    listing.quantity > 0 && (
                      <button
                        className="button secondary small"
                        onClick={() => void setStatus(listing, "published")}
                      >
                        Publish
                      </button>
                    )}

                  {listing.status === "published" && (
                    <button
                      className="button secondary small"
                      onClick={() => void setStatus(listing, "draft")}
                    >
                      Unpublish
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="seller-section">
        <div className="seller-section-heading">
          <div>
            <span className="eyebrow dark">SALES</span>
            <h2>Recent sales</h2>
          </div>
        </div>

        {sales.length === 0 ? (
          <div className="marketplace-empty compact">
            <p>No active sales history.</p>
          </div>
        ) : (
          <div className="seller-sales-table seller-sales-table-with-actions">
            {sales.map(sale => (
              <article key={sale.id}>
                <div>
                  <strong>
                    {sale.store_listings?.title || "Manual sale"}
                  </strong>
                  <span>
                    {new Date(sale.sold_at).toLocaleString()}
                  </span>
                </div>
                <span className={`sale-channel ${sale.channel}`}>
                  {sale.channel}
                </span>
                <strong>
                  {sale.quantity} × {formatMoney(sale.unit_price_cents)}
                </strong>
                <strong>{formatMoney(sale.subtotal_cents)}</strong>
                <span>
                  {sale.buyer_name ||
                    sale.buyer_contact ||
                    sale.cash_note ||
                    "—"}
                </span>
                <button
                  type="button"
                  className="text-action archive-sale-action"
                  onClick={() => void archiveSale(sale)}
                >
                  <Archive size={13} />
                  Archive
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          HEADER 007
          Seller archives
          ===================================================== */}

      <section className="seller-section seller-archives-section">
        <button
          type="button"
          className="seller-archives-toggle"
          onClick={() => setShowArchives(current => !current)}
        >
          <div>
            <Archive size={18} />
            <div>
              <strong>Archives</strong>
              <span>
                {archivedListings.length} listing{archivedListings.length === 1 ? "" : "s"} · {archivedSales.length} sale{archivedSales.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          {showArchives ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
        </button>

        {showArchives && (
          <div className="seller-archives-body">
            <div className="seller-archive-group">
              <h3>Archived listings</h3>
              {archivedListings.length === 0 ? (
                <p className="seller-archive-empty">No archived listings.</p>
              ) : (
                <div className="seller-listing-table">
                  {archivedListings.map(listing => (
                    <article key={listing.id} className="seller-listing-row archived-row">
                      <div className="seller-listing-thumb">
                        {listing.image_urls?.[0]
                          ? <img src={listing.image_urls[0]} alt="" />
                          : <Boxes size={22} />}
                      </div>
                      <div className="seller-listing-info">
                        <strong>{listing.title}</strong>
                        <span>
                          {listing.subcategory} · {listing.condition} · {formatMoney(listing.price_cents)}
                        </span>
                      </div>
                      <span className="listing-status archived">archived</span>
                      <div className="seller-listing-actions">
                        <button
                          className="button secondary small"
                          onClick={() => setEditListing(listing)}
                        >
                          View / Edit
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="seller-archive-group">
              <h3>Archived sales</h3>
              {archivedSales.length === 0 ? (
                <p className="seller-archive-empty">No archived sales.</p>
              ) : (
                <div className="seller-sales-table">
                  {archivedSales.map(sale => (
                    <article key={sale.id}>
                      <div>
                        <strong>{sale.store_listings?.title || "Manual sale"}</strong>
                        <span>{new Date(sale.sold_at).toLocaleString()}</span>
                      </div>
                      <span className={`sale-channel ${sale.channel}`}>{sale.channel}</span>
                      <strong>{sale.quantity} × {formatMoney(sale.unit_price_cents)}</strong>
                      <strong>{formatMoney(sale.subtotal_cents)}</strong>
                      <span>
                        {sale.buyer_name || sale.buyer_contact || sale.cash_note || "—"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {editListing && (
        <ListingEditDialog
          listing={editListing}
          user={user}
          onClose={() => setEditListing(null)}
          onSaved={saved => {
            setListings(current =>
              current.map(item =>
                item.id === saved.id ? saved : item,
              ),
            );
            setEditListing(null);
          }}
        />
      )}

      {cashListing && (
        <CashSaleDialog
          listing={cashListing}
          onClose={() => setCashListing(null)}
          onRecorded={() => {
            setCashListing(null);
            void load(false);
          }}
        />
      )}
    </main>
  );
}

/* ==========================================================
   HEADER 008
   SELLER APPLICATION FORM
   ========================================================== */

function SellerApplicationForm({
  email,
  onSubmitted,
}: {
  email: string;
  onSubmitted: (application: SellerApplication) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [sellingDescription, setSellingDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const created = await submitSellerApplication({
        displayName,
        slug,
        sellingDescription,
      });

      onSubmitted(created);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit seller application.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="store-shell seller-page">
      <section className="seller-onboarding-card seller-application-card">
        <Store size={30} />
        <span className="eyebrow dark">SELL ON ONETIME LABS</span>
        <h1>Apply for a seller account</h1>
        <p>
          Create your seller company profile here in the Store. OneTime Labs
          reviews applications privately before public selling is enabled.
        </p>

        <div className="seller-identity-note">
          <span>Signed in as</span>
          <strong>{email}</strong>
        </div>

        <form onSubmit={submit}>
          <label>
            Company / store name
            <input
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              placeholder="Your Store Name"
              required
            />
          </label>

          <label>
            Store handle
            <input
              value={slug}
              onChange={event => setSlug(event.target.value)}
              placeholder="your-store-name"
            />
            <small>
              Leave blank and we'll create one from your company name.
            </small>
          </label>

          <label>
            What do you plan to sell?
            <textarea
              value={sellingDescription}
              onChange={event => setSellingDescription(event.target.value)}
              placeholder="Describe the products you plan to sell..."
              rows={5}
              required
            />
          </label>

          {error && (
            <div className="checkout-error">{error}</div>
          )}

          <button
            type="submit"
            className="button primary"
            disabled={busy}
          >
            {busy ? "Submitting..." : "Submit Seller Application"}
          </button>
        </form>

        <div className="seller-platform-note">
          After submission, your company and account become visible to
          OneTime Labs in private Platform with the organization role
          <strong> Company Owner</strong>. You are not sent to Platform and
          you do not receive Platform administrator access.
        </div>
      </section>
    </main>
  );
}

/* ==========================================================
   HEADER 009
   APPLICATION STATUS
   ========================================================== */

function SellerApplicationStatus({
  application,
  onRefresh,
}: {
  application: SellerApplication;
  onRefresh: () => void;
}) {
  const approved = application.status === "approved";
  const rejected = application.status === "rejected";

  return (
    <main className="store-shell seller-page">
      <section className="seller-onboarding-card seller-application-card seller-application-status-card">
        {approved ? (
          <CheckCircle2 size={32} />
        ) : (
          <Clock3 size={32} />
        )}

        <span className="eyebrow dark">SELLER CENTER</span>
        <h1>
          {approved
            ? "Seller account approved"
            : rejected
              ? "Seller application reviewed"
              : "Application received"}
        </h1>

        <div className={`seller-application-state ${application.status}`}>
          {application.status}
        </div>

        <div className="seller-application-summary">
          <div>
            <span>Company</span>
            <strong>{application.display_name}</strong>
          </div>
          <div>
            <span>Store handle</span>
            <strong>{application.slug}</strong>
          </div>
          <div>
            <span>Submitted</span>
            <strong>
              {new Date(application.submitted_at).toLocaleDateString()}
            </strong>
          </div>
        </div>

        {application.status === "pending" && (
          <p>
            OneTime Labs is reviewing your application. Your account is
            already registered internally as the Company Owner for this
            organization. Seller tools unlock after approval.
          </p>
        )}

        {approved && (
          <p>
            Your seller account has been approved. Refresh Seller Center to
            load your inventory and sales tools.
          </p>
        )}

        {rejected && (
          <p>
            This application was not approved.
            {application.review_note
              ? ` ${application.review_note}`
              : " Contact OneTime Labs if you need more information."}
          </p>
        )}

        <button
          type="button"
          className="button secondary"
          onClick={onRefresh}
        >
          Refresh Seller Center
        </button>
      </section>
    </main>
  );
}
