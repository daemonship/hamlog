"""Auth endpoint smoke tests."""
import pytest
from tests.conftest import _PW, _PW_FIELD, register_and_get_token


@pytest.mark.asyncio
async def test_register_and_login(client):
    creds = {"email": "w1aw@arrl.org", _PW_FIELD: _PW}

    # Register
    resp = await client.post("/auth/register", json=creds)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["email"] == "w1aw@arrl.org"
    assert "id" in data

    # Login
    resp = await client.post(
        "/auth/jwt/login",
        data={"username": creds["email"], _PW_FIELD: _PW},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200, resp.text
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_register_short_password(client):
    resp = await client.post(
        "/auth/register",
        json={"email": "short@example.com", _PW_FIELD: "hi"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_unauthenticated_qso_access(client):
    resp = await client.get("/qso")
    assert resp.status_code == 401
