import { fail } from "@/lib/http";

export async function POST() {
  return fail("Stripe portal is disabled. Manage subscription directly in Settings.", 410);
}
