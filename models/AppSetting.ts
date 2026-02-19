import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    valueType: { type: String, enum: ["number", "string", "boolean"], default: "number" },
    numberValue: { type: Number, default: null },
    stringValue: { type: String, default: null },
    booleanValue: { type: Boolean, default: null },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    group: { type: String, default: "general", trim: true, lowercase: true, index: true },
    editable: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

appSettingSchema.index({ group: 1, active: 1, key: 1 });

export type AppSettingDocument = InferSchemaType<typeof appSettingSchema>;

export const AppSetting =
  (mongoose.models.AppSetting as Model<AppSettingDocument>) ||
  mongoose.model<AppSettingDocument>("AppSetting", appSettingSchema);

