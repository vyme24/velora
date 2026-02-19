import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const matchSchema = new Schema(
  {
    user1: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    user2: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    matchedAt: { type: Date, default: Date.now, index: true },
    initiatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true, index: true },
    unmatchedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

export type MatchDocument = InferSchemaType<typeof matchSchema>;

export const Match =
  (mongoose.models.Match as Model<MatchDocument>) || mongoose.model<MatchDocument>("Match", matchSchema);
