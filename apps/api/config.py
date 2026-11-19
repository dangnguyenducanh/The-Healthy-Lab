"""Settings read once from the environment. Production refuses to start with unsafe defaults."""

import os

ENV = os.getenv("ENV", "development")
IS_PROD = ENV == "production"

JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET:
    if IS_PROD:
        raise RuntimeError("JWT_SECRET must be set in production")
    JWT_SECRET = "dev-only-secret-not-for-production-0123456789abcdef"
if IS_PROD and len(JWT_SECRET) < 32:
    raise RuntimeError("JWT_SECRET must be at least 32 characters")

# Browser origins allowed to call the API directly. The web app proxies /api/* so its own calls are
# same-origin; this list only matters for tools and local setups that call the API from elsewhere.
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

# Secure cookies are sent only over https; browsers also accept them on http://localhost.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() != "false"
