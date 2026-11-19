"""HTTP-level checks of the JWT cookie session: issue, CSRF, rotation, reuse, lockout, logout."""

from pathlib import Path
import os
import tempfile

# Same database file as the other test module (one process, one engine).
db_path = Path(tempfile.gettempdir()) / f"healthy_lab_pytest_{os.getpid()}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
os.environ["COOKIE_SECURE"] = "false"  # the test client talks plain http

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from auth import ACCESS_COOKIE, REFRESH_COOKIE  # noqa: E402
from config import JWT_SECRET  # noqa: E402
from database import create_db_and_tables, engine  # noqa: E402
from main import app  # noqa: E402

CSRF = {"X-Requested-With": "fetch"}
PASSWORD = "correct horse 42"


@pytest.fixture()
def client():
    engine.dispose()
    db_path.unlink(missing_ok=True)
    create_db_and_tables()
    with TestClient(app) as test_client:
        yield test_client


def cookies_of(response) -> dict:
    return {c.name: c.value for c in response.cookies.jar}


def register(client, email="ana@example.com"):
    return client.post("/auth/register", json={"name": "Ana", "email": email, "password": PASSWORD})


def test_register_sets_httponly_cookies_and_no_token_in_body(client):
    response = register(client)
    assert response.status_code == 201
    assert "token" not in response.json()
    set_cookie = ";".join(response.headers.get_list("set-cookie")).lower()
    assert "httponly" in set_cookie and "samesite=lax" in set_cookie
    assert "path=/api/auth" in set_cookie
    claims = jwt.decode(cookies_of(response)[ACCESS_COOKIE], JWT_SECRET, algorithms=["HS256"], audience="healthy-lab-web")
    assert claims["type"] == "access" and claims["iss"] == "healthy-lab-api" and claims["role"] == "customer"


def test_cookie_session_reads_me_and_needs_csrf_header_to_write(client):
    access = cookies_of(register(client))[ACCESS_COOKIE]
    client.cookies.set(ACCESS_COOKIE, access)
    assert client.get("/auth/me").json()["email"] == "ana@example.com"
    order = {"items": [], "order_type": "pickup"}
    assert client.post("/orders", json=order).status_code == 403  # no X-Requested-With
    assert client.post("/orders", json=order, headers=CSRF).status_code != 403


def test_refresh_token_cannot_be_used_as_access_token(client):
    refresh = cookies_of(register(client))[REFRESH_COOKIE]
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {refresh}"})
    assert response.status_code == 401


def test_tampered_or_unsigned_token_is_refused(client):
    access = cookies_of(register(client))[ACCESS_COOKIE]
    claims = jwt.decode(access, options={"verify_signature": False})
    claims["role"] = "admin"
    forged = jwt.encode(claims, "wrong-secret-wrong-secret-wrong-secret", algorithm="HS256")
    none_alg = jwt.encode(claims, None, algorithm="none")
    for token in (forged, none_alg):
        assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_refresh_rotates_and_reuse_revokes_every_session(client):
    first = cookies_of(register(client))[REFRESH_COOKIE]
    rotated = client.post("/auth/refresh", headers={**CSRF, "Cookie": f"{REFRESH_COOKIE}={first}"})
    assert rotated.status_code == 200
    second = cookies_of(rotated)[REFRESH_COOKIE]
    assert second != first

    reused = client.post("/auth/refresh", headers={**CSRF, "Cookie": f"{REFRESH_COOKIE}={first}"})
    assert reused.status_code == 401
    # the theft signal ended the newer session too
    after = client.post("/auth/refresh", headers={**CSRF, "Cookie": f"{REFRESH_COOKIE}={second}"})
    assert after.status_code == 401


def test_logout_revokes_refresh_token(client):
    refresh = cookies_of(register(client))[REFRESH_COOKIE]
    cookie = {"Cookie": f"{REFRESH_COOKIE}={refresh}"}
    assert client.post("/auth/logout", headers={**CSRF, **cookie}).status_code == 204
    assert client.post("/auth/refresh", headers={**CSRF, **cookie}).status_code == 401


def test_login_is_generic_and_locks_after_five_failures(client):
    register(client)
    unknown = client.post("/auth/login", json={"email": "nobody@example.com", "password": PASSWORD})
    wrong = client.post("/auth/login", json={"email": "ana@example.com", "password": "nope-nope"})
    assert unknown.status_code == wrong.status_code == 401
    assert unknown.json() == wrong.json()

    for _ in range(4):
        client.post("/auth/login", json={"email": "ana@example.com", "password": "nope-nope"})
    locked = client.post("/auth/login", json={"email": "ana@example.com", "password": PASSWORD})
    assert locked.status_code == 429
    assert locked.headers["retry-after"] == "900"


def test_password_rules(client):
    short = client.post("/auth/register", json={"name": "B", "email": "b@example.com", "password": "short"})
    long = client.post("/auth/register", json={"name": "B", "email": "b@example.com", "password": "x" * 73})
    bad_email = client.post("/auth/register", json={"name": "B", "email": "not-an-email", "password": PASSWORD})
    assert short.status_code == long.status_code == bad_email.status_code == 422


def test_security_headers_present(client):
    headers = client.get("/health").headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
    assert "frame-ancestors 'none'" in headers["content-security-policy"]
