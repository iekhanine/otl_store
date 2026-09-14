import { ArrowLeft, MapPin, PackageCheck, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { formatMoney, getMarketplaceListing, type MarketplaceListing } from "../services/marketplaceApi";

export default function HardwareProductPage() {
  const { slug = "" } = useParams();
  const [product, setProduct] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    getMarketplaceListing(slug)
      .then(setProduct)
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : "Unable to load product."))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <main className="store-shell marketplace-page"><div className="prototype-note wide-note">Loading product...</div></main>;
  if (error || !product) return <main className="store-shell marketplace-page"><div className="checkout-error">{error || "Product not found."}</div></main>;

  const seller = product.store_sellers?.display_name || "Approved seller";
  const specs = Object.entries(product.specs ?? {}).filter(([, value]) => value !== null && value !== "" && value !== false);

  return (
    <main className="store-shell hardware-product-page">
      <NavLink to="/hardware" className="back-link"><ArrowLeft size={15} /> Back to Hardware</NavLink>
      <section className="hardware-product-grid">
        <div className="hardware-product-gallery">
          <div className="hardware-product-main-image">
            {product.image_urls?.[selectedImage] ? <img src={product.image_urls[selectedImage]} alt={product.title} /> : <div className="hardware-placeholder large"><PackageCheck size={48} /><span>Seller photo coming soon</span></div>}
          </div>
          {product.image_urls.length > 1 && <div className="hardware-thumbnails">{product.image_urls.map((url, index) => <button key={url} className={index === selectedImage ? "active" : ""} onClick={() => setSelectedImage(index)}><img src={url} alt="" /></button>)}</div>}
        </div>

        <div className="hardware-product-copy">
          <div className="hardware-product-badges"><span>{product.condition}</span><span>{product.subcategory}</span></div>
          <h1>{product.title}</h1>
          <div className="hardware-product-seller"><ShieldCheck size={16} /> Sold by <strong>{seller}</strong></div>
          <div className="hardware-product-price">{formatMoney(product.price_cents, product.currency)}</div>
          {product.shipping_available && <div className="hardware-product-shipping"><Truck size={17} /><span>{product.shipping_price_cents > 0 ? `${formatMoney(product.shipping_price_cents)} shipping` : "Free shipping"}</span></div>}
          {product.local_pickup_available && <div className="hardware-product-shipping"><MapPin size={17} /><span>Local pickup available</span></div>}
          <div className="hardware-product-stock">{product.quantity} in stock</div>

          <button className="button primary hardware-buy-button" disabled><ShoppingCart size={17} /> Online checkout being connected</button>
          <p className="hardware-checkout-note">Stripe seller payments are the next Store step. Published inventory is live; online hardware checkout is intentionally disabled until seller payouts are connected.</p>

          {product.description && <div className="hardware-description"><h2>Seller description</h2><p>{product.description}</p></div>}
          {specs.length > 0 && <div className="hardware-specs"><h2>Hardware details</h2>{specs.map(([key, value]) => <div key={key}><span>{key.replace(/([A-Z])/g, " $1")}</span><strong>{String(value)}</strong></div>)}</div>}
        </div>
      </section>
    </main>
  );
}
