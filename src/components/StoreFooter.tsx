import { NavLink } from "react-router-dom";

export default function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="store-shell footer-grid">
        <div className="footer-brand">
          <img src="/images/onetimelabs.png" alt="" />
          <div>
            <strong>OneTime Labs</strong>
            <span>Software you buy once and keep.</span>
          </div>
        </div>

        <div className="footer-links">
          <NavLink to="/">Store</NavLink>
          <NavLink to="/streamsafe">StreamSafe</NavLink>
          <NavLink to="/support">Support</NavLink>
          <NavLink to="/account">My Software</NavLink>
        </div>

        <div className="footer-copy">
          © 2026 OneTime Labs
        </div>
      </div>
    </footer>
  );
}
