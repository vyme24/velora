import { NextResponse } from "next/server";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ success: true, data }, init);
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status });
}
