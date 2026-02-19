import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const adminRoleSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    permissions: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    system: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export type AdminRoleDocument = InferSchemaType<typeof adminRoleSchema>;

export const AdminRole =
  (mongoose.models.AdminRole as Model<AdminRoleDocument>) ||
  mongoose.model<AdminRoleDocument>("AdminRole", adminRoleSchema);

