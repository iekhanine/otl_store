import type { User } from "@supabase/supabase-js";
import { isAuthError, requireStoreUser } from "../../lib/auth.js";
import { jsonResponse, readJson } from "../../lib/http.js";
import { slugifyStoreValue } from "../../lib/marketplace.js";
import { getSupabaseAdmin } from "../../lib/supabase.js";

/* ==========================================================
   HEADER 001
   SELLER APPLICATION

   Seller applications live in the Store. Platform remains a
   private OneTime Labs administration console.
   ========================================================== */

type SellerApplicationPayload = {
  displayName?: unknown;
  slug?: unknown;
  sellingDescription?: unknown;
};

type CompanyOwnerContext = {
  platformUserId: string;
  organizationId: string;
};

function textValue(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

/* ==========================================================
   HEADER 002
   COMPANY OWNER PROVISIONING

   A seller applicant is represented inside Platform as a
   normal Platform user attached to an organization with the
   Company Owner organization role. This does NOT grant access
   to the private Platform admin console.
   ========================================================== */

async function ensureCompanyOwner(
  user: User,
  companyName: string,
  requestedSlug: string,
): Promise<CompanyOwnerContext> {
  const supabase = getSupabaseAdmin();
  const email = user.email!.trim().toLowerCase();

  let platformUserId = "";

  const existingPlatformUser = await supabase
    .from("platform_users")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingPlatformUser.error) {
    throw new Error(
      `Unable to check Platform user: ${existingPlatformUser.error.message}`,
    );
  }

  if (existingPlatformUser.data) {
    platformUserId = existingPlatformUser.data.id;

    const updateResult = await supabase
      .from("platform_users")
      .update({
        email,
        display_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          companyName,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", platformUserId);

    if (updateResult.error) {
      throw new Error(
        `Unable to update Platform user: ${updateResult.error.message}`,
      );
    }
  } else {
    const createResult = await supabase
      .from("platform_users")
      .insert({
        auth_user_id: user.id,
        email,
        display_name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          companyName,
        avatar_url: user.user_metadata?.avatar_url ?? null,
        active: true,
        is_employee: false,
        is_platform_admin: false,
        is_platform_owner: false,
      })
      .select("id")
      .single();

    if (createResult.error || !createResult.data) {
      throw new Error(
        `Unable to create Platform user: ${createResult.error?.message ?? "Unknown error."}`,
      );
    }

    platformUserId = createResult.data.id;
  }

  /* ========================================================
     HEADER 003
     Resolve Company Owner role
     ======================================================== */

  let companyOwnerRoleId = "";

  const byCode = await supabase
    .from("platform_roles")
    .select("id")
    .eq("code", "company_owner")
    .maybeSingle();

  if (byCode.error) {
    throw new Error(
      `Unable to load Company Owner role: ${byCode.error.message}`,
    );
  }

  if (byCode.data) {
    companyOwnerRoleId = byCode.data.id;
  } else {
    const byName = await supabase
      .from("platform_roles")
      .select("id")
      .eq("display_name", "Company Owner")
      .maybeSingle();

    if (byName.error) {
      throw new Error(
        `Unable to load Company Owner role: ${byName.error.message}`,
      );
    }

    if (!byName.data) {
      throw new Error(
        "Company Owner role is not configured in Platform. Run sql/005_company_owner_role.sql once.",
      );
    }

    companyOwnerRoleId = byName.data.id;
  }

  /* ========================================================
     HEADER 004
     Existing organization membership
     ======================================================== */

  const existingMembership = await supabase
    .from("organization_members")
    .select("id, organization_id")
    .eq("platform_user_id", platformUserId)
    .maybeSingle();

  if (existingMembership.error) {
    throw new Error(
      `Unable to check organization membership: ${existingMembership.error.message}`,
    );
  }

  if (existingMembership.data) {
    const membershipUpdate = await supabase
      .from("organization_members")
      .update({
        role_id: companyOwnerRoleId,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingMembership.data.id);

    if (membershipUpdate.error) {
      throw new Error(
        `Unable to assign Company Owner role: ${membershipUpdate.error.message}`,
      );
    }

    return {
      platformUserId,
      organizationId: existingMembership.data.organization_id,
    };
  }

  /* ========================================================
     HEADER 005
     Create seller organization
     ======================================================== */

  let organizationSlug = requestedSlug;

  const slugCheck = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", organizationSlug)
    .maybeSingle();

  if (slugCheck.error) {
    throw new Error(
      `Unable to check organization handle: ${slugCheck.error.message}`,
    );
  }

  if (slugCheck.data) {
    organizationSlug = `${requestedSlug}-${user.id.slice(0, 8)}`;
  }

  const organizationResult = await supabase
    .from("organizations")
    .insert({
      name: companyName,
      slug: organizationSlug,
      active: true,
    })
    .select("id")
    .single();

  if (organizationResult.error || !organizationResult.data) {
    throw new Error(
      `Unable to create seller organization: ${organizationResult.error?.message ?? "Unknown error."}`,
    );
  }

  const organizationId = organizationResult.data.id;

  const membershipResult = await supabase
    .from("organization_members")
    .insert({
      platform_user_id: platformUserId,
      organization_id: organizationId,
      role_id: companyOwnerRoleId,
      status: "active",
      joined_at: new Date().toISOString(),
    });

  if (membershipResult.error) {
    throw new Error(
      `Unable to assign Company Owner membership: ${membershipResult.error.message}`,
    );
  }

  return {
    platformUserId,
    organizationId,
  };
}

/* ==========================================================
   HEADER 006
   GET /api/seller/application
   ========================================================== */

export async function GET(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const supabase = getSupabaseAdmin();

    const result = await supabase
      .from("store_seller_applications")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (result.error) {
      throw new Error(
        `Unable to load seller application: ${result.error.message}`,
      );
    }

    return jsonResponse({
      application: result.data ?? null,
    });
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
            : "Unable to load seller application.",
      },
      500,
    );
  }
}

/* ==========================================================
   HEADER 007
   POST /api/seller/application
   ========================================================== */

export async function POST(request: Request) {
  try {
    const user = await requireStoreUser(request);
    const supabase = getSupabaseAdmin();
    const payload = await readJson<SellerApplicationPayload>(request);

    const displayName = textValue(payload.displayName, 100);
    const requestedSlug = slugifyStoreValue(
      textValue(payload.slug, 100) || displayName,
    );
    const sellingDescription = textValue(
      payload.sellingDescription,
      1200,
    );

    if (displayName.length < 2) {
      return jsonResponse(
        { error: "Company / store name is required." },
        400,
      );
    }

    if (requestedSlug.length < 2) {
      return jsonResponse(
        { error: "Choose a valid Store handle." },
        400,
      );
    }

    if (sellingDescription.length < 10) {
      return jsonResponse(
        { error: "Tell us briefly what you plan to sell." },
        400,
      );
    }

    const existingApplication = await supabase
      .from("store_seller_applications")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (existingApplication.error) {
      throw new Error(existingApplication.error.message);
    }

    if (existingApplication.data) {
      return jsonResponse({
        application: existingApplication.data,
      });
    }

    const sellerHandle = await supabase
      .from("store_sellers")
      .select("id")
      .eq("slug", requestedSlug)
      .maybeSingle();

    if (sellerHandle.error) {
      throw new Error(sellerHandle.error.message);
    }

    if (sellerHandle.data) {
      return jsonResponse(
        { error: "That Store handle is already in use." },
        409,
      );
    }

    const applicationHandle = await supabase
      .from("store_seller_applications")
      .select("id")
      .eq("slug", requestedSlug)
      .maybeSingle();

    if (applicationHandle.error) {
      throw new Error(applicationHandle.error.message);
    }

    if (applicationHandle.data) {
      return jsonResponse(
        { error: "That Store handle is already reserved by another application." },
        409,
      );
    }

    /* ======================================================
       HEADER 008
       Platform registration

       This is the point where the applicant becomes visible
       in private Platform as the Company Owner of the seller
       organization.
       ====================================================== */

    await ensureCompanyOwner(
      user,
      displayName,
      requestedSlug,
    );

    const applicationResult = await supabase
      .from("store_seller_applications")
      .insert({
        auth_user_id: user.id,
        email: user.email!.trim().toLowerCase(),
        display_name: displayName,
        slug: requestedSlug,
        selling_description: sellingDescription,
        status: "pending",
        submitted_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (applicationResult.error || !applicationResult.data) {
      if (applicationResult.error?.code === "23505") {
        return jsonResponse(
          { error: "A seller application already exists for this account or Store handle." },
          409,
        );
      }

      throw new Error(
        applicationResult.error?.message ||
        "Unable to create seller application.",
      );
    }

    return jsonResponse(
      {
        application: applicationResult.data,
      },
      201,
    );
  } catch (error) {
    if (isAuthError(error)) {
      return jsonResponse(
        { error: "Sign in to apply for a seller account." },
        401,
      );
    }

    console.error("Seller application error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to submit seller application.",
      },
      500,
    );
  }
}
