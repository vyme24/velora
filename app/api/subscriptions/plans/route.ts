import { ok } from "@/lib/http";
import { connectToDatabase } from "@/lib/db";
import { getActiveSubscriptionPlans } from "@/lib/pricing";

export async function GET() {
  await connectToDatabase();
  const plans = await getActiveSubscriptionPlans();

  return ok(
    plans.map((plan) => ({
      id: plan.key,
      key: plan.subscriptionKey,
      label: plan.label,
      badge: plan.badge || "",
      amount: plan.amount,
      currency: plan.currency || "usd"
    }))
  );
}
