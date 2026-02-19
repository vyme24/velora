import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/require-auth";
import { fail, ok } from "@/lib/http";
import { getSystemSettings } from "@/lib/app-settings";
import { PasskeyCredential } from "@/models/PasskeyCredential";
import { verifyCsrf } from "@/lib/csrf";

const createSchema = z.object({
  credentialId: z.string().min(8),
  publicKey: z.string().min(8),
  label: z.string().max(80).optional(),
  transports: z.array(z.string()).optional()
});

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const settings = await getSystemSettings();
  const passkeys = await PasskeyCredential.find({ userId: auth.user._id })
    .sort({ createdAt: -1 })
    .select("_id credentialId label transports lastUsedAt createdAt");

  return ok({ enabled: settings.passkeyEnabled, passkeys });
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const settings = await getSystemSettings();
  if (!settings.passkeyEnabled) return fail("Passkey feature is disabled", 403);

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const exists = await PasskeyCredential.findOne({ credentialId: parsed.data.credentialId });
  if (exists) return fail("Credential already registered", 409);

  const created = await PasskeyCredential.create({
    userId: auth.user._id,
    credentialId: parsed.data.credentialId,
    publicKey: parsed.data.publicKey,
    label: parsed.data.label || "My device",
    transports: parsed.data.transports || []
  });

  return ok({ passkey: created }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return fail("id is required", 422);

  const deleted = await PasskeyCredential.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!deleted) return fail("Passkey not found", 404);

  return ok({ deleted: true });
}

