import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const giftTransactionSchema = new Schema(
  {
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiverId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    giftId: { type: Schema.Types.ObjectId, ref: "Gift", required: true, index: true },
    coins: { type: Number, required: true, min: 1 },
    messageId: { type: Schema.Types.ObjectId, ref: "Message", default: null, index: true },
    note: { type: String, default: "", trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

giftTransactionSchema.index({ senderId: 1, createdAt: -1 });
giftTransactionSchema.index({ receiverId: 1, createdAt: -1 });

export type GiftTransactionDocument = InferSchemaType<typeof giftTransactionSchema>;

export const GiftTransaction =
  (mongoose.models.GiftTransaction as Model<GiftTransactionDocument>) ||
  mongoose.model<GiftTransactionDocument>("GiftTransaction", giftTransactionSchema);

