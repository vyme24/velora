import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const otpCodeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ["email_verification", "login_2fa"], required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 }
  },
  { timestamps: true }
);

otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type OtpCodeDocument = InferSchemaType<typeof otpCodeSchema>;

export const OtpCode =
  (mongoose.models.OtpCode as Model<OtpCodeDocument>) || mongoose.model<OtpCodeDocument>("OtpCode", otpCodeSchema);
