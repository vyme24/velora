import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const paymentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    provider: { type: String, enum: ["stripe", "razorpay", "internal"], required: true },
    type: { type: String, enum: ["subscription", "coin"], required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded", "canceled"],
      default: "pending",
      index: true
    },
    invoiceId: { type: String, required: true, unique: true, index: true },
    referenceId: { type: String, required: true, unique: true },
    stripeCheckoutSessionId: { type: String, default: null, index: true },
    stripePaymentIntentId: { type: String, default: null, index: true },
    stripeInvoiceId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null, index: true },
    packageId: { type: String, default: null },
    coinsAdded: { type: Number, default: 0 },
    subscriptionPlan: { type: String, enum: ["free", "gold", "platinum", null], default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    paidAt: { type: Date, default: null }
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

export type PaymentDocument = InferSchemaType<typeof paymentSchema>;

export const Payment =
  (mongoose.models.Payment as Model<PaymentDocument>) ||
  mongoose.model<PaymentDocument>("Payment", paymentSchema);
