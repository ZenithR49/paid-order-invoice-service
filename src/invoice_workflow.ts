import type { Order } from "./order_schema.js";

export type InvoiceDecision =
  | { eligible: true; fulfilledItems: Order["items"] }
  | { eligible: false; reason: string };

export function decideInvoice(order: Order): InvoiceDecision {
  if (order.paymentStatus !== "paid") {
    return { eligible: false, reason: "Order must be paid before invoicing" };
  }
  const fulfilledItems = order.items.filter((item) => item.fulfillmentStatus === "fulfilled");
  if (fulfilledItems.length === 0) {
    return { eligible: false, reason: "At least one fulfilled item is required" };
  }
  return { eligible: true, fulfilledItems };
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
})[character] ?? character);

export function renderInvoice(order: Order, items: Order["items"]): string {
  const formatMoney = (cents: number) => new Intl.NumberFormat("en-US", {
    style: "currency", currency: order.currency.toUpperCase()
  }).format(cents / 100);
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPriceCents, 0);
  const rows = items.map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${item.quantity}</td><td>${formatMoney(item.unitPriceCents)}</td><td>${formatMoney(item.quantity * item.unitPriceCents)}</td></tr>`).join("");

  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font:14px Arial;color:#202124;padding:36px}h1{font-size:26px}table{width:100%;border-collapse:collapse;margin-top:28px}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{text-align:right;font-size:18px;margin-top:20px}</style></head><body><h1>Invoice</h1><p>Order ${escapeHtml(order.id)}<br>${escapeHtml(order.customer.name)}<br>${escapeHtml(order.customer.billingAddress)}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><p class="total"><strong>Total: ${formatMoney(total)}</strong></p></body></html>`;
}
