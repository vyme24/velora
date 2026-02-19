import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { fail, ok } from "@/lib/http";
import { withApiHandler } from "@/lib/api";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { Message } from "@/models/Message";
import { User } from "@/models/User";

function pickReply(input: string, targetName: string) {
  const text = input.toLowerCase();

  if (text.includes("hello") || text.includes("hi") || text.includes("hey")) {
    return `Hey! Nice to hear from you 😊 What are you doing tonight, ${targetName}?`;
  }
  if (text.includes("date") || text.includes("meet")) {
    return "That sounds fun. I like chill vibes first, maybe coffee and a walk ☕";
  }
  if (text.includes("photo") || text.includes("pic")) {
    return "I can share more in chat. Tell me what kind of photos you like most 👀";
  }
  if (text.includes("movie") || text.includes("music")) {
    return "Great taste. I am into late-night playlists and cozy movie nights 🎬";
  }
  if (text.includes("where") || text.includes("city")) {
    return "I am nearby. We should keep chatting and see if we vibe first ✨";
  }

  const fallbacks = [
    "You have good energy. Tell me one thing you are passionate about.",
    "I like your message. What do you usually do on weekends?",
    "You seem interesting. What are you looking for here?"
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async () => {
    if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const body = (await req.json().catch(() => ({}))) as {
      receiverId?: string;
      sourceMessage?: string;
    };

    const receiverId = String(body.receiverId || "");
    if (!receiverId || !Types.ObjectId.isValid(receiverId)) {
      return fail("receiverId is required", 422);
    }

    const receiver = await User.findById(receiverId).select("_id name accountStatus");
    if (!receiver || receiver.accountStatus === "deactivated") {
      return fail("Receiver not found", 404);
    }

    const replyText = pickReply(String(body.sourceMessage || ""), auth.user.name || "there");

    const reply = await Message.create({
      sender: receiver._id,
      receiver: auth.user._id,
      message: replyText,
      metadata: {
        type: "text",
        requiresCoins: false,
        consumedCoins: 0,
        autoReply: true
      }
    });

    return ok(reply, { status: 201 });
  });
}

