"""QSO CRUD endpoint tests."""
import pytest
from tests.conftest import register_and_get_token


@pytest.mark.asyncio
async def test_create_and_list_qso(client):
    token = await register_and_get_token(client, "k1abc@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Create a QSO
    payload = {
        "call": "VK2XYZ",
        "band": "20m",
        "freq": 14.225,
        "mode": "SSB",
        "rst_sent": "59",
        "rst_rcvd": "57",
        "qso_date": "2025-06-15",
        "time_on": "14:32:00",
        "name": "John",
        "qth": "Sydney, Australia",
        "grid": "QF56",
        "dxcc": "Australia",
        "notes": "Good signal, slight QSB",
    }
    resp = await client.post("/qso", json=payload, headers=headers)
    assert resp.status_code == 201, resp.text
    created = resp.json()
    assert created["call"] == "VK2XYZ"
    qso_id = created["id"]

    # List QSOs
    resp = await client.get("/qso", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == qso_id


@pytest.mark.asyncio
async def test_qso_callsign_filter(client):
    token = await register_and_get_token(client, "k2def@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    for call in ["W1AW", "VE3ABC", "W1XYZ"]:
        await client.post("/qso", json={"call": call}, headers=headers)

    resp = await client.get("/qso?call=W1", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    calls = {item["call"] for item in body["items"]}
    assert "W1AW" in calls
    assert "W1XYZ" in calls
    assert "VE3ABC" not in calls


@pytest.mark.asyncio
async def test_delete_qso(client):
    token = await register_and_get_token(client, "k3ghi@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/qso", json={"call": "JA1ABC"}, headers=headers)
    qso_id = resp.json()["id"]

    resp = await client.delete(f"/qso/{qso_id}", headers=headers)
    assert resp.status_code == 204

    # Confirm gone
    resp = await client.get("/qso", headers=headers)
    assert resp.json()["total"] == 0


@pytest.mark.asyncio
async def test_cannot_access_other_users_qso(client):
    token_a = await register_and_get_token(client, "userA@example.com")
    token_b = await register_and_get_token(client, "userB@example.com")

    resp = await client.post(
        "/qso", json={"call": "G3XYZ"}, headers={"Authorization": f"Bearer {token_a}"}
    )
    qso_id = resp.json()["id"]

    # User B should not be able to delete user A's QSO
    resp = await client.delete(
        f"/qso/{qso_id}", headers={"Authorization": f"Bearer {token_b}"}
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_callsign_rejected(client):
    token = await register_and_get_token(client, "k4jkl@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/qso", json={"call": "BAD CALL!"}, headers=headers)
    assert resp.status_code == 422
