import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
