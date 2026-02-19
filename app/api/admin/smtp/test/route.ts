import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { requireAdminActor } from "@/lib/admin-auth";
import { sendSmtpTestEmail } from "@/lib/email";

const schema = z.object({
  to: z.string().email().optional()
});

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

  const auth = await requireAdminActor(req, { permission: "manage_settings" });
  if ("response" in auth) return auth.response;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const to = (parsed.data.to || auth.actor.email || "").trim().toLowerCase();
  if (!to) return fail("Recipient email is required", 422);

  try {
    const result = await sendSmtpTestEmail(to);
    return ok({ delivered: true, to, messageId: result.messageId || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMTP test failed";
    return fail(`SMTP test failed: ${message}`, 422);
  }
}

