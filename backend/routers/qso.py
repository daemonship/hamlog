import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.users import current_active_user
from backend.database import get_async_session
from backend.models import QSO, User
from backend.schemas import QSOCreate, QSOList, QSORead

router = APIRouter(prefix="/qso", tags=["qso"])


@router.post("", response_model=QSORead, status_code=status.HTTP_201_CREATED)
async def create_qso(
    payload: QSOCreate,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    qso = QSO(**payload.model_dump(), created_by=user.id)
    session.add(qso)
    await session.commit()
    await session.refresh(qso)
    return qso


@router.get("", response_model=QSOList)
async def list_qsos(
    call: str | None = Query(None, description="Filter by callsign (partial match)"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    base_q = select(QSO).where(QSO.created_by == user.id)

    if call:
        base_q = base_q.where(QSO.call.ilike(f"%{call}%"))

    count_q = select(func.count()).select_from(base_q.subquery())
    total: int = (await session.execute(count_q)).scalar_one()

    items_q = (
        base_q.order_by(QSO.qso_date.desc().nulls_last(), QSO.time_on.desc().nulls_last())
        .offset(offset)
        .limit(limit)
    )
    rows = (await session.execute(items_q)).scalars().all()

    return QSOList(items=list(rows), total=total)


@router.get("/export/adif")
async def export_adif(
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    """Export all QSOs as an ADIF 3.1.4 compliant .adi file."""
    q = (
        select(QSO)
        .where(QSO.created_by == user.id)
        .order_by(QSO.qso_date.asc().nulls_last(), QSO.time_on.asc().nulls_last())
    )
    rows = (await session.execute(q)).scalars().all()

    def field(name: str, value) -> str:
        if value is None:
            return ""
        s = str(value).strip()
        if not s:
            return ""
        return f"<{name}:{len(s)}>{s} "

    now_str = datetime.utcnow().strftime("%Y%m%d %H%M%SZ")
    lines: list[str] = [
        f"HamLog ADIF Export — {now_str}",
        f"<ADIF_VER:5>3.1.4 <PROGRAMID:6>HamLog <EOH>",
        "",
    ]

    for qso in rows:
        rec = field("CALL", qso.call)
        if qso.qso_date:
            rec += field("QSO_DATE", qso.qso_date.strftime("%Y%m%d"))
        if qso.time_on:
            rec += field("TIME_ON", qso.time_on.strftime("%H%M%S"))
        rec += field("BAND", qso.band)
        if qso.freq is not None:
            rec += field("FREQ", f"{float(qso.freq):.4f}")
        rec += field("MODE", qso.mode)
        rec += field("RST_SENT", qso.rst_sent)
        rec += field("RST_RCVD", qso.rst_rcvd)
        rec += field("NAME", qso.name)
        rec += field("QTH", qso.qth)
        rec += field("GRIDSQUARE", qso.grid)
        rec += field("DXCC", qso.dxcc)
        rec += field("COMMENT", qso.notes)
        rec += "<EOR>"
        lines.append(rec)

    content = "\n".join(lines) + "\n"
    filename = f"hamlog_{datetime.utcnow().strftime('%Y%m%d')}.adi"
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{qso_id}", response_model=QSORead)
async def get_qso(
    qso_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    qso = await session.get(QSO, qso_id)
    if not qso or qso.created_by != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QSO not found")
    return qso


@router.delete("/{qso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_qso(
    qso_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
    user: User = Depends(current_active_user),
):
    qso = await session.get(QSO, qso_id)
    if not qso or qso.created_by != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="QSO not found")
    await session.delete(qso)
    await session.commit()
