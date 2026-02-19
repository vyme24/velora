import { NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/http";

export async function withApiHandler(
  _req: NextRequest,
  fn: () => Promise<NextResponse | Response | undefined>
): Promise<NextResponse> {
  try {
    const response = await fn();
    if (!response) return fail("No response generated", 500);
    return response as NextResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return fail(message, 500);
  }
}
