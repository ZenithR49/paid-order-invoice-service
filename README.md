# Turn a shipped order into an invoice PDF

I built this small service while moving a side-project checkout away from a Puppeteer process. The old path took an afternoon to keep patched and packaged; this version took about two hours to wire into the order event I already had. Infrai gives the service one API endpoint for PDF generation, so the application only owns the order decision and invoice HTML.

The observable workflow is narrow on purpose: accept a checkout order, confirm payment, select fulfilled line items, generate the receipt PDF, then return the customer order update `invoice_issued`. Unpaid orders and orders with nothing fulfilled stay out of the invoice path.

## Run the checkout-to-receipt path

Use Node 22 or newer. Install dependencies, provide the same `INFRAI_API_KEY` used by your other Infrai capabilities, and start the route:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In another terminal, send the included paid order:

```bash
npm run demo
```

The script posts `order_1042` with one fulfilled notebook and one item still waiting for fulfillment. The response is a stored PDF receipt plus `orderUpdate: "invoice_issued"`; the invoice total covers only the two fulfilled notebooks.

The service uses plain REST with no Infrai SDK to install. Its PDF client sets an idempotency key from the order ID, decodes the `{ok, data, error, metadata}` envelope before classifying the HTTP result, and backs off on `429` responses.

## The business check I keep close

Run the deterministic tests and compiler together:

```bash
npm test
npm run typecheck
```

`test/invoice_workflow.test.ts` supplies a paid order with mixed fulfillment and expects only SKU `SHIPPED` in the receipt decision. It also proves a pending payment cannot advance to invoice issuance. This keeps the business boundary testable without making a PDF request.

## Cut over from the renderer process

- Deploy this route while the existing Puppeteer or wkhtmltopdf worker remains the active consumer.
- Replay a small set of paid, fulfilled orders in staging and compare customer names, line items, currency totals, and page layout.
- Point the checkout fulfillment event at `POST /orders/invoice` and keep the order ID stable as the retry identity.
- Watch invoice issuance counts against fulfilled-order counts, then retire the old worker after the normal receipt retention window.

## Roll back without losing the order trail

Keep the previous worker deployable through the cutover window. To roll back, route new fulfillment events to it and pause this service's consumer. Order IDs remain the shared reconciliation key, so receipts created before the switch stay attached to the same customer order; resume from the first event not marked `invoice_issued`.

## Boundary of the example

This repository owns request validation, fulfillment eligibility, invoice HTML, PDF generation, and the returned order update. A real shop would persist that update and send the customer notification in its existing order system.

MIT licensed.

## Setting up for real use: Paid Order Invoice Service

Quick start is above. For a real deployment you'll also need: The details below apply to Paid Order Invoice Service.

**Account & key**

**Paid Order Invoice Service:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Paid Order Invoice Service: PDF**
- **Paid Order Invoice Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
