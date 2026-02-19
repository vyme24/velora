import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { ok } from "@/lib/http";
import { User } from "@/models/User";
import { Like } from "@/models/Like";
import { Match } from "@/models/Match";
import { Message } from "@/models/Message";
import { Payment } from "@/models/Payment";

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if ("response" in auth) return auth.response;

  const [users, likes, activeMatches, messages, revenueRows, succeededPayments] = await Promise.all([
    User.countDocuments({}),
    Like.countDocuments({}),
    Match.countDocuments({ isActive: true }),
    Message.countDocuments({}),
    Payment.aggregate([
      { $match: { status: "succeeded" } },
      { $group: { _id: null, totalRevenue: { $sum: "$amount" }, totalPayments: { $sum: 1 } } }
    ]),
    Payment.find({ status: "succeeded" })
      .sort({ paidAt: -1, createdAt: -1 })
      .limit(8)
      .select("type amount currency status coinsAdded subscriptionPlan paidAt createdAt")
  ]);

  const metrics = {
    users,
    likes,
    matches: activeMatches,
    messages,
    revenueCents: Number(revenueRows?.[0]?.totalRevenue || 0),
    payments: Number(revenueRows?.[0]?.totalPayments || 0)
  };

  return ok({
    metrics,
    recentPayments: succeededPayments
  });
}

