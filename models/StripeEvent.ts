import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const stripeEventSchema = new Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true },
    processedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

export type StripeEventDocument = InferSchemaType<typeof stripeEventSchema>;

export const StripeEvent =
  (mongoose.models.StripeEvent as Model<StripeEventDocument>) ||
  mongoose.model<StripeEventDocument>("StripeEvent", stripeEventSchema);
