import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { withApiHandler } from "@/lib/api";
import { requireAuthUser } from "@/lib/require-auth";
import { Message } from "@/models/Message";

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const [count, byUser] = await Promise.all([
      Message.countDocuments({ receiver: auth.user._id, seen: false }),
      Message.aggregate([
        { $match: { receiver: auth.user._id, seen: false } },
        { $group: { _id: "$sender", count: { $sum: 1 } } }
      ])
    ]);

    return ok({
      count,
      byUser: byUser.map((entry) => ({ userId: String(entry._id), count: Number(entry.count || 0) }))
    });
  });
}

