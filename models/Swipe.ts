import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const swipeSchema = new Schema(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, enum: ["like", "pass", "super_like"], required: true },
    consumedCoins: { type: Number, default: 0 },
    source: { type: String, enum: ["feed", "profile", "reconnect"], default: "feed" }
  },
  { timestamps: true }
);

swipeSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export type SwipeDocument = InferSchemaType<typeof swipeSchema>;

export const Swipe =
  (mongoose.models.Swipe as Model<SwipeDocument>) || mongoose.model<SwipeDocument>("Swipe", swipeSchema);
