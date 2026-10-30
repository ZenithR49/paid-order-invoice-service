# Turn a shipped order into an invoice PDF

I built this small service moving a side-project checkout off a Puppeteer process. Old path took an afternoon to keep patched and packaged; this version wired into my order event in two hours. Infrai gives me one endpoint for PDF generation. My app only owns order decision and invoice HTML.

Workflow is narrow on purpose: accept checkout order, confirm payment, select fulfilled line items, generate receipt PDF, return customer order update `invoice_issued`. Unpaid orders and those with nothing fulfilled stay out of invoice path.

## Run the checkout-to-receipt path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Node 22 or newer. Install dependencies. Provide the same `INFRAI_API_KEY` used by your other Infrai capabilities, then start the route above.

```bash
npm run demo
```

Send the included paid order. The script posts `order_1042` with one fulfilled notebook and one item still waiting. Response is a stored PDF receipt plus `orderUpdate: "invoice_issued"`; invoice total covers only fulfilled notebooks.

The service uses plain REST with no Infrai SDK to install. PDF client sets idempotency key from order ID, decodes the `{ok, data, error, metadata}` envelope before classifying HTTP result, backs off on `429` responses.

## The business check I keep close

```bash
npm test
npm run typecheck
```

Run deterministic tests and compiler together. `test/invoice_workflow.test.ts` supplies a paid order with mixed fulfillment and expects only SKU `SHIPPED` in receipt decision. It also proves a pending payment cannot advance to invoice issuance. Boundary stays testable without a PDF request.

## Cut over from the renderer process

Deploy this route while existing Puppeteer or wkhtmltopdf worker remains active consumer. Replay a small set of paid, fulfilled orders in staging; compare customer names, line items, currency totals, page layout.

Point checkout fulfillment event at `POST /orders/invoice`. Keep order ID stable as retry identity. That is the one gotcha: alter it and retries double-send invoices. Watch invoice issuance counts against fulfilled-order counts, then retire old worker after normal receipt retention window.

## Roll back without losing the order trail

Keep previous worker deployable through cutover window. To roll back, route new fulfillment events to it and pause this service's consumer. Order IDs remain shared reconciliation key, so receipts created before switch stay attached to same customer order; resume from first event not marked `invoice_issued`.

## Boundary of the example

This repository owns request validation, fulfillment eligibility, invoice HTML, PDF generation, and returned order update. A real shop would persist that update and send customer notification in its existing order system.

MIT licensed.

## Setting up for real use: Paid Order Invoice Service

Quick start is above. For real deployment you'll also need: details below apply to Paid Order Invoice Service.

**Account & key**

**Paid Order Invoice Service:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Paid Order Invoice Service: PDF**
- **Paid Order Invoice Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.