import { jsonResponse } from "../server/lib/http.js";

import { GET as getPublicProducts } from "../server/marketplace/public/products.js";
import { GET as getSoftwareProducts } from "../server/marketplace/public/software-products.js";

import {
  GET as getSellerProfile,
  POST as postSellerProfile,
} from "../server/marketplace/seller/profile.js";
import {
  GET as getSellerApplication,
  POST as postSellerApplication,
} from "../server/marketplace/seller/application.js";
import {
  GET as getSellerListings,
  POST as postSellerListings,
} from "../server/marketplace/seller/listings.js";
import { PATCH as patchSellerListing } from "../server/marketplace/seller/listing.js";
import { POST as postSellerCashSale } from "../server/marketplace/seller/cash-sale.js";
import {
  GET as getSellerSales,
  PATCH as patchSellerSales,
} from "../server/marketplace/seller/sales.js";
import { POST as postSellerStripe } from "../server/marketplace/seller/stripe.js";

import { GET as getAdminMarketplace } from "../server/marketplace/admin/marketplace.js";
import { POST as postAdminSellerStatus } from "../server/marketplace/admin/seller-status.js";
import { POST as postAdminListingStatus } from "../server/marketplace/admin/listing-status.js";

/* ==========================================================
   HEADER 001
   MARKETPLACE API ROUTER

   All marketplace, seller-center, and marketplace-admin API
   operations share one Vercel Function. Business logic stays
   split into internal route modules under /server.
   ========================================================== */

type MarketplaceRoute =
  | "products"
  | "software-products"
  | "seller-profile"
  | "seller-application"
  | "seller-listings"
  | "seller-listing"
  | "seller-cash-sale"
  | "seller-sales"
  | "seller-stripe"
  | "admin-marketplace"
  | "admin-seller-status"
  | "admin-listing-status";

function getRoute(request: Request): MarketplaceRoute | null {
  const route = new URL(request.url).searchParams.get("route");

  switch (route) {
    case "products":
    case "software-products":
    case "seller-profile":
    case "seller-application":
    case "seller-listings":
    case "seller-listing":
    case "seller-cash-sale":
    case "seller-sales":
    case "seller-stripe":
    case "admin-marketplace":
    case "admin-seller-status":
    case "admin-listing-status":
      return route;
    default:
      return null;
  }
}

function routeNotFound() {
  return jsonResponse({ error: "Marketplace API route not found." }, 404);
}

function methodNotAllowed() {
  return jsonResponse({ error: "Method not allowed for this marketplace route." }, 405);
}

/* ==========================================================
   HEADER 002
   GET ROUTES
   ========================================================== */

export async function GET(request: Request) {
  switch (getRoute(request)) {
    case "products":
      return getPublicProducts(request);
    case "software-products":
      return getSoftwareProducts(request);
    case "seller-profile":
      return getSellerProfile(request);
    case "seller-application":
      return getSellerApplication(request);
    case "seller-listings":
      return getSellerListings(request);
    case "seller-sales":
      return getSellerSales(request);
    case "admin-marketplace":
      return getAdminMarketplace(request);
    case null:
      return routeNotFound();
    default:
      return methodNotAllowed();
  }
}

/* ==========================================================
   HEADER 003
   POST ROUTES
   ========================================================== */

export async function POST(request: Request) {
  switch (getRoute(request)) {
    case "seller-profile":
      return postSellerProfile(request);
    case "seller-application":
      return postSellerApplication(request);
    case "seller-listings":
      return postSellerListings(request);
    case "seller-cash-sale":
      return postSellerCashSale(request);
    case "seller-stripe":
      return postSellerStripe(request);
    case "admin-seller-status":
      return postAdminSellerStatus(request);
    case "admin-listing-status":
      return postAdminListingStatus(request);
    case null:
      return routeNotFound();
    default:
      return methodNotAllowed();
  }
}

/* ==========================================================
   HEADER 004
   PATCH ROUTES
   ========================================================== */

export async function PATCH(request: Request) {
  switch (getRoute(request)) {
    case "seller-listing":
      return patchSellerListing(request);
    case "seller-sales":
      return patchSellerSales(request);
    case null:
      return routeNotFound();
    default:
      return methodNotAllowed();
  }
}
