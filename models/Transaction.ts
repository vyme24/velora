import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stripeSessionId: { type: String, required: true, unique: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["subscription", "coins"], required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "canceled"],
      default: "pending",
      index: true
    }
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, createdAt: -1 });

export type TransactionDocument = InferSchemaType<typeof transactionSchema>;

export const Transaction =
  (mongoose.models.Transaction as Model<TransactionDocument>) ||
  mongoose.model<TransactionDocument>("Transaction", transactionSchema);
