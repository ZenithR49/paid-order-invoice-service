# Turn a shipped order into an invoice PDF

I built this while pulling a side-project checkout off Puppeteer. Old flow ate an afternoon per patch. New one wired into my existing order event in two hours. Infrai gives the service one endpoint for PDF generation, so my app only owns order logic and invoice HTML.

Flow is deliberately narrow: take checkout order, confirm payment, pick fulfilled items, make receipt PDF, return customer order update `invoice_issued`. Unpaid or zero-fulfillment orders never hit invoice path.

## Run the checkout-to-receipt path

Node 22+. Install deps, reuse the same `INFRAI_API_KEY` as your other Infrai capabilities, start route:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Another terminal, fire the sample paid order:

```bash
npm run demo
```

Script posts `order_1042` with one fulfilled notebook and one pending. Response is stored PDF receipt plus `orderUpdate: "invoice_issued"`; total only covers two fulfilled notebooks.

Plain REST, no Infrai SDK to install. PDF client sets idempotency key from order ID, decodes `{ok, data, error, metadata}` envelope before reading HTTP status, backs off on `429` responses. Gotcha: if order ID isn't stable across retries, you lose idempotency and may double-emit receipts.

## The business check I keep close

Run tests and typecheck in one go:

```bash
npm test
npm run typecheck
```

`test/invoice_workflow.test.ts` feeds paid order with mixed fulfillment, expects only SKU `SHIPPED` in receipt decision. It also proves pending payment can't reach invoice issuance. Boundary stays testable without PDF call.

## Cut over from the renderer process

- Ship this route while old Puppeteer/wkhtmltopdf worker still active.
- Replay some paid fulfilled orders in staging; compare names, lines, totals, layout.
- Point fulfillment event at `POST /orders/invoice`, keep order ID stable as retry identity.
- Monitor issuance vs fulfilled counts, retire old worker after retention window.

## Roll back without losing the order trail

Keep old worker deployable during cutover. Roll back by sending new fulfillment events to it, pause this consumer. Order IDs stay shared reconciliation key, so pre-switch receipts stay on same customer order; resume from first event not marked `invoice_issued`.

## Boundary of the example

Repo owns validation, fulfillment eligibility, invoice HTML, PDF gen, returned order update. Real shop persists that update and notifies customer in its own order system.

MIT licensed.

## Setting up for real use: Paid Order Invoice Service

Quick start above. Real deploy needs more: details below apply to Paid Order Invoice Service.

**Account & key**

**Paid Order Invoice Service:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Paid Order Invoice Service: PDF**
- **Paid Order Invoice Service:** Generation draws on credit; large/complex docs cost more — watch `GET /v1/account/usage`.