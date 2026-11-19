import type { NextConfig } from "next";

// Where /api/* is proxied: the FastAPI project. The browser only ever talks to this origin, so the
// API's httpOnly cookies are first-party and no CORS is involved.
const API_ORIGIN = process.env.API_ORIGIN ?? "http://127.0.0.1:8000";

// The Content-Security-Policy is per request (it carries a nonce), so it is set in proxy.ts.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [70, 80],
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
