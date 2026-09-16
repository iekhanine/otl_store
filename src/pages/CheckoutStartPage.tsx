import {
  LoaderCircle,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Navigate,
  NavLink,
  useParams,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { startProductCheckout } from "../services/storeApi";

/* ==========================================================
   CHECKOUT START 001
   Single entry point for software checkout.

   Every Buy button routes here. If the shopper is not signed
   in, Login returns here and checkout starts automatically.
   ========================================================== */

export default function CheckoutStartPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const productSlug = slug.trim().toLowerCase();
  const productPath =
    productSlug === "streamsafe"
      ? "/streamsafe"
      : `/software/${encodeURIComponent(productSlug)}`;

  useEffect(() => {
    if (authLoading || !user || !productSlug || startedRef.current) return;

    startedRef.current = true;
    setError(null);

    void startProductCheckout(productSlug).catch((checkoutError) => {
      startedRef.current = false;
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
    });
  }, [authLoading, productSlug, user]);

  if (!productSlug) {
    return <Navigate to="/software" replace />;
  }

  if (authLoading) {
    return (
      <main className="store-shell narrow-page">
        <div className="success-card">
          <LoaderCircle size={48} className="success-icon spin" />
          <h1>Preparing checkout...</h1>
          <p>Checking your OneTime Labs account.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    const returnTo = `/checkout/${encodeURIComponent(productSlug)}`;
    return (
      <Navigate
        to={`/login?return=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  if (error) {
    return (
      <main className="store-shell narrow-page">
        <div className="success-card">
          <h1>Checkout could not start.</h1>
          <p>{error}</p>
          <button
            type="button"
            className="button primary full-width"
            onClick={() => {
              startedRef.current = false;
              setError(null);
              void startProductCheckout(productSlug).catch((checkoutError) => {
                setError(
                  checkoutError instanceof Error
                    ? checkoutError.message
                    : "Unable to start checkout.",
                );
              });
            }}
          >
            Try Again
          </button>
          <NavLink to={productPath}>Back to product</NavLink>
        </div>
      </main>
    );
  }

  return (
    <main className="store-shell narrow-page">
      <div className="success-card">
        <LoaderCircle size={48} className="success-icon spin" />
        <h1>Opening secure checkout...</h1>
        <p>You&apos;ll be redirected to Stripe in a moment.</p>
      </div>
    </main>
  );
}
