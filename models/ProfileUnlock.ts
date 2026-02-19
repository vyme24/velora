import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const profileUnlockSchema = new Schema(
  {
    viewerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    profileUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cost: { type: Number, default: 70 }
  },
  { timestamps: true }
);

profileUnlockSchema.index({ viewerId: 1, profileUserId: 1 }, { unique: true });

export type ProfileUnlockDocument = InferSchemaType<typeof profileUnlockSchema>;

export const ProfileUnlock =
  (mongoose.models.ProfileUnlock as Model<ProfileUnlockDocument>) ||
  mongoose.model<ProfileUnlockDocument>("ProfileUnlock", profileUnlockSchema);
