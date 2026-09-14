export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        ...headers,
      },
    },
  );
}

export function methodNotAllowed() {
  return jsonResponse(
    { error: "Method not allowed." },
    405,
    { Allow: "GET, POST" },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  const raw = await request.text();
  if (!raw.trim()) {
    throw new Error("Request body is empty.");
  }
  return JSON.parse(raw) as T;
}
