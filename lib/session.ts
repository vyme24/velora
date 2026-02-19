import { NextRequest, NextResponse } from "next/server";
import { CSRF_COOKIE_NAME, generateCsrfToken } from "@/lib/csrf";

export const ACCESS_COOKIE = "velora_token";
export const REFRESH_COOKIE = "velora_refresh_token";

function commonCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/"
  };
}

export function setAuthCookies(response: NextResponse, tokens: { accessToken: string; refreshToken: string }) {
  response.cookies.set(ACCESS_COOKIE, tokens.accessToken, {
    ...commonCookieOptions(),
    maxAge: 60 * 30
  });

  response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, {
    ...commonCookieOptions(),
    maxAge: 60 * 60 * 24 * 30
  });

  response.cookies.set(CSRF_COOKIE_NAME, generateCsrfToken(), {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...commonCookieOptions(), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...commonCookieOptions(), maxAge: 0 });
  response.cookies.set(CSRF_COOKIE_NAME, "", {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export function getAccessToken(req: NextRequest) {
  return req.cookies.get(ACCESS_COOKIE)?.value || null;
}

export function getRefreshToken(req: NextRequest) {
  return req.cookies.get(REFRESH_COOKIE)?.value || null;
}
