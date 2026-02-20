"""
HamQTH callsign lookup endpoint.

Looks up callsign data (name, QTH, grid, DXCC) from the HamQTH XML API,
caches results in PostgreSQL with a 30-day TTL, and degrades gracefully
when HamQTH is unreachable.

HamQTH API is session-based XML:
  Auth:   GET https://www.hamqth.com/xml.php?u=USER&p=PASS
  Lookup: GET https://www.hamqth.com/xml.php?id=SESSION&callsign=W1AW&prg=HamLog
"""

import logging
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree as ET

import httpx
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.users import current_active_user
from backend.config import settings
from backend.database import get_async_session
from backend.models import CallsignCache, User
from backend.schemas import CallsignLookupResult

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/callsign", tags=["callsign"])

HAMQTH_BASE = "https://www.hamqth.com/xml.php"
HAMQTH_NS = "https://www.hamqth.com"
CACHE_TTL = timedelta(days=30)
HTTP_TIMEOUT = 10.0  # seconds

# Module-level HamQTH session cache — refreshed on auth failure
_hamqth_session_id: str | None = None


# ── HamQTH XML client ──────────────────────────────────────────────────────────


def _xml_text(element, tag: str) -> str | None:
    """Extract text from a namespaced child element, or None if absent."""
    child = element.find(f"{{{HAMQTH_NS}}}{tag}")
    return child.text.strip() if child is not None and child.text else None


async def _authenticate() -> str | None:
    """
    Obtain a fresh HamQTH session ID.
    Returns the session ID string, or None if credentials are missing/auth fails.
    """
    global _hamqth_session_id

    if not settings.hamqth_username or not settings.hamqth_password:
        return None

    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            resp = await client.get(
                HAMQTH_BASE,
                params={"u": settings.hamqth_username, "p": settings.hamqth_password},
            )
            resp.raise_for_status()

        root = ET.fromstring(resp.text)
        session_el = root.find(f"{{{HAMQTH_NS}}}session")
        if session_el is None:
            logger.warning("HamQTH auth response missing <session> element")
            return None

        error_el = session_el.find(f"{{{HAMQTH_NS}}}error")
        if error_el is not None:
            logger.error("HamQTH auth error: %s", error_el.text)
            return None

        session_id = _xml_text(session_el, "session_id")
        if session_id:
            _hamqth_session_id = session_id
            return session_id

        logger.warning("HamQTH auth response missing session_id")
        return None

    except Exception as exc:
        logger.warning("HamQTH authentication failed: %s", exc)
        return None


async def _lookup_hamqth(callsign: str) -> dict | None:
    """
    Look up a callsign on HamQTH.
    Returns a dict with keys name/qth/grid/dxcc (all may be None), or None on failure.
    Re-authenticates once if the session has expired.
    """
    global _hamqth_session_id

    if not _hamqth_session_id:
        _hamqth_session_id = await _authenticate()
        if not _hamqth_session_id:
            return None

    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
                resp = await client.get(
                    HAMQTH_BASE,
                    params={
                        "id": _hamqth_session_id,
                        "callsign": callsign,
                        "prg": "HamLog",
                    },
                )
                resp.raise_for_status()

            root = ET.fromstring(resp.text)

            # Check for session-level errors (expired session, not found, etc.)
            session_el = root.find(f"{{{HAMQTH_NS}}}session")
            if session_el is not None:
                error_el = session_el.find(f"{{{HAMQTH_NS}}}error")
                if error_el is not None:
                    err_text = error_el.text or ""
                    if attempt == 0 and "Session" in err_text:
                        # Session expired — re-authenticate and retry
                        logger.info("HamQTH session expired, re-authenticating")
                        _hamqth_session_id = await _authenticate()
                        if not _hamqth_session_id:
                            return None
                        continue
                    # Callsign not found or other error — not a hard failure
                    logger.info("HamQTH lookup for %s: %s", callsign, err_text)
                    return None

            search_el = root.find(f"{{{HAMQTH_NS}}}search")
            if search_el is None:
                return None

            name = _xml_text(search_el, "nick") or _xml_text(search_el, "adr_name")
            return {
                "name": name,
                "qth": _xml_text(search_el, "qth"),
                "grid": _xml_text(search_el, "grid"),
                "dxcc": _xml_text(search_el, "country"),
            }

        except Exception as exc:
            logger.warning("HamQTH lookup failed for %s (attempt %d): %s", callsign, attempt + 1, exc)
            return None

    return None


# ── Endpoint ───────────────────────────────────────────────────────────────────


@router.get("/{callsign}", response_model=CallsignLookupResult)
async def lookup_callsign(
    callsign: str,
    session: AsyncSession = Depends(get_async_session),
    _user: User = Depends(current_active_user),
):
    """
    Look up a callsign and return name, QTH, grid, and DXCC entity.

    Results are cached in the database for 30 days to minimise HamQTH API
    calls. If HamQTH is unreachable, returns an empty result so the operator
    can still proceed with manual entry.
    """
    callsign = callsign.upper().strip()

    now = datetime.now(timezone.utc).replace(tzinfo=None)  # store naive UTC

    # ── Cache hit? ───────────────────────────────────────────────────────────
    cached: CallsignCache | None = await session.get(CallsignCache, callsign)
    if cached is not None:
        age = now - cached.cached_at
        if age < CACHE_TTL:
            return CallsignLookupResult(
                callsign=cached.callsign,
                name=cached.name,
                qth=cached.qth,
                grid=cached.grid,
                dxcc=cached.dxcc,
                source="cache",
            )

    # ── Live HamQTH lookup ───────────────────────────────────────────────────
    data = await _lookup_hamqth(callsign)

    if data is not None:
        if cached is not None:
            # Update existing cache row
            cached.name = data["name"]
            cached.qth = data["qth"]
            cached.grid = data["grid"]
            cached.dxcc = data["dxcc"]
            cached.cached_at = now
        else:
            cached = CallsignCache(
                callsign=callsign,
                name=data["name"],
                qth=data["qth"],
                grid=data["grid"],
                dxcc=data["dxcc"],
                cached_at=now,
            )
            session.add(cached)
        await session.commit()

        return CallsignLookupResult(
            callsign=callsign,
            name=data["name"],
            qth=data["qth"],
            grid=data["grid"],
            dxcc=data["dxcc"],
            source="hamqth",
        )

    # ── Graceful degradation — HamQTH unavailable or callsign not found ──────
    return CallsignLookupResult(
        callsign=callsign,
        name=None,
        qth=None,
        grid=None,
        dxcc=None,
        source="none",
    )
