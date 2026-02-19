import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { Like } from "@/models/Like";
import { User } from "@/models/User";
import { ProfileUnlock } from "@/models/ProfileUnlock";
import { withApiHandler } from "@/lib/api";

function normalizeIdentity(value?: string | null) {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (!raw) return "";
  if (["male", "man", "men", "m"].includes(raw)) return "male";
  if (["female", "woman", "women", "f"].includes(raw)) return "female";
  if (["other", "non-binary", "nonbinary", "nb"].includes(raw)) return "other";
  if (["all", "everyone", "any", "both"].includes(raw)) return "all";
  return raw;
}

function doesLookingForMatch(lookingFor?: string | null, gender?: string | null) {
  const lf = normalizeIdentity(lookingFor);
  const g = normalizeIdentity(gender);
  if (!lf || lf === "all") return true;
  if (!g) return false;
  return lf === g;
}

function sharedInterestCount(viewerInterests: string[], candidateInterests: string[]) {
  const set = new Set(viewerInterests.map((item) => item.trim().toLowerCase()).filter(Boolean));
  let count = 0;
  for (const interest of candidateInterests || []) {
    if (set.has(String(interest || "").trim().toLowerCase())) count += 1;
  }
  return count;
}

function personalizedRank(viewerId: string, candidateId: string) {
  const seed = `${viewerId}:${candidateId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 33 + seed.charCodeAt(i) * (i + 11)) % 1000003;
  }
  return hash;
}

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const likedIds = await Like.find({ sender: auth.user._id }).distinct("receiver");
    const viewerGender = normalizeIdentity(auth.user.gender);
    const viewerLookingFor = normalizeIdentity(auth.user.lookingFor);
    const viewerInterests = (auth.user.interests || []) as string[];
    const preferenceGenders = (auth.user.preferences?.gender || []).map((value: string) => normalizeIdentity(value));

    const users = await User.find({
      _id: { $nin: [auth.user._id, ...likedIds] },
      accountStatus: "active",
      isVerified: true,
      ...(viewerLookingFor && viewerLookingFor !== "all" ? { gender: viewerLookingFor } : {})
    })
      .select("_id name age gender lookingFor bio photos interests location isOnline createdAt")
      .limit(120);

    const matchedUsers = users.filter((candidate) => {
      const candidateGender = normalizeIdentity(candidate.gender);
      const candidateLookingFor = normalizeIdentity(candidate.lookingFor);

      const viewerWantsCandidate = doesLookingForMatch(viewerLookingFor, candidateGender);
      const candidateWantsViewer = doesLookingForMatch(candidateLookingFor, viewerGender);
      if (!viewerWantsCandidate || !candidateWantsViewer) return false;

      if (preferenceGenders.length > 0 && !preferenceGenders.includes("all")) {
        if (!preferenceGenders.includes(candidateGender)) return false;
      }

      return true;
    });

    // Each viewer gets a unique, deterministic discover ordering.
    matchedUsers.sort((a, b) => {
      const onlineDiff = Number(Boolean(b.isOnline)) - Number(Boolean(a.isOnline));
      if (onlineDiff !== 0) return onlineDiff;

      const interestDiff =
        sharedInterestCount(viewerInterests, (b.interests || []) as string[]) -
        sharedInterestCount(viewerInterests, (a.interests || []) as string[]);
      if (interestDiff !== 0) return interestDiff;

      const aRank = personalizedRank(String(auth.user._id), String(a._id));
      const bRank = personalizedRank(String(auth.user._id), String(b._id));
      return aRank - bRank;
    });

    const unlocks = await ProfileUnlock.find({
      viewerId: auth.user._id,
      profileUserId: { $in: matchedUsers.map((u) => u._id) }
    }).select("profileUserId");

    const unlockedSet = new Set(unlocks.map((entry) => String(entry.profileUserId)));

    const result = matchedUsers.map((user) => {
      const unlocked = unlockedSet.has(String(user._id));
      return {
        ...user.toObject(),
        photos: unlocked ? user.photos : user.photos.slice(0, 1),
        privatePhotosLocked: !unlocked && user.photos.length > 1,
        unlockCost: !unlocked && user.photos.length > 1 ? 70 : 0
      };
    });

    return ok(result);
  });
}
