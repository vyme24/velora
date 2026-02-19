import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { generateSecureToken, hashPassword, signAuthToken, signRefreshToken } from "@/lib/auth";
import { setAuthCookies } from "@/lib/session";
import { User } from "@/models/User";

const GOOGLE_OAUTH_STATE_COOKIE = "velora_google_oauth_state";

type GoogleTokenResponse = {
  access_token: string;
};

type GoogleUserInfo = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

function getGoogleConfig(origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

function sanitizeUsername(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
}

function authErrorRedirect(req: NextRequest, reason: string) {
  return NextResponse.redirect(new URL(`/?auth=1&auth_error=${encodeURIComponent(reason)}`, req.url));
}

async function exchangeCodeForToken(code: string, cfg: NonNullable<ReturnType<typeof getGoogleConfig>>) {
  const body = new URLSearchParams({
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!response.ok) return null;
  return (await response.json()) as GoogleTokenResponse;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) return null;
  return (await response.json()) as GoogleUserInfo;
}

export async function GET(req: NextRequest) {
  const config = getGoogleConfig(req.nextUrl.origin);
  if (!config) return authErrorRedirect(req, "google_not_configured");

  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) return authErrorRedirect(req, oauthError);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const stateCookie = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) return authErrorRedirect(req, "google_state_mismatch");

  const token = await exchangeCodeForToken(code, config);
  if (!token?.access_token) return authErrorRedirect(req, "google_token_exchange_failed");

  const profile = await fetchGoogleProfile(token.access_token);
  const email = profile?.email?.toLowerCase().trim();
  if (!email) return authErrorRedirect(req, "google_email_missing");
  if (!profile?.email_verified) return authErrorRedirect(req, "google_email_not_verified");

  await connectToDatabase();
  let user = await User.findOne({ email });

  if (!user) {
    const rawName = profile?.name?.trim() || email.split("@")[0];
    const usernameBase = sanitizeUsername(rawName || email);
    let username = `${usernameBase || "user"}${Math.floor(Math.random() * 9000 + 1000)}`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await User.exists({ username });
      if (!exists) break;
      username = `${usernameBase || "user"}${Math.floor(Math.random() * 9000 + 1000)}`;
    }
    const randomPassword = await hashPassword(generateSecureToken(20));

    user = await User.create({
      name: rawName,
      email,
      password: randomPassword,
      dob: new Date("2003-01-01"),
      age: 21,
      gender: "other",
      lookingFor: "all",
      username,
      isVerified: true,
      role: "user",
      accountStatus: "active",
      bio: "",
      photos: profile?.picture ? [profile.picture] : [],
      interests: [],
      location: {
        city: "",
        country: "",
        state: "",
        radiusKm: 50,
        coordinates: [0, 0]
      },
      verification: {
        emailOtpVerifiedAt: new Date(),
        photoVerifiedAt: null,
        badgeLevel: "basic"
      }
    });
  } else {
    if (user.accountStatus !== "active") {
      return authErrorRedirect(req, "account_not_active");
    }

    const updates: Record<string, unknown> = {
      isVerified: true,
      "verification.emailOtpVerifiedAt": user.verification?.emailOtpVerifiedAt || new Date()
    };
    if ((!user.photos || user.photos.length === 0) && profile?.picture) {
      updates.photos = [profile.picture];
    }
    if (!user.name && profile?.name) {
      updates.name = profile.name;
    }
    await User.updateOne({ _id: user._id }, { $set: updates });
  }

  const accessToken = signAuthToken({ userId: String(user._id), role: user.role });
  const refreshToken = signRefreshToken({ userId: String(user._id), role: user.role });

  const response = NextResponse.redirect(new URL("/app/discover", req.url));
  setAuthCookies(response, { accessToken, refreshToken });
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return response;
}
