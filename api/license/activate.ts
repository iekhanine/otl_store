import { requireEnv } from "../../server/lib/env.js";
import { jsonResponse } from "../../server/lib/http.js";

export async function POST(request: Request) {

  try {
    const rawBody = await request.text();
    if (!rawBody.trim()) {
      return jsonResponse({ error: "Activation request is empty." }, 400);
    }

    const publishableKey = requireEnv("LICENSING_PUBLISHABLE_KEY");
    const response = await fetch(
      requireEnv("LICENSING_ACTIVATE_URL"),
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          apikey: publishableKey,
          authorization: `Bearer ${publishableKey}`,
        },
        body: rawBody,
      },
    );

    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error(error);
    return jsonResponse(
      {
        success: false,
        error: {
          code: "ACTIVATION_PROXY_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Unable to contact the licensing service.",
        },
      },
      502,
    );
  }
}
