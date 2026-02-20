"""
Tests for the /parse NL QSO extraction endpoint.

The Anthropic API is mocked so no real API key is required.
We inject the mock client directly into parse_mod._client so that
_get_client() returns it immediately, bypassing the API-key check.
"""
import json
from unittest.mock import AsyncMock, MagicMock

import pytest

import backend.routers.parse as parse_mod
from tests.conftest import register_and_get_token


def _make_mock_client(payload: dict) -> MagicMock:
    """Return a mock AsyncAnthropic client that returns ``payload`` as JSON."""
    content_block = MagicMock()
    content_block.text = json.dumps(payload)
    message = MagicMock()
    message.content = [content_block]

    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=message)
    return mock_client


def _inject(mock_client: MagicMock):
    """Install mock_client as the module-level singleton."""
    parse_mod._client = mock_client


def _reset():
    """Remove the singleton so subsequent tests start fresh."""
    parse_mod._client = None


# ── Happy-path tests ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_parse_basic_ssb_qso(client):
    token = await register_and_get_token(client, "parse1@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    _inject(_make_mock_client({
        "call": "W1AW", "band": "20m", "freq": None, "mode": "SSB",
        "rst_sent": "59", "rst_rcvd": "57",
        "qso_date": None, "time_on": None, "name": None, "qth": None,
        "grid": None, "dxcc": None, "notes": None, "confidence": 0.8,
    }))

    resp = await client.post(
        "/parse",
        json={"text": "worked W1AW on 20 meters ssb, gave him 59 got 57 back"},
        headers=headers,
    )
    _reset()

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["parsed"]["call"] == "W1AW"
    assert body["parsed"]["band"] == "20m"
    assert body["parsed"]["mode"] == "SSB"
    assert body["parsed"]["rst_sent"] == "59"
    assert body["parsed"]["rst_rcvd"] == "57"
    assert body["confidence"] == pytest.approx(0.8)
    assert body["raw_text"] == "worked W1AW on 20 meters ssb, gave him 59 got 57 back"


@pytest.mark.asyncio
async def test_parse_full_cw_qso(client):
    token = await register_and_get_token(client, "parse2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    _inject(_make_mock_client({
        "call": "DL3FOO", "band": "40m", "freq": 7.050, "mode": "CW",
        "rst_sent": "579", "rst_rcvd": "579",
        "qso_date": None, "time_on": None,
        "name": "Klaus", "qth": "Cologne, Germany",
        "grid": "JO30", "dxcc": "Germany", "notes": None, "confidence": 0.95,
    }))

    resp = await client.post(
        "/parse",
        json={"text": "Worked DL3FOO on 7.050, CW, RST 579/579, name Klaus, Cologne Germany, grid JO30"},
        headers=headers,
    )
    _reset()

    assert resp.status_code == 200
    body = resp.json()
    assert body["parsed"]["call"] == "DL3FOO"
    assert body["parsed"]["mode"] == "CW"
    assert body["parsed"]["freq"] == pytest.approx(7.050)
    assert body["parsed"]["grid"] == "JO30"
    assert body["parsed"]["name"] == "Klaus"
    assert body["confidence"] == pytest.approx(0.95)


@pytest.mark.asyncio
async def test_parse_ft8_with_date(client):
    token = await register_and_get_token(client, "parse3@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    _inject(_make_mock_client({
        "call": "DX9ABC", "band": "15m", "freq": None, "mode": "FT8",
        "rst_sent": None, "rst_rcvd": "-12",
        "qso_date": "2025-03-22", "time_on": "21:34:00",
        "name": None, "qth": None, "grid": None, "dxcc": None,
        "notes": "-12 dB signal", "confidence": 0.85,
    }))

    resp = await client.post(
        "/parse",
        json={"text": "FT8 QSO DX9ABC 15m 2025-03-22 2134z -12 db signal"},
        headers=headers,
    )
    _reset()

    assert resp.status_code == 200
    body = resp.json()
    assert body["parsed"]["call"] == "DX9ABC"
    assert body["parsed"]["mode"] == "FT8"
    assert body["parsed"]["qso_date"] == "2025-03-22"
    assert body["parsed"]["time_on"] == "21:34:00"


@pytest.mark.asyncio
async def test_parse_callsign_uppercased(client):
    """Callsign returned by Claude in lowercase must be normalised to uppercase."""
    token = await register_and_get_token(client, "parse4@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    _inject(_make_mock_client({
        "call": "ve3xyz",  # lowercase — endpoint must uppercase it
        "band": "40m", "freq": None, "mode": "SSB",
        "rst_sent": None, "rst_rcvd": None,
        "qso_date": None, "time_on": None,
        "name": None, "qth": None, "grid": None, "dxcc": None,
        "notes": None, "confidence": 0.7,
    }))

    resp = await client.post(
        "/parse", json={"text": "ve3xyz on 40m ssb"}, headers=headers
    )
    _reset()

    assert resp.status_code == 200
    assert resp.json()["parsed"]["call"] == "VE3XYZ"


@pytest.mark.asyncio
async def test_parse_confidence_clamped(client):
    """Confidence values outside [0, 1] must be clamped."""
    token = await register_and_get_token(client, "parse5@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    for out_of_range, expected in [(-0.5, 0.0), (1.5, 1.0)]:
        _inject(_make_mock_client({
            "call": "K1ABC",
            "band": None, "freq": None, "mode": None,
            "rst_sent": None, "rst_rcvd": None,
            "qso_date": None, "time_on": None,
            "name": None, "qth": None, "grid": None, "dxcc": None,
            "notes": None, "confidence": out_of_range,
        }))

        resp = await client.post("/parse", json={"text": "K1ABC"}, headers=headers)
        _reset()

        assert resp.status_code == 200
        assert resp.json()["confidence"] == pytest.approx(expected)


# ── Auth / validation tests ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_parse_requires_auth(client):
    resp = await client.post("/parse", json={"text": "worked W1AW on 20m"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_parse_rejects_empty_text(client):
    token = await register_and_get_token(client, "parse6@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    resp = await client.post("/parse", json={"text": ""}, headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_parse_handles_markdown_fence(client):
    """Claude occasionally wraps JSON in markdown code fences — strip them."""
    token = await register_and_get_token(client, "parse7@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "call": "K1TST", "band": "20m", "freq": None, "mode": "SSB",
        "rst_sent": "59", "rst_rcvd": "59",
        "qso_date": None, "time_on": None,
        "name": None, "qth": None, "grid": None, "dxcc": None,
        "notes": None, "confidence": 0.8,
    }
    fenced_text = f"```json\n{json.dumps(payload)}\n```"

    content_block = MagicMock()
    content_block.text = fenced_text
    message = MagicMock()
    message.content = [content_block]

    mock_client = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=message)
    _inject(mock_client)

    resp = await client.post(
        "/parse", json={"text": "K1TST 20m SSB 59 59"}, headers=headers
    )
    _reset()

    assert resp.status_code == 200
    assert resp.json()["parsed"]["call"] == "K1TST"
