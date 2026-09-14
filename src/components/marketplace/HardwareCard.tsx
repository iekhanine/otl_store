import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Package,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  formatMoney,
  type MarketplaceListing,
} from "../../services/marketplaceApi";

type Props = { product: MarketplaceListing };

/* ==========================================================
   HEADER 001
   HARDWARE STOREFRONT CARD

   The card's 4:3 image block is intentionally unchanged in
   size. Multiple seller photos rotate inside that same block.
   ========================================================== */

export default function HardwareCard({ product }: Props) {
  const seller = product.store_sellers?.display_name || "Approved seller";
  const images = product.image_urls ?? [];
  const [imageIndex, setImageIndex] = useState(0);
  const hasGallery = images.length > 1;

  function previousImage() {
    setImageIndex(current => (current - 1 + images.length) % images.length);
  }

  function nextImage() {
    setImageIndex(current => (current + 1) % images.length);
  }

  return (
    <article className="hardware-card">
      <div className="hardware-card-image-shell">
        <NavLink to={`/hardware/${product.slug}`} className="hardware-card-image">
          {images[imageIndex] ? (
            <img src={images[imageIndex]} alt={product.title} />
          ) : (
            <div className="hardware-placeholder">
              <Package size={34} />
              <span>No photo yet</span>
            </div>
          )}
        </NavLink>

        {hasGallery && (
          <>
            <button
              type="button"
              className="hardware-card-gallery-button previous"
              onClick={previousImage}
              aria-label="Previous product photo"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="hardware-card-gallery-button next"
              onClick={nextImage}
              aria-label="Next product photo"
            >
              <ChevronRight size={16} />
            </button>

            <div className="hardware-card-gallery-dots" aria-label={`${images.length} product photos`}>
              {images.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  className={index === imageIndex ? "active" : ""}
                  onClick={() => setImageIndex(index)}
                  aria-label={`Show product photo ${index + 1}`}
                  aria-current={index === imageIndex ? "true" : undefined}
                />
              ))}
            </div>

            <span className="hardware-card-photo-count">
              {imageIndex + 1}/{images.length}
            </span>
          </>
        )}
      </div>

      <div className="hardware-card-body">
        <div className="hardware-card-meta">
          <span>{product.condition}</span>
          <span>{seller}</span>
        </div>
        <NavLink to={`/hardware/${product.slug}`}>
          <h3>{product.title}</h3>
        </NavLink>
        <div className="hardware-card-price">
          {formatMoney(product.price_cents, product.currency)}
        </div>
        <div className="hardware-card-fulfillment">
          {product.shipping_available && <span><Truck size={14} /> Ships</span>}
          {product.local_pickup_available && <span><MapPin size={14} /> Pickup</span>}
        </div>
        <div className="hardware-card-stock">{product.quantity} available</div>
      </div>
    </article>
  );
}
