import uuid
from datetime import date, time
from typing import Optional

from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy import Date, ForeignKey, Numeric, String, Text, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class User(SQLAlchemyBaseUserTableUUID, Base):
    """User account — managed by FastAPI-Users."""
    pass


class QSO(Base):
    """A single ham radio contact (QSO) log entry."""

    __tablename__ = "qso"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Core contact fields
    call: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    band: Mapped[Optional[str]] = mapped_column(String(10))   # e.g. "20m", "40m"
    freq: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))  # MHz
    mode: Mapped[Optional[str]] = mapped_column(String(10))   # SSB, CW, FT8 …
    rst_sent: Mapped[Optional[str]] = mapped_column(String(10))
    rst_rcvd: Mapped[Optional[str]] = mapped_column(String(10))

    # Date / time (always store as UTC)
    qso_date: Mapped[Optional[date]] = mapped_column(Date)
    time_on: Mapped[Optional[time]] = mapped_column(Time)

    # Contact info auto-filled from HamQTH or manual entry
    name: Mapped[Optional[str]] = mapped_column(String(100))
    qth: Mapped[Optional[str]] = mapped_column(String(200))   # city/country string
    grid: Mapped[Optional[str]] = mapped_column(String(8))    # Maidenhead locator
    dxcc: Mapped[Optional[str]] = mapped_column(String(50))   # DXCC entity name

    # Free-form notes
    notes: Mapped[Optional[str]] = mapped_column(Text)

    # Owner
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )
