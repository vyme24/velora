import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { getAccessToken } from "@/lib/session";
import { verifyAuthToken } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { getPermissionsForActor } from "@/lib/admin-roles";

export async function GET(req: NextRequest) {
  const token = getAccessToken(req);
  if (!token) return fail("Unauthorized", 401);

  try {
    const payload = verifyAuthToken(token);
    await connectToDatabase();

    const user = await User.findById(payload.userId).select(
      "_id name email role staffRoleKey accountStatus isVerified coins subscriptionPlan photos subscription"
    );
    if (!user) return fail("Unauthorized", 401);
    if (user.accountStatus !== "active") return fail("Account is not active", 403);

    const permissionInfo = await getPermissionsForActor({
      role: user.role,
      staffRoleKey: user.staffRoleKey || null
    });

    return ok({
      userId: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      staffRoleKey: permissionInfo.staffRoleKey,
      staffRoleName: permissionInfo.staffRoleName,
      permissions: permissionInfo.permissions,
      isVerified: user.isVerified,
      coins: user.coins,
      subscriptionPlan: user.subscriptionPlan,
      subscription: {
        status: user.subscription?.status || "none",
        cancelAtPeriodEnd: Boolean(user.subscription?.cancelAtPeriodEnd),
        currentPeriodEnd: user.subscription?.currentPeriodEnd || null
      },
      photos: user.photos || []
    });
  } catch {
    return fail("Unauthorized", 401);
  }
}
