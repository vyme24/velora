import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { ok } from "@/lib/http";
import { User } from "@/models/User";
import { Like } from "@/models/Like";
import { Match } from "@/models/Match";
import { Message } from "@/models/Message";
import { Payment } from "@/models/Payment";

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req, { permission: "view_dashboard" });
  if ("response" in auth) return auth.response;

  const [
    users,
    activeUsers,
    verifiedUsers,
    onlineUsers,
    likes,
    activeMatches,
    messages,
    revenueRows,
    succeededPayments,
    pendingPayments,
    failedPayments,
    goldUsers,
    platinumUsers,
    activeSubscriptions,
    recentUsers,
    recentPayments
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ accountStatus: "active" }),
    User.countDocuments({ isVerified: true }),
    User.countDocuments({ isOnline: true }),
    Like.countDocuments({}),
    Match.countDocuments({ isActive: true }),
    Message.countDocuments({}),
    Payment.aggregate([
      { $match: { status: "succeeded" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" }, totalPayments: { $sum: 1 } } }
    ]),
    Payment.countDocuments({ status: "succeeded" }),
    Payment.countDocuments({ status: "pending" }),
    Payment.countDocuments({ status: "failed" }),
    User.countDocuments({ subscriptionPlan: "gold" }),
    User.countDocuments({ subscriptionPlan: "platinum" }),
    User.countDocuments({ "subscription.status": { $in: ["active", "trialing", "past_due"] } }),
    User.find({})
      .sort({ createdAt: -1 })
      .limit(8)
      .select("name email role subscriptionPlan createdAt"),
    Payment.find({})
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(10)
      .populate("userId", "name email")
      .select("type amount currency status coinsAdded subscriptionPlan paidAt createdAt userId provider")
  ]);

  const metrics = {
    users,
    activeUsers,
    verifiedUsers,
    onlineUsers,
    likes,
    matches: activeMatches,
    messages,
    revenueCents: Number(revenueRows?.[0]?.totalRevenue || 0),
    payments: Number(revenueRows?.[0]?.totalPayments || 0),
    paymentSucceeded: succeededPayments,
    paymentPending: pendingPayments,
    paymentFailed: failedPayments,
    goldUsers,
    platinumUsers,
    activeSubscriptions
  };

  const activityUsers = recentUsers.map((user) => ({
    id: `user_${String(user._id)}`,
    type: "user_registered",
    title: `${user.name} joined`,
    subtitle: user.email,
    at: user.createdAt
  }));

  const activityPayments = recentPayments.map((payment) => {
    const user = payment.userId as unknown as { name?: string; email?: string } | null;
    return {
      id: `payment_${String(payment._id)}`,
      type: payment.type === "subscription" ? "subscription_payment" : "coin_payment",
      title:
        payment.type === "subscription"
          ? `Subscription payment ${payment.subscriptionPlan || ""}`.trim()
          : `Coin payment${payment.coinsAdded ? ` (+${payment.coinsAdded})` : ""}`,
      subtitle: user?.name || user?.email || "Unknown user",
      at: payment.paidAt || payment.createdAt
    };
  });

  const recentActivity = [...activityUsers, ...activityPayments]
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime())
    .slice(0, 12);

  return ok({
    metrics,
    recentUsers,
    recentPayments,
    recentActivity
  });
}
