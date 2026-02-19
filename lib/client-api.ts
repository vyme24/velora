function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const token = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`))
    ?.split("=")[1];
  return token ? decodeURIComponent(token) : null;
}

function buildHeaders(init?: HeadersInit, includeCsrf = false) {
  const headers = new Headers(init || {});
  if (includeCsrf) {
    const csrf = readCookie("velora_csrf");
    if (csrf) headers.set("x-csrf-token", csrf);
  }
  return headers;
}

export function triggerCoinModal(reason?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("velora:coin-required", { detail: { reason } }));
}

export function triggerCoinSync(coins?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("velora:coin-sync", { detail: { coins } }));
}

export function triggerAuthModal(reason?: string, mode?: "login" | "join") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("velora:auth-required", { detail: { reason, mode } }));
}

function shouldSkipAuthModal(input: RequestInfo | URL) {
  const value = typeof input === "string" ? input : input.toString();
  return (
    value.includes("/api/auth/login") ||
    value.includes("/api/auth/register") ||
    value.includes("/api/auth/verify-otp") ||
    value.includes("/api/auth/forgot-password") ||
    value.includes("/api/auth/reset-password")
  );
}

async function maybeTriggerCoinModal(response: Response) {
  if (response.status !== 402 || typeof window === "undefined") return;

  let reason = "Insufficient coins";
  try {
    const cloned = response.clone();
    const json = await cloned.json();
    if (json?.message) reason = json.message;
  } catch {
    // noop
  }

  triggerCoinModal(reason);
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit & { includeCsrf?: boolean; retryOn401?: boolean }
) {
  const response = await fetch(input, {
    ...init,
    headers: buildHeaders(init?.headers, Boolean(init?.includeCsrf))
  });

  if (response.status === 401 && init?.retryOn401 !== false) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      const retried = await fetch(input, {
        ...init,
        headers: buildHeaders(init?.headers, Boolean(init?.includeCsrf))
      });
      await maybeTriggerCoinModal(retried);
      return retried;
    }

    if (!shouldSkipAuthModal(input)) {
      triggerAuthModal("Please log in or create an account to continue.");
    }
  }

  if (response.status === 401 && !shouldSkipAuthModal(input)) {
    triggerAuthModal("Please log in or create an account to continue.");
  }

  await maybeTriggerCoinModal(response);
  return response;
}
