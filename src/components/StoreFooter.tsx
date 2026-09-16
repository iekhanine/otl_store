import { NavLink } from "react-router-dom";

export default function StoreFooter() {
  return (
    <footer className="store-footer">
      <div className="store-shell footer-grid">
        <div className="footer-brand"><img src="/images/onetimelabs.png" alt="" /><div><strong>OneTime Labs Store</strong><span>Software, hardware, and independent sellers.</span></div></div>
        <div className="footer-links"><NavLink to="/">Store</NavLink><NavLink to="/hardware">Hardware</NavLink><NavLink to="/software">Software</NavLink><NavLink to="/seller">Sell</NavLink><NavLink to="/support">Support</NavLink><NavLink to="/privacy">Privacy</NavLink><NavLink to="/account">Account</NavLink></div>
        <div className="footer-copy">© 2026 OneTime Labs</div>
      </div>
    </footer>
  );
}
