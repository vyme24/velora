import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { ok } from "@/lib/http";
import { connectToDatabase } from "@/lib/db";
import { requireAuthUser } from "@/lib/require-auth";
import { User } from "@/models/User";
import { Like } from "@/models/Like";
import { ProfileUnlock } from "@/models/ProfileUnlock";
import { withApiHandler } from "@/lib/api";

const PHOTO_UNLOCK_COST = 70;

type Params = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Params) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const profileId = params.id;
    if (!Types.ObjectId.isValid(profileId)) {
      return ok({ profile: null });
    }

    await connectToDatabase();

    const user = await User.findOne({
      _id: profileId,
      accountStatus: "active"
    }).select("_id name age gender lookingFor bio photos interests location isOnline createdAt isVerified");

    if (!user) return ok({ profile: null });

    const isSelf = String(user._id) === String(auth.user._id);
    const unlock = !isSelf
      ? await ProfileUnlock.findOne({ viewerId: auth.user._id, profileUserId: user._id }).select("_id")
      : null;
    const liked = !isSelf
      ? await Like.findOne({ sender: auth.user._id, receiver: user._id }).select("_id")
      : null;

    const privatePhotosLocked = !isSelf && !unlock && user.photos.length > 1;
    const photos = privatePhotosLocked ? user.photos.slice(0, 1) : user.photos;

    return ok({
      profile: {
        _id: String(user._id),
        name: user.name,
        age: user.age,
        gender: user.gender,
        lookingFor: user.lookingFor,
        bio: user.bio || "",
        photos,
        totalPhotos: user.photos.length,
        interests: user.interests || [],
        location: user.location || {},
        isOnline: Boolean(user.isOnline),
        isVerified: Boolean(user.isVerified),
        createdAt: user.createdAt,
        privatePhotosLocked,
        unlockCost: privatePhotosLocked ? PHOTO_UNLOCK_COST : 0,
        likedByViewer: Boolean(liked),
        isSelf
      }
    });
  });
}
