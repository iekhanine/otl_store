import { Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import ListingImageManager from "./ListingImageManager";
import {
  updateListing,
  uploadListingImages,
  type MarketplaceListing,
} from "../../services/marketplaceApi";
import {
  disposeListingImage,
  type ListingImageItem,
} from "../../lib/listingImages";

type Props = {
  listing: MarketplaceListing;
  user: User;
  onClose: () => void;
  onSaved: (listing: MarketplaceListing) => void;
};

const HARDWARE_TYPES = [
  "RAM",
  "Motherboard",
  "GPU",
  "CPU",
  "Storage",
  "Power Supply",
  "Case",
  "Cooling",
  "Networking",
  "Other",
] as const;

/* ==========================================================
   HEADER 001
   EDIT LISTING DIALOG
   ========================================================== */

export default function ListingEditDialog({
  listing,
  user,
  onClose,
  onSaved,
}: Props) {
  const [subcategory, setSubcategory] = useState(listing.subcategory || "Other");
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [condition, setCondition] = useState(listing.condition);
  const [brand, setBrand] = useState(listing.brand ?? "");
  const [model, setModel] = useState(listing.model ?? "");
  const [sku, setSku] = useState(listing.sku ?? "");
  const [price, setPrice] = useState((listing.price_cents / 100).toFixed(2));
  const [shippingPrice, setShippingPrice] = useState((listing.shipping_price_cents / 100).toFixed(2));
  const [quantity, setQuantity] = useState(String(listing.quantity));
  const [shippingAvailable, setShippingAvailable] = useState(listing.shipping_available);
  const [pickupAvailable, setPickupAvailable] = useState(listing.local_pickup_available);
  const [cashSaleAllowed, setCashSaleAllowed] = useState(listing.cash_sale_allowed);
  const [images, setImages] = useState<ListingImageItem[]>(() =>
    listing.image_urls.map((url, index) => ({
      id: `existing-${index}-${url}`,
      name: `Product photo ${index + 1}`,
      previewUrl: url,
      existingUrl: url,
    })),
  );
  const imagesRef = useRef<ListingImageItem[]>([]);
  imagesRef.current = images;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach(disposeListingImage);
    };
  }, []);

  /* ========================================================
     HEADER 002
     Save changes + image order
     ======================================================== */

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const pendingFiles = images
        .filter(image => image.file)
        .map(image => image.file as File);
      const uploadedUrls = pendingFiles.length
        ? await uploadListingImages(pendingFiles, user.id)
        : [];

      let uploadedIndex = 0;
      const imageUrls = images.map(image => {
        if (image.file) {
          const url = uploadedUrls[uploadedIndex];
          uploadedIndex += 1;
          return url;
        }
        return image.existingUrl || image.previewUrl;
      });

      const saved = await updateListing(listing.id, {
        subcategory,
        title,
        description,
        condition,
        brand,
        model,
        sku,
        priceCents: Math.round(Number(price) * 100),
        shippingPriceCents: Math.round(Number(shippingPrice || 0) * 100),
        quantity: Number(quantity),
        imageUrls,
        shippingAvailable,
        localPickupAvailable: pickupAvailable,
        cashSaleAllowed,
      });

      onSaved(saved);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save listing.",
      );
    } finally {
      setBusy(false);
    }
  }

  /* ========================================================
     HEADER 003
     DELETE = ARCHIVE
     ======================================================== */

  async function archiveListing() {
    const confirmed = window.confirm(
      "Delete this listing from the seller storefront? It will be archived for OneTime Labs audit history and will no longer be public.",
    );

    if (!confirmed) return;

    setBusy(true);
    setError(null);

    try {
      const archived = await updateListing(listing.id, {
        status: "archived",
      });
      onSaved(archived);
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive listing.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="marketplace-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Edit listing"
    >
      <form className="marketplace-modal listing-edit-modal" onSubmit={submit}>
        <button
          className="marketplace-modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <span className="eyebrow dark">EDIT LISTING</span>
        <h2>{listing.title}</h2>

        <div className="seller-form-grid">
          <label>
            Hardware type
            <select value={subcategory} onChange={e => setSubcategory(e.target.value)}>
              {HARDWARE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>Condition<select value={condition} onChange={e => setCondition(e.target.value)}><option>New</option><option>Open Box</option><option>Used - Tested</option><option>Used - Untested</option><option>For Parts</option></select></label>
          <label className="span-2">Title<input value={title} onChange={e => setTitle(e.target.value)} required /></label>
          <label>Brand<input value={brand} onChange={e => setBrand(e.target.value)} /></label>
          <label>Model / Part #<input value={model} onChange={e => setModel(e.target.value)} /></label>
          <label>Quantity<input type="number" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} required /></label>
          <label>Price<input type="number" min="0.01" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required /></label>
          <label>Shipping price<input type="number" min="0" step="0.01" value={shippingPrice} onChange={e => setShippingPrice(e.target.value)} /></label>
          <label>SKU / Internal note<input value={sku} onChange={e => setSku(e.target.value)} /></label>
          <label className="span-2">Description<textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} /></label>
        </div>

        {/* ===================================================
            HEADER 004
            Existing + new product photos
            =================================================== */}

        <ListingImageManager
          images={images}
          onChange={setImages}
          disabled={busy}
        />

        <div className="seller-check-grid edit-checks">
          <label><input type="checkbox" checked={shippingAvailable} onChange={e => setShippingAvailable(e.target.checked)} /> Shipping</label>
          <label><input type="checkbox" checked={pickupAvailable} onChange={e => setPickupAvailable(e.target.checked)} /> Local pickup</label>
          <label><input type="checkbox" checked={cashSaleAllowed} onChange={e => setCashSaleAllowed(e.target.checked)} /> Sold - Cash</label>
        </div>

        {error && <div className="checkout-error">{error}</div>}

        <div className="marketplace-modal-actions listing-edit-actions">
          <button
            type="button"
            className="button danger listing-delete-button"
            onClick={() => void archiveListing()}
            disabled={busy || listing.status === "archived"}
          >
            <Trash2 size={15} />
            {listing.status === "archived" ? "Archived" : "Delete Listing"}
          </button>
          <div className="listing-edit-actions-right">
            <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="button primary" disabled={busy}>
              <Save size={15} /> {busy ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
