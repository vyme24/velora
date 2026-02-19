import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { ok } from "@/lib/http";
import { withApiHandler } from "@/lib/api";
import { requireAuthUser } from "@/lib/require-auth";
import { Message } from "@/models/Message";

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const meId = new Types.ObjectId(String(auth.user._id));

    const rows = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: meId }, { receiver: meId }]
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: [{ $eq: ["$sender", meId] }, "$receiver", "$sender"]
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$otherUser",
          lastMessage: { $first: "$message" },
          lastMessageAt: { $first: "$createdAt" },
          lastSender: { $first: "$sender" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                photos: 1,
                isOnline: 1,
                accountStatus: 1
              }
            }
          ]
        }
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "messages",
          let: { otherId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$sender", "$$otherId"] },
                    { $eq: ["$receiver", meId] },
                    { $eq: ["$seen", false] }
                  ]
                }
              }
            },
            { $count: "count" }
          ],
          as: "unreadRows"
        }
      },
      {
        $addFields: {
          unreadCount: {
            $ifNull: [{ $arrayElemAt: ["$unreadRows.count", 0] }, 0]
          }
        }
      },
      {
        $project: {
          _id: 0,
          userId: "$user._id",
          name: "$user.name",
          image: { $ifNull: [{ $arrayElemAt: ["$user.photos", 0] }, "/profiles/ava.svg"] },
          online: { $ifNull: ["$user.isOnline", false] },
          accountStatus: "$user.accountStatus",
          lastMessage: { $ifNull: ["$lastMessage", ""] },
          lastMessageAt: "$lastMessageAt",
          unreadCount: "$unreadCount"
        }
      },
      { $match: { accountStatus: { $ne: "deactivated" } } },
      { $sort: { lastMessageAt: -1 } },
      { $limit: 100 }
    ]);

    return ok({
      items: rows.map((row) => ({
        userId: String(row.userId),
        name: row.name || "Unknown",
        image: row.image || "/profiles/ava.svg",
        online: Boolean(row.online),
        lastMessage: row.lastMessage || "",
        lastMessageAt: row.lastMessageAt || null,
        unreadCount: Number(row.unreadCount || 0)
      }))
    });
  });
}
