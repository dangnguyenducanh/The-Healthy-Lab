// Browser-side API client. Calls go to /api on this origin (proxied to FastAPI); the session lives
// in httpOnly cookies the API sets, so no token is ever handled here. Every request carries
// X-Requested-With: fetch, which the API requires on cookie-authenticated writes (CSRF guard).

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const NO_REFRESH = new Set(["/auth/refresh", "/auth/login", "/auth/register", "/auth/logout"]);
let refreshing: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshing ??= fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "X-Requested-With": "fetch" },
    credentials: "same-origin",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

type Options = Omit<RequestInit, "body"> & { json?: unknown; body?: BodyInit };

export async function api<T>(path: string, options: Options = {}, retry = true): Promise<T> {
  const { json, ...init } = options;
  const headers = new Headers(init.headers);
  headers.set("X-Requested-With", "fetch");
  let body = init.body;
  if (json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(json);
  }
  const res = await fetch(`/api${path}`, { ...init, body, headers, credentials: "same-origin" });

  if (res.status === 401 && retry && !NO_REFRESH.has(path) && (await refreshSession())) {
    return api<T>(path, options, false);
  }
  if (!res.ok) throw new ApiError(res.status, await errorMessage(res));
  return (res.status === 204 ? undefined : await res.json()) as T;
}

async function errorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: { loc?: string[]; msg: string }) => `${d.loc?.at(-1) ?? "field"}: ${d.msg}`).join(". ");
    }
  } catch {
    // not JSON
  }
  return `Something went wrong (${res.status}). Please try again.`;
}

/** True while the API's session hint cookie is set (not a credential; the API checks the JWT). */
export function hasSessionHint(): boolean {
  return typeof document !== "undefined" && /(?:^|;\s*)thl_session=/.test(document.cookie);
}

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
