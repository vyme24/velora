import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    message: { type: String, default: "", maxlength: 4000 },
    image: { type: String, default: "" },
    seen: { type: Boolean, default: false, index: true },
    seenAt: { type: Date, default: null },
    isDeletedBySender: { type: Boolean, default: false },
    isDeletedByReceiver: { type: Boolean, default: false },
    metadata: {
      type: {
        type: String,
        enum: ["text", "image", "system"],
        default: "text"
      },
      requiresCoins: { type: Boolean, default: false },
      consumedCoins: { type: Number, default: 0 }
    },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });

export type MessageDocument = InferSchemaType<typeof messageSchema>;

export const Message =
  (mongoose.models.Message as Model<MessageDocument>) ||
  mongoose.model<MessageDocument>("Message", messageSchema);
