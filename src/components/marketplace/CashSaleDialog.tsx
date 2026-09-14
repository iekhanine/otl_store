import { Banknote, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { formatMoney, recordCashSale, type MarketplaceListing } from "../../services/marketplaceApi";

type Props = {
  listing: MarketplaceListing;
  onClose: () => void;
  onRecorded: () => void;
};

export default function CashSaleDialog({ listing, onClose, onRecorded }: Props) {
  const [quantity, setQuantity] = useState("1");
  const [amount, setAmount] = useState((listing.price_cents / 100).toFixed(2));
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await recordCashSale({
        listingId: listing.id,
        quantity: Number(quantity),
        unitPriceCents: Math.round(Number(amount) * 100),
        buyerName,
        buyerContact,
        note,
      });
      onRecorded();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to record cash sale.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="marketplace-modal-backdrop" role="dialog" aria-modal="true" aria-label="Record cash sale">
      <form className="marketplace-modal" onSubmit={submit}>
        <button className="marketplace-modal-close" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <div className="cash-sale-icon"><Banknote size={24} /></div>
        <span className="eyebrow dark">IN-PERSON SALE</span>
        <h2>Sold - Cash</h2>
        <p>Record the sale and remove the sold quantity from Store inventory. Stripe is not involved.</p>

        <div className="cash-sale-product"><strong>{listing.title}</strong><span>{listing.quantity} currently available · {formatMoney(listing.price_cents)}</span></div>

        <div className="seller-form-grid cash-sale-grid">
          <label>Quantity<input type="number" min="1" max={listing.quantity} value={quantity} onChange={e => setQuantity(e.target.value)} required /></label>
          <label>Cash price each<input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required /></label>
          <label>Buyer name <small>optional</small><input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Optional" /></label>
          <label>Buyer contact <small>optional</small><input value={buyerContact} onChange={e => setBuyerContact(e.target.value)} placeholder="Phone, email, Marketplace name..." /></label>
          <label className="span-2">Sale note <small>optional</small><textarea rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Facebook Marketplace pickup, repeat customer, negotiated price..." /></label>
        </div>

        {error && <div className="checkout-error">{error}</div>}
        <div className="marketplace-modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button cash-button" disabled={busy}>{busy ? "Recording..." : "Record Cash Sale"}</button></div>
      </form>
    </div>
  );
}
