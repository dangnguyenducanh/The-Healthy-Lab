import "server-only";

// Server components read public data straight from the API project (no browser, no cookies).
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

export async function serverGet<T>(path: string, fallback: T, revalidate = 300): Promise<T> {
  try {
    const res = await fetch(`${API_ORIGIN}${path}`, { next: { revalidate } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}
