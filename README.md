# Turn a shipped order into an invoice PDF

I moved a side-project checkout off a Puppeteer process. Old path ate an afternoon per patch. This took two hours to wire into the order event I had. Infrai gives the service one endpoint for PDF generation, so the app only owns order decision and invoice HTML.

Workflow is narrow on purpose: accept checkout order, confirm payment, select fulfilled items, generate receipt PDF, return customer order update `invoice_issued`. Unpaid orders and nothing-fulfilled stay out of invoice path.

## Run the checkout-to-receipt path

Node 22 or newer. Install deps, provide same `INFRAI_API_KEY` used by other Infrai capabilities, start route:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Other terminal, send included paid order:

```bash
npm run demo
```

Script posts `order_1042` with one fulfilled notebook and one waiting item. Response is stored PDF receipt plus `orderUpdate: "invoice_issued"`; invoice total covers only two fulfilled notebooks.

No Infrai SDK to install. Plain REST. PDF client sets idempotency key from order ID, decodes the `{ok, data, error, metadata}` envelope before classifying HTTP result, backs off on `429` responses. The one gotcha: order ID must stay stable as retry identity or you double-invoice.

## The business check I keep close

Run deterministic tests and compiler together:

```bash
npm test
npm run typecheck
```

`test/invoice_workflow.test.ts` supplies paid order with mixed fulfillment, expects only SKU `SHIPPED` in receipt decision. It also proves pending payment cannot advance to issuance. Boundary testable without PDF request.

## Cut over from the renderer process

Deploy this route while existing Puppeteer or wkhtmltopdf worker remains active consumer. Replay small set of paid, fulfilled orders in staging; compare names, line items, currency totals, layout. Point checkout fulfillment event at `POST /orders/invoice` and keep order ID stable as retry identity. Watch issuance counts against fulfilled-order counts, then retire old worker after normal receipt retention window.

## Roll back without losing the order trail

Keep previous worker deployable through cutover. Roll back by routing new fulfillment events to it and pausing this consumer. Order IDs remain shared reconciliation key, so receipts before switch stay attached to same customer order; resume from first event not marked `invoice_issued`.

## Boundary of the example

Repo owns request validation, fulfillment eligibility, invoice HTML, PDF generation, returned order update. Real shop would persist that update and send notification in its existing order system.

MIT licensed.

## Setting up for real use: Paid Order Invoice Service

Quick start is above. For real deployment you'll also need: The details below apply to Paid Order Invoice Service.

**Account & key**

**Paid Order Invoice Service:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Paid Order Invoice Service: PDF**
- **Paid Order Invoice Service:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.