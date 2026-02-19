import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { connectToDatabase } from "@/lib/db";
import { runInternalSubscriptionRenewals } from "@/lib/subscriptions";
import { requireAdminActor } from "@/lib/admin-auth";

function isCronAuthorized(req: NextRequest) {
  const token = req.headers.get("x-internal-cron-token");
  const expected = process.env.INTERNAL_CRON_TOKEN;
  return Boolean(expected && token && token === expected);
}

export async function POST(req: NextRequest) {
  const byCron = isCronAuthorized(req);
  if (!byCron) {
    const auth = await requireAdminActor(req, { permission: "manage_pricing" });
    if ("response" in auth) return auth.response;
  }

  await connectToDatabase();
  const result = await runInternalSubscriptionRenewals();
  return ok(result);
}

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return fail("Unauthorized", 401);
  await connectToDatabase();
  const result = await runInternalSubscriptionRenewals();
  return ok(result);
}
