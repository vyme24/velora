import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeJwtPayload(token: string): { role?: string } | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const payload = JSON.parse(json) as { role?: string };
    return payload;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAppRoute = pathname.startsWith("/app");
  if (!isAdminRoute && !isAppRoute) return NextResponse.next();

  const token = req.cookies.get("velora_token")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/?auth=1", req.url));
  }

  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return NextResponse.redirect(new URL("/?auth=1", req.url));
    if (isAdminRoute && payload.role !== "admin" && payload.role !== "super_admin") {
      return NextResponse.redirect(new URL("/?auth=1", req.url));
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/?auth=1", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/app/:path*"]
};
