import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const pricingPlanSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    kind: { type: String, enum: ["coin", "subscription"], required: true, index: true },
    label: { type: String, required: true },
    badge: { type: String, default: "" },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    coins: { type: Number, default: 0 },
    extra: { type: Number, default: 0 },
    subscriptionKey: { type: String, enum: ["gold", "platinum", null], default: null, index: true },
    stripePriceId: { type: String, default: null },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 100, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

pricingPlanSchema.index({ kind: 1, active: 1, sortOrder: 1 });

export type PricingPlanDocument = InferSchemaType<typeof pricingPlanSchema>;

export const PricingPlan =
  (mongoose.models.PricingPlan as Model<PricingPlanDocument>) ||
  mongoose.model<PricingPlanDocument>("PricingPlan", pricingPlanSchema);
