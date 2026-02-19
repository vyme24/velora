import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type PasswordResetTokenDocument = InferSchemaType<typeof passwordResetTokenSchema>;

export const PasswordResetToken =
  (mongoose.models.PasswordResetToken as Model<PasswordResetTokenDocument>) ||
  mongoose.model<PasswordResetTokenDocument>("PasswordResetToken", passwordResetTokenSchema);
