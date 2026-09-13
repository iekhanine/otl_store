import {
  Check,
  CreditCard,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { streamSafe } from "../data/products";

export default function CheckoutDemoPage() {
  const navigate = useNavigate();

  return (
    <main className="store-shell narrow-page">
      <div className="checkout-demo">
        <div className="checkout-demo-header">
          <div>
            <span className="eyebrow dark">CHECKOUT PROTOTYPE</span>
            <h1>Complete your purchase</h1>
          </div>
          <span className="secure-label">
            <Lock size={14} />
            Stripe will live here
          </span>
        </div>

        <div className="checkout-order-card">
          <img src={streamSafe.icon} alt="" />
          <div>
            <strong>StreamSafe</strong>
            <span>Lifetime License</span>
          </div>
          <strong>{streamSafe.price}</strong>
        </div>

        <div className="checkout-benefits">
          <span><Check size={15} /> One-time payment</span>
          <span><Check size={15} /> Lifetime license</span>
          <span><Check size={15} /> Future updates included</span>
          <span><Check size={15} /> Download after purchase</span>
        </div>

        <div className="stripe-placeholder">
          <CreditCard size={24} />
          <strong>Stripe Checkout</strong>
          <span>
            Set VITE_STREAMSAFE_STRIPE_URL to your Stripe Payment Link
            and the real Buy button will go directly to Stripe.
          </span>
        </div>

        <button
          className="button primary full-width"
          onClick={() => navigate("/purchase-success")}
        >
          Simulate Successful Purchase
        </button>
      </div>
    </main>
  );
}
