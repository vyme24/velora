import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reportedId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reason: {
      type: String,
      enum: ["spam", "harassment", "fake_profile", "underage", "explicit_content", "other"],
      required: true
    },
    details: { type: String, default: "" },
    evidenceImages: { type: [String], default: [] },
    status: { type: String, enum: ["open", "reviewed", "closed"], default: "open", index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    actionTaken: {
      type: String,
      enum: ["none", "warning", "temporary_ban", "permanent_ban"],
      default: "none"
    }
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });

export type ReportDocument = InferSchemaType<typeof reportSchema>;

export const Report =
  (mongoose.models.Report as Model<ReportDocument>) || mongoose.model<ReportDocument>("Report", reportSchema);
