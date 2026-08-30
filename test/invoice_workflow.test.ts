import assert from "node:assert/strict";
import test from "node:test";
import { decideInvoice } from "../src/invoice_workflow.js";
import type { Order } from "../src/order_schema.js";

const order: Order = {
  id: "order_1042",
  placedAt: "2026-08-28T09:30:00.000Z",
  currency: "USD",
  paymentStatus: "paid",
  customer: { name: "Mina Chen", email: "mina@example.com", billingAddress: "14 Market Street" },
  items: [
    { sku: "SHIPPED", description: "Notebook", quantity: 2, unitPriceCents: 1800, fulfillmentStatus: "fulfilled" },
    { sku: "WAITING", description: "Pen", quantity: 1, unitPriceCents: 400, fulfillmentStatus: "unfulfilled" }
  ]
};

test("a receipt includes only fulfilled items from a paid order", () => {
  const decision = decideInvoice(order);
  assert.equal(decision.eligible, true);
  if (decision.eligible) assert.deepEqual(decision.fulfilledItems.map((item) => item.sku), ["SHIPPED"]);
});

test("an unpaid order does not advance to invoice issuance", () => {
  const decision = decideInvoice({ ...order, paymentStatus: "pending" });
  assert.deepEqual(decision, { eligible: false, reason: "Order must be paid before invoicing" });
});
