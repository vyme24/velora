import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const giftSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, lowercase: true, index: true },
    coins: { type: Number, required: true, min: 1 },
    image: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    featured: { type: Boolean, default: false, index: true },
    active: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 100, index: true }
  },
  { timestamps: true }
);

giftSchema.index({ active: 1, category: 1, sortOrder: 1 });

export type GiftDocument = InferSchemaType<typeof giftSchema>;

export const Gift =
  (mongoose.models.Gift as Model<GiftDocument>) ||
  mongoose.model<GiftDocument>("Gift", giftSchema);

