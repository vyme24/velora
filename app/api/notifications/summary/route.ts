import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { withApiHandler } from "@/lib/api";
import { requireAuthUser } from "@/lib/require-auth";
import { Message } from "@/models/Message";
import { Like } from "@/models/Like";
import { Match } from "@/models/Match";

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const userId = auth.user._id;

    const [unreadMessages, likes, matches] = await Promise.all([
      Message.countDocuments({ receiver: userId, seen: false }),
      Like.find({ receiver: userId })
        .populate("sender", "_id name photos")
        .sort({ createdAt: -1 })
        .limit(8),
      Match.find({
        $or: [{ user1: userId }, { user2: userId }],
        isActive: true
      })
        .populate("user1", "_id name photos")
        .populate("user2", "_id name photos")
        .sort({ matchedAt: -1 })
        .limit(8)
    ]);

    const recentLikes = likes.map((entry) => ({
      _id: String(entry._id),
      createdAt: entry.createdAt,
      user: entry.sender
    }));

    const recentMatches = matches.map((entry) => {
      const isUser1 = String(entry.user1?._id) === String(userId);
      const other = isUser1 ? entry.user2 : entry.user1;
      return {
        _id: String(entry._id),
        matchedAt: entry.matchedAt,
        user: other
      };
    });

    return ok({
      unreadMessages: Number(unreadMessages || 0),
      recentLikes,
      recentMatches
    });
  });
}

