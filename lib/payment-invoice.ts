import { randomUUID } from "crypto";

export function generateInvoiceId(prefix = "INV") {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
