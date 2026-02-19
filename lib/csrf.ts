import { NextRequest } from "next/server";
import { randomBytes } from "crypto";

export const CSRF_COOKIE_NAME = "velora_csrf";

export function generateCsrfToken() {
  return randomBytes(24).toString("hex");
}

export function verifyCsrf(req: NextRequest) {
  const cookieToken = req.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = req.headers.get("x-csrf-token");
  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}
