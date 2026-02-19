import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const passkeyCredentialSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    credentialId: { type: String, required: true, unique: true, index: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    label: { type: String, default: "My device" },
    transports: { type: [String], default: [] },
    lastUsedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

passkeyCredentialSchema.index({ userId: 1, createdAt: -1 });

export type PasskeyCredentialDocument = InferSchemaType<typeof passkeyCredentialSchema>;

export const PasskeyCredential =
  (mongoose.models.PasskeyCredential as Model<PasskeyCredentialDocument>) ||
  mongoose.model<PasskeyCredentialDocument>("PasskeyCredential", passkeyCredentialSchema);

