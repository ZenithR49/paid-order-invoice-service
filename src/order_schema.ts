import { z } from "zod";

export const invoiceRequestSchema = z.object({
  order: z.object({
    id: z.string().min(1),
    placedAt: z.string().datetime(),
    currency: z.string().length(3),
    paymentStatus: z.enum(["pending", "paid", "refunded"]),
    customer: z.object({
      name: z.string().min(1),
      email: z.string().email(),
      billingAddress: z.string().min(1)
    }),
    items: z.array(z.object({
      sku: z.string().min(1),
      description: z.string().min(1),
      quantity: z.number().int().positive(),
      unitPriceCents: z.number().int().nonnegative(),
      fulfillmentStatus: z.enum(["unfulfilled", "fulfilled", "returned"])
    })).min(1)
  })
});

export type InvoiceRequest = z.infer<typeof invoiceRequestSchema>;
export type Order = InvoiceRequest["order"];
