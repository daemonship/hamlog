"""
Natural language QSO parsing endpoint.

Accepts free-text contact descriptions and calls Claude Haiku to extract
structured QSO fields. Returns a ParseResponse with parsed fields and a
confidence score.
"""
import json
import logging
from datetime import date, time

from anthropic import AsyncAnthropic, APIError
from fastapi import APIRouter, Depends, HTTPException, Request, status

from backend.auth.users import current_active_user
from backend.config import settings
from backend.models import User
from backend.schemas import ParsedQSO, ParseRequest, ParseResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/parse", tags=["parse"])

# ── System prompt ──────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a ham radio logbook assistant. Extract structured QSO (contact) fields
from free-text operator notes. Return ONLY a JSON object — no prose, no
markdown fences.

## Output schema
{
  "call":      string | null,   // Callsign of the contacted station, uppercase, e.g. "W1AW"
  "band":      string | null,   // Band, e.g. "20m", "40m", "2m". Normalise shorthand like "twenty meters" → "20m"
  "freq":      number | null,   // Frequency in MHz, e.g. 14.225. Derive from band if unambiguous.
  "mode":      string | null,   // Uppercase mode: "SSB", "CW", "FT8", "FT4", "RTTY", "PSK31", "AM", "FM", "DIGI", "OTHER"
  "rst_sent":  string | null,   // RST report sent, e.g. "59" (phone) or "579" (CW)
  "rst_rcvd":  string | null,   // RST report received
  "qso_date":  string | null,   // ISO date "YYYY-MM-DD"
  "time_on":   string | null,   // UTC time "HH:MM:SS". Default to UTC if timezone not stated.
  "name":      string | null,   // Operator name at contacted station
  "qth":       string | null,   // Location of contacted station (city, state, country)
  "grid":      string | null,   // Maidenhead grid locator, e.g. "FN31"
  "dxcc":      string | null,   // DXCC entity name, e.g. "Australia", "Germany"
  "notes":     string | null,   // Any other details worth preserving
  "confidence": number          // 0.0–1.0: how complete and unambiguous the extraction is
}

## Ham radio conventions
- Callsigns: 1–3 letter prefix + digit + 1–4 letter suffix, may have /P /M /QRP suffixes
- RST: phone uses 2-digit (readability 1-5, signal strength 1-9), CW uses 3-digit (adds tone 1-9)
- "59" = perfect phone report; "599" = perfect CW report
- Bands: 160m=1.8 MHz, 80m=3.5 MHz, 40m=7 MHz, 30m=10 MHz, 20m=14 MHz, 17m=18 MHz,
         15m=21 MHz, 12m=24 MHz, 10m=28 MHz, 6m=50 MHz, 2m=144 MHz, 70cm=432 MHz
- Mode aliases: "phone"/"voice" → "SSB"; "morse"/"dots and dashes" → "CW"; "digital"/"JS8" varies
- If exact frequency is given, derive band from it.
- Dates: interpret relative dates (e.g. "yesterday", "last Tuesday") as null — you have no clock.
- confidence: 1.0 if callsign + band + mode all present; subtract 0.1 per missing key field.

## Few-shot examples

Input: "worked W1AW on 20 meters ssb, gave him 59 got 57 back"
Output: {"call":"W1AW","band":"20m","freq":null,"mode":"SSB","rst_sent":"59","rst_rcvd":"57","qso_date":null,"time_on":null,"name":null,"qth":null,"grid":null,"dxcc":null,"notes":null,"confidence":0.8}

Input: "QSO with VK2XYZ 14.225 MHz SSB 15:30z June 15 2025 name John QTH Sydney Australia"
Output: {"call":"VK2XYZ","band":"20m","freq":14.225,"mode":"SSB","rst_sent":null,"rst_rcvd":null,"qso_date":"2025-06-15","time_on":"15:30:00","name":"John","qth":"Sydney, Australia","grid":null,"dxcc":"Australia","notes":null,"confidence":0.9}

Input: "CW contact JA1ABC 40m 599 both ways 07:14 UTC grid PM95"
Output: {"call":"JA1ABC","band":"40m","freq":null,"mode":"CW","rst_sent":"599","rst_rcvd":"599","qso_date":null,"time_on":"07:14:00","name":null,"qth":null,"grid":"PM95","dxcc":"Japan","notes":null,"confidence":0.9}

Input: "FT8 QSO DX9ABC 15m 2025-03-22 2134z -12 db signal"
Output: {"call":"DX9ABC","band":"15m","freq":null,"mode":"FT8","rst_sent":null,"rst_rcvd":"-12","qso_date":"2025-03-22","time_on":"21:34:00","name":null,"qth":null,"grid":null,"dxcc":null,"notes":"-12 dB signal","confidence":0.85}

Input: "Worked DL3FOO on 7.050, CW, RST 579/579, name Klaus, Cologne Germany, grid JO30"
Output: {"call":"DL3FOO","band":"40m","freq":7.050,"mode":"CW","rst_sent":"579","rst_rcvd":"579","qso_date":null,"time_on":null,"name":"Klaus","qth":"Cologne, Germany","grid":"JO30","dxcc":"Germany","notes":null,"confidence":0.95}

Input: "ZL2ABC ssb 59 59 twenty meters 1430z"
Output: {"call":"ZL2ABC","band":"20m","freq":null,"mode":"SSB","rst_sent":"59","rst_rcvd":"59","qso_date":null,"time_on":"14:30:00","name":null,"qth":null,"grid":null,"dxcc":"New Zealand","notes":null,"confidence":0.85}

Input: "quick sked with AA7BQ on two meters FM, full quieting both ways, in Phoenix AZ"
Output: {"call":"AA7BQ","band":"2m","freq":null,"mode":"FM","rst_sent":null,"rst_rcvd":null,"qso_date":null,"time_on":null,"name":null,"qth":"Phoenix, AZ","grid":null,"dxcc":"United States","notes":"full quieting both ways","confidence":0.75}

Input: "VE3XYZ 17m 18.130 ssb 2024-11-08 1800z 59 58 op name Mike, Ontario Canada grid FN03"
Output: {"call":"VE3XYZ","band":"17m","freq":18.130,"mode":"SSB","rst_sent":"59","rst_rcvd":"58","qso_date":"2024-11-08","time_on":"18:00:00","name":"Mike","qth":"Ontario, Canada","grid":"FN03","dxcc":"Canada","notes":null,"confidence":1.0}

Input: "RTTY contest, W6ABC 10m, exchange: 5NN CA"
Output: {"call":"W6ABC","band":"10m","freq":null,"mode":"RTTY","rst_sent":"599","rst_rcvd":null,"qso_date":null,"time_on":null,"name":null,"qth":"California, USA","grid":null,"dxcc":"United States","notes":"exchange: 5NN CA","confidence":0.7}

Input: "PSK31 on 80 with G4XYZ, 3.580 MHz, signal report 599/599, name Pete, Birmingham UK"
Output: {"call":"G4XYZ","band":"80m","freq":3.580,"mode":"PSK31","rst_sent":"599","rst_rcvd":"599","qso_date":null,"time_on":null,"name":"Pete","qth":"Birmingham, UK","grid":null,"dxcc":"England","notes":null,"confidence":0.95}
"""

# ── Anthropic client (lazy singleton) ─────────────────────────────────────────

_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        if not settings.anthropic_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI parsing unavailable: ANTHROPIC_API_KEY not configured",
            )
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


# ── Parsing logic ──────────────────────────────────────────────────────────────

def _safe_date(v: str | None) -> date | None:
    if not v:
        return None
    try:
        return date.fromisoformat(v)
    except ValueError:
        return None


def _safe_time(v: str | None) -> time | None:
    if not v:
        return None
    try:
        return time.fromisoformat(v)
    except ValueError:
        return None


def _safe_float(v) -> float | None:
    if v is None:
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _build_parsed_qso(raw: dict) -> tuple[ParsedQSO, float]:
    """Convert the raw dict from Claude into a ParsedQSO + confidence."""
    confidence = float(raw.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))

    call = raw.get("call")
    if call:
        call = str(call).upper().strip()

    mode = raw.get("mode")
    if mode:
        mode = str(mode).upper().strip()

    parsed = ParsedQSO(
        call=call,
        band=raw.get("band"),
        freq=_safe_float(raw.get("freq")),
        mode=mode,
        rst_sent=raw.get("rst_sent"),
        rst_rcvd=raw.get("rst_rcvd"),
        qso_date=_safe_date(raw.get("qso_date")),
        time_on=_safe_time(raw.get("time_on")),
        name=raw.get("name"),
        qth=raw.get("qth"),
        grid=raw.get("grid"),
        dxcc=raw.get("dxcc"),
        notes=raw.get("notes"),
    )
    return parsed, confidence


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("", response_model=ParseResponse)
async def parse_qso_text(
    payload: ParseRequest,
    request: Request,
    _user: User = Depends(current_active_user),
):
    """
    Parse a free-text QSO description into structured fields using Claude Haiku.

    The caller should display the parsed fields in the manual entry form so the
    operator can review and correct before saving.
    """
    client = _get_client()

    try:
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": payload.text}],
        )
    except APIError as exc:
        logger.error("Anthropic API error during QSO parse: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI parsing service error: {exc.status_code}",
        ) from exc

    raw_content = message.content[0].text.strip()

    # Strip any accidental markdown code fences
    if raw_content.startswith("```"):
        raw_content = raw_content.split("```")[1]
        if raw_content.startswith("json"):
            raw_content = raw_content[4:]
        raw_content = raw_content.strip()

    try:
        raw_dict = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        logger.error("Claude returned non-JSON for parse request: %r", raw_content)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI parsing returned malformed response",
        ) from exc

    parsed, confidence = _build_parsed_qso(raw_dict)

    return ParseResponse(
        parsed=parsed,
        confidence=confidence,
        raw_text=payload.text,
    )
