import uuid
from datetime import date, time
from typing import Optional

from fastapi_users import schemas
from pydantic import BaseModel, Field


# ── FastAPI-Users schemas ────────────────────────────────────────────────────

class UserRead(schemas.BaseUser[uuid.UUID]):
    pass


class UserCreate(schemas.BaseUserCreate):
    pass


class UserUpdate(schemas.BaseUserUpdate):
    pass


# ── QSO schemas ──────────────────────────────────────────────────────────────

BAND_VALUES = [
    "160m", "80m", "60m", "40m", "30m", "20m", "17m",
    "15m", "12m", "10m", "6m", "2m", "70cm",
]
MODE_VALUES = [
    "SSB", "CW", "FT8", "FT4", "RTTY", "PSK31",
    "AM", "FM", "DIGI", "OTHER",
]


class QSOCreate(BaseModel):
    call: str = Field(..., min_length=2, max_length=20, pattern=r"^[A-Za-z0-9/]+$")
    band: Optional[str] = Field(None, max_length=10)
    freq: Optional[float] = Field(None, gt=0, lt=450_000)  # MHz
    mode: Optional[str] = Field(None, max_length=10)
    rst_sent: Optional[str] = Field(None, max_length=10)
    rst_rcvd: Optional[str] = Field(None, max_length=10)
    qso_date: Optional[date] = None
    time_on: Optional[time] = None
    name: Optional[str] = Field(None, max_length=100)
    qth: Optional[str] = Field(None, max_length=200)
    grid: Optional[str] = Field(None, max_length=8)
    dxcc: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None


class QSORead(QSOCreate):
    id: uuid.UUID
    created_by: uuid.UUID

    model_config = {"from_attributes": True}


class QSOList(BaseModel):
    items: list[QSORead]
    total: int
