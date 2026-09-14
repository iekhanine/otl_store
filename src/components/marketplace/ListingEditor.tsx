import { LoaderCircle, Save, X } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { User } from "@supabase/supabase-js";
import ListingImageManager from "./ListingImageManager";
import {
  createListing,
  formatMoney,
  uploadListingImages,
  type MarketplaceListing,
  type SellerProfile,
} from "../../services/marketplaceApi";
import {
  disposeListingImage,
  type ListingImageItem,
} from "../../lib/listingImages";

type Props = {
  user: User;
  seller: SellerProfile;
  onCreated: (listing: MarketplaceListing) => void;
  onCancel?: () => void;
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

const EMPTY = {
  subcategory: "RAM",
  title: "",
  brand: "",
  model: "",
  sku: "",
  condition: "Used - Tested",
  price: "",
  shippingPrice: "",
  quantity: "1",
  description: "",
  capacity: "",
  memoryType: "DDR4",
  speed: "",
  formFactor: "DIMM",
  kit: "",
  ecc: "No",
};

/* ==========================================================
   HEADER 001
   NEW HARDWARE LISTING EDITOR
   ========================================================== */

export default function ListingEditor({
  user,
  seller,
  onCreated,
  onCancel,
}: Props) {
  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState<ListingImageItem[]>([]);
  const imagesRef = useRef<ListingImageItem[]>([]);
  imagesRef.current = images;
  const [shippingAvailable, setShippingAvailable] = useState(true);
  const [pickupAvailable, setPickupAvailable] = useState(true);
  const [cashSaleAllowed, setCashSaleAllowed] = useState(true);
  const [publishNow, setPublishNow] = useState(seller.status === "approved");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewTotal = useMemo(() => {
    const price = Number(form.price || 0);
    return Number.isFinite(price)
      ? formatMoney(Math.round(price * 100))
      : "$0.00";
  }, [form.price]);

  const isRam = form.subcategory === "RAM";

  useEffect(() => {
    return () => {
      imagesRef.current.forEach(disposeListingImage);
    };
  }, []);

  function field(name: keyof typeof EMPTY, value: string) {
    setForm(current => ({ ...current, [name]: value }));
  }

  /* ========================================================
     HEADER 002
     Create listing + preserve image order
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

      const listing = await createListing({
        title: form.title,
        description: form.description,
        condition: form.condition,
        brand: form.brand,
        model: form.model,
        sku: form.sku,
        priceCents: Math.round(Number(form.price) * 100),
        shippingPriceCents: Math.round(Number(form.shippingPrice || 0) * 100),
        quantity: Number(form.quantity),
        status:
          publishNow && seller.status === "approved"
            ? "published"
            : "draft",
        imageUrls,
        category: "hardware",
        subcategory: form.subcategory,
        specs: isRam
          ? {
              capacity: form.capacity,
              memoryType: form.memoryType,
              speed: form.speed,
              formFactor: form.formFactor,
              kit: form.kit,
              ecc: form.ecc,
            }
          : {},
        shippingAvailable,
        localPickupAvailable: pickupAvailable,
        cashSaleAllowed,
      });

      onCreated(listing);
      images.forEach(disposeListingImage);
      setForm(EMPTY);
      setImages([]);
      setPublishNow(seller.status === "approved");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create listing.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="seller-listing-form" onSubmit={submit}>
      <div className="seller-form-heading">
        <div>
          <span className="eyebrow dark">NEW HARDWARE LISTING</span>
          <h2>List hardware for sale</h2>
        </div>
        <div className="seller-form-heading-actions">
          <strong>{previewTotal}</strong>
          {onCancel && (
            <button
              type="button"
              className="seller-form-close"
              onClick={onCancel}
              aria-label="Close listing form"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      <div className="seller-form-grid">
        <label>
          Hardware type
          <select
            value={form.subcategory}
            onChange={e => field("subcategory", e.target.value)}
          >
            {HARDWARE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          Condition
          <select
            value={form.condition}
            onChange={e => field("condition", e.target.value)}
          >
            <option>New</option>
            <option>Open Box</option>
            <option>Used - Tested</option>
            <option>Used - Untested</option>
            <option>For Parts</option>
          </select>
        </label>

        <label className="span-2">
          Listing title
          <input
            value={form.title}
            onChange={e => field("title", e.target.value)}
            placeholder={
              isRam
                ? "32GB Corsair Vengeance DDR4-3200 Kit"
                : `${form.subcategory} model / description`
            }
            required
          />
        </label>

        <label>
          Brand
          <input
            value={form.brand}
            onChange={e => field("brand", e.target.value)}
            placeholder="Manufacturer"
          />
        </label>

        <label>
          Model / Part #
          <input
            value={form.model}
            onChange={e => field("model", e.target.value)}
            placeholder="Part or model number"
          />
        </label>

        <label>
          Quantity
          <input
            type="number"
            min="1"
            value={form.quantity}
            onChange={e => field("quantity", e.target.value)}
            required
          />
        </label>

        <label>
          Price
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={form.price}
            onChange={e => field("price", e.target.value)}
            placeholder="45.00"
            required
          />
        </label>

        <label>
          Shipping price
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.shippingPrice}
            onChange={e => field("shippingPrice", e.target.value)}
            placeholder="0.00"
          />
        </label>

        <label>
          SKU / Internal note
          <input
            value={form.sku}
            onChange={e => field("sku", e.target.value)}
            placeholder="Optional"
          />
        </label>

        {isRam && (
          <>
            <label>
              Capacity
              <input
                value={form.capacity}
                onChange={e => field("capacity", e.target.value)}
                placeholder="32GB"
              />
            </label>
            <label>
              Memory type
              <select
                value={form.memoryType}
                onChange={e => field("memoryType", e.target.value)}
              >
                <option>DDR5</option>
                <option>DDR4</option>
                <option>DDR3</option>
                <option>DDR2</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Speed
              <input
                value={form.speed}
                onChange={e => field("speed", e.target.value)}
                placeholder="3200 MT/s"
              />
            </label>
            <label>
              Form factor
              <select
                value={form.formFactor}
                onChange={e => field("formFactor", e.target.value)}
              >
                <option>DIMM</option>
                <option>SODIMM</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Kit configuration
              <input
                value={form.kit}
                onChange={e => field("kit", e.target.value)}
                placeholder="2 x 16GB"
              />
            </label>
            <label>
              ECC
              <select
                value={form.ecc}
                onChange={e => field("ecc", e.target.value)}
              >
                <option>No</option>
                <option>Yes</option>
                <option>Unknown</option>
              </select>
            </label>
          </>
        )}

        <label className="span-2">
          Description
          <textarea
            rows={5}
            value={form.description}
            onChange={e => field("description", e.target.value)}
            placeholder="What was tested, cosmetic condition, compatibility notes, what's included..."
          />
        </label>
      </div>

      {/* =====================================================
          HEADER 003
          Product photo upload / sorting
          ===================================================== */}

      <ListingImageManager
        images={images}
        onChange={setImages}
        disabled={busy}
      />

      <div className="seller-check-grid">
        <label><input type="checkbox" checked={shippingAvailable} onChange={e => setShippingAvailable(e.target.checked)} /> Shipping available</label>
        <label><input type="checkbox" checked={pickupAvailable} onChange={e => setPickupAvailable(e.target.checked)} /> Local pickup available</label>
        <label><input type="checkbox" checked={cashSaleAllowed} onChange={e => setCashSaleAllowed(e.target.checked)} /> Allow Sold - Cash</label>
        <label><input type="checkbox" checked={publishNow} disabled={seller.status !== "approved"} onChange={e => setPublishNow(e.target.checked)} /> Publish immediately</label>
      </div>

      {seller.status !== "approved" && (
        <div className="seller-inline-note">
          You can build listings now. Publishing unlocks after OneTime Labs approves the seller account.
        </div>
      )}
      {error && <div className="checkout-error">{error}</div>}

      <div className="seller-form-actions">
        {onCancel && (
          <button
            className="button secondary"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        )}
        <button className="button primary" disabled={busy} type="submit">
          {busy ? (
            <><LoaderCircle size={16} className="spin" /> Saving...</>
          ) : (
            <><Save size={16} /> {publishNow ? "Create Listing" : "Save Draft"}</>
          )}
        </button>
      </div>
    </form>
  );
}
