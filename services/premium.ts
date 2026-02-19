import { fail } from "@/lib/http";
import { User } from "@/models/User";

export async function requirePremium(userId: string) {
  const user = await User.findById(userId).select("subscriptionPlan");
  if (!user) return { response: fail("Unauthorized", 401) };
  if (user.subscriptionPlan === "free") return { response: fail("Premium plan required", 403) };
  return { user };
}
