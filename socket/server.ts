import { createServer } from "http";
import { Server } from "socket.io";
import { connectToDatabase } from "@/lib/db";
import { verifyAuthToken } from "@/lib/auth";
import { Message } from "@/models/Message";
import { User } from "@/models/User";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL,
    credentials: true
  }
});

const activeUsers = new Map<string, string>();
const messageBuckets = new Map<string, { count: number; resetAt: number }>();

function canSendMessage(userId: string, max = 40, windowMs = 60_000) {
  const now = Date.now();
  const bucket = messageBuckets.get(userId);

  if (!bucket || bucket.resetAt <= now) {
    messageBuckets.set(userId, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) return false;
  bucket.count += 1;
  return true;
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Unauthorized"));
    const payload = verifyAuthToken(token);
    (socket.data as { userId?: string }).userId = payload.userId;
    await connectToDatabase();
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", async (socket) => {
  const userId = (socket.data as { userId?: string }).userId;
  if (!userId) {
    socket.disconnect();
    return;
  }

  activeUsers.set(userId, socket.id);
  socket.join(userId);

  await User.updateOne({ _id: userId }, { $set: { isOnline: true, lastActiveAt: new Date() } });
  io.emit("user_online", { userId });

  socket.on("join_room", ({ roomId }: { roomId: string }) => {
    if (!roomId) return;
    socket.join(roomId);
  });

  socket.on("typing", ({ toUserId }: { toUserId: string }) => {
    if (!toUserId) return;
    socket.to(toUserId).emit("user_typing", { fromUserId: userId });
  });

  socket.on(
    "send_message",
    async (payload: { toUserId: string; message?: string; image?: string; roomId?: string }) => {
      try {
        if (!payload.toUserId) return;
        const content = payload.message?.trim() || "";
        if (!content && !payload.image) return;
        if (content.length > 2000) return;
        if (!canSendMessage(userId)) return;

        const sender = await User.findById(userId).select("blockedUsers");
        const receiver = await User.findById(payload.toUserId).select("blockedUsers");
        if (!sender || !receiver) return;

        const senderBlockedReceiver = sender.blockedUsers.some((id) => String(id) === payload.toUserId);
        const receiverBlockedSender = receiver.blockedUsers.some((id) => String(id) === userId);
        if (senderBlockedReceiver || receiverBlockedSender) return;

        const saved = await Message.create({
          sender: userId,
          receiver: payload.toUserId,
          message: content,
          image: payload.image || "",
          metadata: {
            type: payload.image ? "image" : "text"
          }
        });

        const messageEvent = {
          _id: String(saved._id),
          sender: userId,
          receiver: payload.toUserId,
          message: saved.message,
          image: saved.image,
          createdAt: saved.createdAt
        };

        io.to(payload.toUserId).emit("receive_message", messageEvent);
        socket.emit("receive_message", messageEvent);
      } catch {
        // Ignore individual event failure and keep socket alive.
      }
    }
  );

  socket.on("mark_read", async ({ fromUserId }: { fromUserId: string }) => {
    if (!fromUserId) return;

    await Message.updateMany(
      { sender: fromUserId, receiver: userId, seen: false },
      { $set: { seen: true, seenAt: new Date() } }
    );

    io.to(fromUserId).emit("message_seen", { byUserId: userId });
  });

  socket.on("disconnect", async () => {
    activeUsers.delete(userId);
    await User.updateOne({ _id: userId }, { $set: { isOnline: false, lastActiveAt: new Date() } });
    io.emit("user_offline", { userId });
  });
});

httpServer.listen(4001);
