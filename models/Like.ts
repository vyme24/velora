import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const likeSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

likeSchema.index({ sender: 1, receiver: 1 }, { unique: true });
likeSchema.index({ receiver: 1, createdAt: -1 });

export type LikeDocument = InferSchemaType<typeof likeSchema>;

export const Like =
  (mongoose.models.Like as Model<LikeDocument>) || mongoose.model<LikeDocument>("Like", likeSchema);
