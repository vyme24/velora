import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { User } from "@/models/User";
import { adminUpdateUserSchema } from "@/lib/validations/admin";
import { verifyCsrf } from "@/lib/csrf";
import { Like } from "@/models/Like";
import { Match } from "@/models/Match";
import { Message } from "@/models/Message";
import { Swipe } from "@/models/Swipe";
import { ProfileUnlock } from "@/models/ProfileUnlock";
import { Report } from "@/models/Report";
import { Payment } from "@/models/Payment";
import { Transaction } from "@/models/Transaction";
import { GiftTransaction } from "@/models/GiftTransaction";
import { OtpCode } from "@/models/OtpCode";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { PasskeyCredential } from "@/models/PasskeyCredential";
import { CoinLedger } from "@/models/CoinLedger";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { permission: "manage_users" });
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = adminUpdateUserSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const target = await User.findById(params.id);
  if (!target) return fail("User not found", 404);
  if (target.role !== "user") return fail("Use Staff & Access for admin accounts", 422);

  const actor = auth.actor;

  if (parsed.data.role && actor.role !== "super_admin") {
    return fail("Only super admin can change roles", 403);
  }

  if (String(target._id) === String(actor._id) && parsed.data.accountStatus && parsed.data.accountStatus !== "active") {
    return fail("Cannot deactivate/disable yourself", 422);
  }

  if (parsed.data.name !== undefined) target.name = parsed.data.name;
  if (parsed.data.role !== undefined) target.role = parsed.data.role;
  if (parsed.data.accountStatus !== undefined) target.accountStatus = parsed.data.accountStatus;
  if (parsed.data.isVerified !== undefined) target.isVerified = parsed.data.isVerified;
  if (parsed.data.subscriptionPlan !== undefined) {
    target.subscriptionPlan = parsed.data.subscriptionPlan;
    if (parsed.data.subscriptionPlan === "free") {
      target.subscription = {
        provider: "internal",
        status: "none",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyAmount: 0,
        currency: "usd",
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false
      };
    }
  }
  if (parsed.data.subscriptionStatus !== undefined) {
    target.subscription = {
      provider: "internal",
      status: parsed.data.subscriptionStatus,
      stripeCustomerId: target.subscription?.stripeCustomerId || null,
      stripeSubscriptionId: target.subscription?.stripeSubscriptionId || null,
      monthlyAmount: target.subscription?.monthlyAmount || 0,
      currency: target.subscription?.currency || "usd",
      currentPeriodStart: target.subscription?.currentPeriodStart || null,
      currentPeriodEnd: target.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: target.subscription?.cancelAtPeriodEnd || false
    };
  }

  await target.save();

  return ok({
    _id: target._id,
    name: target.name,
    email: target.email,
    role: target.role,
    accountStatus: target.accountStatus,
    isVerified: target.isVerified,
    subscriptionPlan: target.subscriptionPlan,
    subscriptionStatus: target.subscription?.status || "none"
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { permission: "manage_users" });
  if ("response" in auth) return auth.response;

  const target = await User.findById(params.id);
  if (!target) return fail("User not found", 404);
  if (target.role !== "user") return fail("Use Staff & Access for admin accounts", 422);

  if (String(target._id) === String(auth.actor._id)) {
    return fail("Cannot delete yourself", 422);
  }

  const userId = target._id;

  await Promise.all([
    Like.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }),
    Match.deleteMany({ $or: [{ user1: userId }, { user2: userId }, { initiatedBy: userId }] }),
    Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }),
    Swipe.deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] }),
    ProfileUnlock.deleteMany({ $or: [{ viewerId: userId }, { profileUserId: userId }] }),
    Report.deleteMany({ $or: [{ reporterId: userId }, { reportedId: userId }, { reviewedBy: userId }] }),
    Payment.deleteMany({ userId }),
    Transaction.deleteMany({ userId }),
    GiftTransaction.deleteMany({ $or: [{ senderId: userId }, { receiverId: userId }] }),
    OtpCode.deleteMany({ userId }),
    PasswordResetToken.deleteMany({ userId }),
    PasskeyCredential.deleteMany({ userId }),
    CoinLedger.deleteMany({ userId }),
    User.updateMany({ blockedUsers: userId }, { $pull: { blockedUsers: userId } })
  ]);

  await User.deleteOne({ _id: userId });

  return ok({ deleted: true, hardDeleted: true });
}
