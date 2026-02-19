import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const coinLedgerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    delta: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["purchase", "message_unlock", "super_like", "photo_unlock", "boost", "gift_send", "refund", "adjustment"],
      required: true
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

coinLedgerSchema.index({ userId: 1, createdAt: -1 });

export type CoinLedgerDocument = InferSchemaType<typeof coinLedgerSchema>;

export const CoinLedger =
  (mongoose.models.CoinLedger as Model<CoinLedgerDocument>) ||
  mongoose.model<CoinLedgerDocument>("CoinLedger", coinLedgerSchema);
