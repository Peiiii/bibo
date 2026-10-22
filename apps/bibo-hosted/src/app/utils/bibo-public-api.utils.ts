import { json } from "../bibo-auth.utils";

const codes: Record<number, string> = { 400: "INVALID_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND",
  409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE", 429: "RATE_LIMITED", 503: "UNAVAILABLE" };
export class PublicApiError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export function apiError(message: string, status: number, requestId = crypto.randomUUID(), headers?: HeadersInit): Response {
  return json({ error: { code: codes[status] ?? "INTERNAL_ERROR", message }, requestId }, status,
    { ...Object.fromEntries(new Headers(headers)), "x-request-id": requestId });
}
export function apiResult(result: unknown, requestId: string, status = 200): Response {
  return json({ result, requestId }, status, { "x-request-id": requestId });
}
/** Bound actual streamed bytes, including requests without Content-Length. */
export async function readApiObject(request: Request, max = 1_100_000): Promise<Record<string, unknown>> {
  if (Number(request.headers.get("content-length")) > max) throw new PublicApiError("Request body is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new PublicApiError("A JSON object is required.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > max) { await reader.cancel(); throw new PublicApiError("Request body is too large.", 413); }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new PublicApiError("A valid JSON object is required.", 400); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new PublicApiError("A JSON object is required.", 400);
  return value as Record<string, unknown>;
}
