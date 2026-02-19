import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { Match } from "@/models/Match";
import { withApiHandler } from "@/lib/api";

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const matches = await Match.find({
      $or: [{ user1: auth.user._id }, { user2: auth.user._id }],
      isActive: true
    })
      .populate("user1", "name age photos interests location isOnline")
      .populate("user2", "name age photos interests location isOnline")
      .sort({ matchedAt: -1 })
      .limit(200);

    return ok(matches);
  });
}
