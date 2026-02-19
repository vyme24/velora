import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { ok } from "@/lib/http";
import { EmailLog } from "@/models/EmailLog";

const allowedStatuses = new Set(["sent", "skipped", "failed"]);

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req, { permission: "manage_settings" });
  if ("response" in auth) return auth.response;

  const status = (req.nextUrl.searchParams.get("status") || "all").toLowerCase();
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  const filter: Record<string, unknown> = {};
  if (allowedStatuses.has(status)) filter.status = status;

  const logs = await EmailLog.find(filter).sort({ createdAt: -1 }).limit(200);
  const items = logs
    .map((log) => ({
      id: String(log._id),
      to: log.to,
      subject: log.subject,
      status: log.status,
      provider: log.provider,
      messageId: log.messageId || null,
      errorMessage: log.errorMessage || null,
      createdAt: log.createdAt
    }))
    .filter((item) => {
      if (!q) return true;
      const hay = `${item.to} ${item.subject} ${item.status} ${item.provider} ${item.messageId || ""} ${item.errorMessage || ""}`.toLowerCase();
      return hay.includes(q);
    });

  return ok({ items, actorRole: auth.actor.role });
}
