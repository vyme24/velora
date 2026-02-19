import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { updateMeSchema } from "@/lib/validations/profile";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const user = auth.user;

  return ok({
    userId: String(user._id),
    name: user.name,
    email: user.email,
    username: user.username || "",
    age: user.age,
    gender: user.gender,
    lookingFor: user.lookingFor,
    bio: user.bio || "",
    photos: user.photos || [],
    interests: user.interests || [],
    location: {
      city: user.location?.city || "",
      state: user.location?.state || "",
      country: user.location?.country || "",
      radiusKm: user.location?.radiusKm ?? 50
    },
    preferences: {
      minAge: user.preferences?.minAge ?? 18,
      maxAge: user.preferences?.maxAge ?? 40,
      gender: user.preferences?.gender || [],
      verifiedOnly: Boolean(user.preferences?.verifiedOnly),
      onlineOnly: Boolean(user.preferences?.onlineOnly),
      premiumOnly: Boolean(user.preferences?.premiumOnly)
    },
    notifications: {
      emailMessages: user.notifications?.emailMessages ?? true,
      emailMatches: user.notifications?.emailMatches ?? true,
      emailPromotions: user.notifications?.emailPromotions ?? false,
      pushMessages: user.notifications?.pushMessages ?? true,
      pushMatches: user.notifications?.pushMatches ?? true
    },
    privacy: {
      showOnlineStatus: user.privacy?.showOnlineStatus ?? true,
      showDistance: user.privacy?.showDistance ?? true,
      incognito: user.privacy?.incognito ?? false
    },
    isVerified: Boolean(user.isVerified),
    coins: user.coins,
    subscriptionPlan: user.subscriptionPlan
  });
}

export async function PATCH(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = updateMeSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const data = parsed.data;
  const user = auth.user;

  if (data.name !== undefined) user.name = data.name.trim();
  if (data.username !== undefined) user.username = data.username.trim().toLowerCase();
  if (data.age !== undefined) user.age = data.age;
  if (data.gender !== undefined) user.gender = data.gender.trim();
  if (data.lookingFor !== undefined) user.lookingFor = data.lookingFor.trim();
  if (data.bio !== undefined) user.bio = data.bio.trim();

  if (data.photos !== undefined) {
    user.photos = data.photos.map((photo) => photo.trim()).filter(Boolean).slice(0, 6);
  }

  if (data.interests !== undefined) {
    user.interests = data.interests
      .map((interest) => interest.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  if (data.location) {
    user.location = {
      ...(user.location || {}),
      city: data.location.city ?? user.location?.city ?? "",
      state: data.location.state ?? user.location?.state ?? "",
      country: data.location.country ?? user.location?.country ?? "",
      radiusKm: data.location.radiusKm ?? user.location?.radiusKm ?? 50,
      coordinates: user.location?.coordinates || [0, 0]
    };
  }

  if (data.preferences) {
    user.preferences = {
      ...(user.preferences || {}),
      minAge: data.preferences.minAge ?? user.preferences?.minAge ?? 18,
      maxAge: data.preferences.maxAge ?? user.preferences?.maxAge ?? 40,
      gender: data.preferences.gender ?? user.preferences?.gender ?? [],
      verifiedOnly: data.preferences.verifiedOnly ?? Boolean(user.preferences?.verifiedOnly),
      onlineOnly: data.preferences.onlineOnly ?? Boolean(user.preferences?.onlineOnly),
      premiumOnly: data.preferences.premiumOnly ?? Boolean(user.preferences?.premiumOnly)
    };
  }

  if (data.notifications) {
    user.notifications = {
      ...(user.notifications || {}),
      emailMessages: data.notifications.emailMessages ?? user.notifications?.emailMessages ?? true,
      emailMatches: data.notifications.emailMatches ?? user.notifications?.emailMatches ?? true,
      emailPromotions: data.notifications.emailPromotions ?? user.notifications?.emailPromotions ?? false,
      pushMessages: data.notifications.pushMessages ?? user.notifications?.pushMessages ?? true,
      pushMatches: data.notifications.pushMatches ?? user.notifications?.pushMatches ?? true
    };
  }

  if (data.privacy) {
    user.privacy = {
      ...(user.privacy || {}),
      showOnlineStatus: data.privacy.showOnlineStatus ?? user.privacy?.showOnlineStatus ?? true,
      showDistance: data.privacy.showDistance ?? user.privacy?.showDistance ?? true,
      incognito: data.privacy.incognito ?? user.privacy?.incognito ?? false
    };
  }

  if ((user.preferences?.minAge || 18) > (user.preferences?.maxAge || 40)) {
    return fail("Preference min age cannot be greater than max age", 422);
  }

  if (user.username) {
    const existing = await User.findOne({
      _id: { $ne: user._id },
      username: user.username
    });
    if (existing) return fail("Username is already taken", 409);
  }

  await user.save();

  return ok({ updated: true });
}
