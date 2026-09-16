import {
  ArrowRight,
  Download,
  Infinity as InfinityIcon,
  Monitor,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  softwareProductPath,
  softwareTypeLabels,
  type StoreProduct,
} from "../data/products";

type Props = {
  product: StoreProduct;
};

export default function ProductCard({
  product,
}: Props) {
  return (
    <article className="product-card">
      <div className="product-card-main">
        <div className="product-icon-wrap">
          <img src={product.icon} alt="" />
        </div>

        <div className="product-copy">
          <div className="product-title-row">
            <div>
              <h3>{product.name}</h3>
              <p className="product-tagline">{product.tagline}</p>
            </div>

            <div className="product-price-block">
              <strong>{product.price}</strong>
              <span>One-time purchase</span>
            </div>
          </div>

          <p className="product-description">
            {product.description}
          </p>

          <div className="product-actions">
            <NavLink
              to={softwareProductPath(product)}
              className="button secondary"
            >
              View Product
              <ArrowRight size={16} />
            </NavLink>

            <NavLink
              to={`/checkout/${encodeURIComponent(product.slug)}`}
              className="button primary"
            >
              Buy Now
            </NavLink>
          </div>
        </div>
      </div>

      <div className="product-card-features">
        <span><Monitor size={15} /> {softwareTypeLabels[product.softwareType]}</span>
        <span><ShieldCheck size={15} /> Lifetime license</span>
        <span><Download size={15} /> Direct download</span>
        <span><InfinityIcon size={15} /> Future updates</span>
      </div>
    </article>
  );
}
