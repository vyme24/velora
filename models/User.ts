import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },
    dob: { type: Date, default: null },
    age: { type: Number, required: true, min: 18 },
    gender: { type: String, required: true },
    lookingFor: { type: String, required: true },
    username: { type: String, lowercase: true, trim: true, sparse: true, unique: true, index: true },
    bio: { type: String, default: "", maxlength: 800 },
    photos: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    location: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
      state: { type: String, default: "" },
      radiusKm: { type: Number, min: 1, max: 500, default: 50 },
      coordinates: {
        type: [Number],
        index: "2dsphere",
        default: [0, 0]
      }
    },
    preferences: {
      minAge: { type: Number, min: 18, default: 18 },
      maxAge: { type: Number, max: 99, default: 40 },
      gender: { type: [String], default: [] },
      verifiedOnly: { type: Boolean, default: false },
      onlineOnly: { type: Boolean, default: false },
      premiumOnly: { type: Boolean, default: false }
    },
    notifications: {
      emailMessages: { type: Boolean, default: true },
      emailMatches: { type: Boolean, default: true },
      emailPromotions: { type: Boolean, default: false },
      pushMessages: { type: Boolean, default: true },
      pushMatches: { type: Boolean, default: true }
    },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      showDistance: { type: Boolean, default: true },
      incognito: { type: Boolean, default: false }
    },
    isVerified: { type: Boolean, default: false, index: true },
    verification: {
      emailOtpVerifiedAt: { type: Date, default: null },
      photoVerifiedAt: { type: Date, default: null },
      badgeLevel: {
        type: String,
        enum: ["none", "basic", "trusted"],
        default: "none"
      }
    },
    coins: { type: Number, default: 0 },
    freeMessageQuota: { type: Number, default: 5 },
    boostsAvailable: { type: Number, default: 0 },
    lastBoostAt: { type: Date, default: null },
    subscriptionPlan: {
      type: String,
      enum: ["free", "gold", "platinum"],
      default: "free",
      index: true
    },
    subscription: {
      provider: { type: String, enum: ["stripe", "razorpay"], default: null },
      status: {
        type: String,
        enum: [
          "none",
          "active",
          "past_due",
          "canceled",
          "incomplete",
          "incomplete_expired",
          "trialing",
          "unpaid",
          "paused"
        ],
        default: "none",
        index: true
      },
      stripeCustomerId: { type: String, default: null, index: true },
      stripeSubscriptionId: { type: String, default: null, index: true },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      cancelAtPeriodEnd: { type: Boolean, default: false }
    },
    vip: {
      enabled: { type: Boolean, default: false, index: true },
      status: {
        type: String,
        enum: [
          "none",
          "active",
          "past_due",
          "canceled",
          "incomplete",
          "incomplete_expired",
          "trialing",
          "unpaid",
          "paused"
        ],
        default: "none"
      },
      bonusPercent: { type: Number, default: 15 },
      stripeCustomerId: { type: String, default: null, index: true },
      stripeSubscriptionId: { type: String, default: null, index: true },
      packageId: { type: String, default: null },
      monthlyAmount: { type: Number, default: 0 },
      monthlyCoins: { type: Number, default: 0 },
      currentPeriodStart: { type: Date, default: null },
      currentPeriodEnd: { type: Date, default: null },
      cancelAtPeriodEnd: { type: Boolean, default: false }
    },
    isOnline: { type: Boolean, default: false, index: true },
    lastActiveAt: { type: Date, default: null },
    blockedByCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
      index: true
    },
    accountStatus: {
      type: String,
      enum: ["active", "deactivated", "disabled"],
      default: "active",
      index: true
    },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

userSchema.index({ gender: 1, lookingFor: 1, age: 1 });
userSchema.index({ isOnline: 1, isVerified: 1, subscriptionPlan: 1 });

export type UserDocument = InferSchemaType<typeof userSchema>;

export const User =
  (mongoose.models.User as Model<UserDocument>) || mongoose.model<UserDocument>("User", userSchema);
