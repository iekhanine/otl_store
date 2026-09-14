import { isAuthError, requireStoreUser } from "../../lib/auth.js";
import { getSellerForUser } from "../../lib/marketplace.js";
import { jsonResponse } from "../../lib/http.js";

/* ==========================================================
   SELLER PROFILE 001
   Existing seller account lookup
   ========================================================== */

export async function GET(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const seller = await getSellerForUser(user);
    return jsonResponse({ seller });
  } catch (error) {
    if (isAuthError(error)) {
      return jsonResponse(
        { error: "Sign in to continue." },
        401,
      );
    }

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load seller profile.",
      },
      500,
    );
  }
}

/* ==========================================================
   SELLER PROFILE 002
   Seller accounts are created after private Platform approval.
   Applications themselves are submitted inside Store Seller Center.
   ========================================================== */

export async function POST(request: Request) {
  try {
    await requireStoreUser(request);

    return jsonResponse(
      {
        error:
          "Submit a seller application through Seller Center first.",
        applyUrl: "/seller",
      },
      403,
    );
  } catch (error) {
    if (isAuthError(error)) {
      return jsonResponse(
        { error: "Sign in to continue." },
        401,
      );
    }

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process seller profile request.",
      },
      500,
    );
  }
}
