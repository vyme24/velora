import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/http";

const GOOGLE_OAUTH_STATE_COOKIE = "velora_google_oauth_state";

function getGoogleConfig(origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
  if (!clientId) return null;
  return { clientId, redirectUri };
}

export async function GET(req: NextRequest) {
  const config = getGoogleConfig(req.nextUrl.origin);
  if (!config) return fail("Google auth not configured", 500);

  const state = randomBytes(24).toString("hex");
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account"
  });

  const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10
  });
  return response;
}

