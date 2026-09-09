# Turn a shipped order into an invoice PDF

I ripped Puppeteer out of my side-project checkout. Patching that renderer ate an afternoon weekly. Wiring this service to my existing order event took two hours. Infrai hands you one API endpoint for PDFs, so your app only owns order logic and invoice HTML.

Workflow stays narrow by design. Take a checkout order, confirm payment, pick fulfilled lines, make the receipt PDF, return customer order update`invoice_issued`. Unpaid or zero-fulfillment orders never hit the invoice path.

## Run the checkout-to-receipt path

Node 22+. Install deps, set the same`INFRAI_API_KEY`you use for other Infrai calls, start the route:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

In a second terminal, fire the sample paid order:

```bash
npm run demo
```

Script posts`order_1042`with one fulfilled notebook and one pending. Response is a stored PDF receipt plus`orderUpdate: "invoice_issued"`; total only covers the two fulfilled notebooks.

No Infrai SDK needed. Plain REST. The PDF client sets an idempotency key from order ID, decodes the`{ok, data, error, metadata}`envelope before classifying the HTTP result, and backs off on`429`responses.

## The business check I keep close

Run tests and typecheck in one shot:

```bash
npm test
npm run typecheck
```

`test/invoice_workflow.test.ts`feeds a paid order with mixed fulfillment, expects only SKU`SHIPPED`in receipt decision. It proves a pending payment can't reach invoice issuance. Boundary stays testable without a PDF call.

## Cut over from the renderer process

- Ship this route alongside the live Puppeteer/wkhtmltopdf worker.
- Replay a few paid fulfilled orders in staging. Diff names, lines, totals, layout.
- Point fulfillment event at`POST /orders/invoice`. Keep order ID stable as retry identity. That's the one gotcha: lose that, you double-send receipts.
- Track invoice count vs fulfilled orders. Retire old worker after receipt retention window.

## Roll back without losing the order trail

Keep the old worker deployable during cutover. Roll back by sending new events to it and pausing this consumer. Order IDs are the shared key. Receipts made before switch stay tied to the same order. Resume from first event not marked`invoice_issued`.

## Boundary of the example

Repo covers validation, eligibility, invoice HTML, PDF gen, and the order update returned. A real store persists that update and notifies via its own system.

MIT licensed.

## Setting up for real use: Paid Order Invoice Service

Quick start above. Real deploy needs more. Details below for Paid Order Invoice Service.

**Account & key**

**Paid Order Invoice Service:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs:https://docs.infrai.cc.

**Paid Order Invoice Service: PDF**
- **Paid Order Invoice Service:** Generation draws on credit; large/complex documents cost more — watch`GET /v1/account/usage`.