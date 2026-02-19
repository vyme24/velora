import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const emailLogSchema = new Schema(
  {
    to: { type: String, required: true, index: true, lowercase: true, trim: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ["sent", "skipped", "failed"], required: true, index: true },
    provider: { type: String, default: "resend", index: true },
    messageId: { type: String, default: null, index: true },
    errorMessage: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

emailLogSchema.index({ createdAt: -1, status: 1 });

export type EmailLogDocument = InferSchemaType<typeof emailLogSchema>;

export const EmailLog =
  (mongoose.models.EmailLog as Model<EmailLogDocument>) ||
  mongoose.model<EmailLogDocument>("EmailLog", emailLogSchema);
