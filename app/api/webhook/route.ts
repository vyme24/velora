import type { NextRequest } from "next/server";
import { POST as stripeWebhookPost } from "@/app/api/stripe/webhook/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return stripeWebhookPost(req);
}

export async function GET() {
  return new Response("Webhook endpoint ready", { status: 200 });
}
