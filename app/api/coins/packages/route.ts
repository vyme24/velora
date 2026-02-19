import { ok } from "@/lib/http";
import { connectToDatabase } from "@/lib/db";
import { getActiveCoinPackages } from "@/lib/pricing";

export async function GET() {
  await connectToDatabase();
  const plans = await getActiveCoinPackages();
  const packages = plans.map((plan) => ({
    id: plan.key,
    coins: plan.coins || 0,
    amount: plan.amount,
    currency: (plan.currency || "usd").toUpperCase(),
    label: plan.label || "",
    badge: plan.badge || "",
    extra: plan.extra || 0
  }));

  return ok(packages);
}
