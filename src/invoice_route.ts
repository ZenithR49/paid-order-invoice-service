import { createServer, type ServerResponse } from "node:http";
import { ZodError } from "zod";
import { InfraiError, generateInvoicePdf } from "./infrai_pdf.js";
import { decideInvoice, renderInvoice } from "./invoice_workflow.js";
import { invoiceRequestSchema } from "./order_schema.js";

function send(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

export const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/orders/invoice") {
    send(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = invoiceRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const decision = decideInvoice(input.order);
    if (decision.eligible === false) {
      send(response, 409, { error: decision.reason, orderStatus: input.order.paymentStatus });
      return;
    }

    const apiKey = process.env.INFRAI_API_KEY;
    if (!apiKey) {
      send(response, 500, { error: "INFRAI_API_KEY is required" });
      return;
    }
    const pdf = await generateInvoicePdf(renderInvoice(input.order, decision.fulfilledItems), input.order.id, apiKey);
    send(response, 201, { orderId: input.order.id, orderUpdate: "invoice_issued", receipt: pdf });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      send(response, 400, { error: "Invalid invoice request" });
    } else if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      send(response, status, { error: error.message, detail: error.detail });
    } else {
      send(response, 500, { error: "Invoice request failed" });
    }
  }
});

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`Invoice service listening on http://localhost:${port}`));
}
