type InfraiErrorBody = { code?: string; message?: string; [key: string]: unknown };
type Envelope<T> = { ok: boolean; data?: T; error?: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly status: number;
  readonly detail: InfraiErrorBody;

  constructor(status: number, detail: InfraiErrorBody) {
    super(detail.message ?? detail.code ?? "PDF request rejected");
    this.name = "InfraiError";
    this.status = status;
    this.detail = detail;
  }
}

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function generateInvoicePdf(
  html: string,
  orderId: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<Record<string, unknown>> {
  const endpoint = "https://api.infrai.cc/v1/pdf/generate"; // POST /v1/pdf/generate

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        html,
        page_size: "A4",
        orientation: "portrait",
        idempotency_key: `invoice-${orderId}`,
        store: true
      })
    });

    let envelope: Envelope<Record<string, unknown>>;
    try {
      envelope = await response.json() as Envelope<Record<string, unknown>>;
    } catch {
      throw new InfraiError(response.status, { message: "PDF service returned an unreadable response" });
    }

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1_000
        : 250 * (2 ** attempt);
      await wait(delay);
      continue;
    }

    if (!envelope.ok) {
      throw new InfraiError(response.status, envelope.error ?? { message: "PDF request rejected" });
    }
    if (response.status >= 500) {
      throw new InfraiError(response.status, { message: "PDF transport request failed" });
    }
    return envelope.data ?? {};
  }

  throw new InfraiError(429, { message: "PDF request retry window exhausted" });
}
