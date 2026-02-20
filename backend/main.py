from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from backend.auth.users import auth_backend, fastapi_users
from backend.database import create_db_and_tables
from backend.routers.hamqth import router as hamqth_router
from backend.routers.parse import router as parse_router
from backend.routers.qso import router as qso_router
from backend.schemas import UserCreate, UserRead, UserUpdate

# ── Rate limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])


# ── App lifecycle ─────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()
    yield


# ── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="HamLog API",
    description="AI-Powered Ham Radio Logbook & Contact Analyzer",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth routes ───────────────────────────────────────────────────────────────

app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# ── QSO routes ────────────────────────────────────────────────────────────────

app.include_router(qso_router)

# ── NL parse routes ───────────────────────────────────────────────────────────

app.include_router(parse_router)

# ── Callsign lookup routes ────────────────────────────────────────────────────

app.include_router(hamqth_router)


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["meta"])
@limiter.exempt
async def health(_request: Request):
    return {"status": "ok"}
