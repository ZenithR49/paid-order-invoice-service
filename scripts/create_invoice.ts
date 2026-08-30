export {};

const response = await fetch("http://localhost:3000/orders/invoice", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    order: {
      id: "order_1042",
      placedAt: "2026-08-28T09:30:00.000Z",
      currency: "USD",
      paymentStatus: "paid",
      customer: {
        name: "Mina Chen",
        email: "mina@example.com",
        billingAddress: "14 Market Street, San Francisco, CA 94105"
      },
      items: [
        { sku: "NOTE-A5", description: "A5 launch notebook", quantity: 2, unitPriceCents: 1800, fulfillmentStatus: "fulfilled" },
        { sku: "PEN-BLK", description: "Black ink pen", quantity: 1, unitPriceCents: 400, fulfillmentStatus: "unfulfilled" }
      ]
    }
  })
});

console.log(JSON.stringify(await response.json(), null, 2));
