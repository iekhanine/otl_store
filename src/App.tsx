import { Route, Routes } from "react-router-dom";
import StoreFooter from "./components/StoreFooter";
import StoreHeader from "./components/StoreHeader";
import AccountPage from "./pages/AccountPage";
import CheckoutStartPage from "./pages/CheckoutStartPage";
import AdminMarketplacePage from "./pages/AdminMarketplacePage";
import HardwarePage from "./pages/HardwarePage";
import HardwareProductPage from "./pages/HardwareProductPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PurchaseSuccessPage from "./pages/PurchaseSuccessPage";
import SellerDashboardPage from "./pages/SellerDashboardPage";
import SoftwarePage from "./pages/SoftwarePage";
import SoftwareProductPage from "./pages/SoftwareProductPage";
import StreamSafePage from "./pages/StreamSafePage";
import SupportPage from "./pages/SupportPage";

export default function App() {
  return <div className="app-shell"><StoreHeader /><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/hardware" element={<HardwarePage />} />
    <Route path="/hardware/:slug" element={<HardwareProductPage />} />
    <Route path="/software" element={<SoftwarePage />} />
    <Route path="/software/:slug" element={<SoftwareProductPage />} />
    <Route path="/streamsafe" element={<StreamSafePage />} />
    <Route path="/seller" element={<SellerDashboardPage />} />
    <Route path="/admin" element={<AdminMarketplacePage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/checkout/:slug" element={<CheckoutStartPage />} />
    <Route path="/purchase-success" element={<PurchaseSuccessPage />} />
    <Route path="/account" element={<AccountPage />} />
    <Route path="/support" element={<SupportPage />} />
  </Routes><StoreFooter /></div>;
}
