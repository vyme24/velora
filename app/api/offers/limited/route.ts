import { connectToDatabase } from "@/lib/db";
import { ok } from "@/lib/http";
import { getLimitedOfferSettings } from "@/lib/app-settings";

export async function GET() {
  await connectToDatabase();
  const offer = await getLimitedOfferSettings();
  return ok(offer);
}

