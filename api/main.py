"""
main.py – FastAPI application entrypoint for Bay Buddy API.

Start the server:
    poetry run uvicorn main:app --reload

Environment variables (see .env.example):
    DATABASE_URL   SQLAlchemy connection string
    SECRET_KEY     JWT signing secret  (min 32 chars)
    FRONTEND_URL   Allowed CORS origin (e.g. http://localhost:6769)
"""

import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_db_and_tables
from runtime_env_logging import log_runtime_environment_summary

load_dotenv()

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Bay Buddy API",
    description=(
        "Flight & Debt Management System for Vietnamese travel agencies. "
        "Powered by FastAPI, SQLModel, and Gemini AI."
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    swagger_ui_parameters={"persistAuthorization": True},
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_allowed_origins: list[str] = [
    origin.strip()
    for origin in os.getenv("FRONTEND_URL", "http://localhost:6769").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,   # Required for HttpOnly cookie auth
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def on_startup() -> None:
    """
    Run once when the server starts.

    In development SQLite is auto-created here.
    In production Alembic migrations should have already run before startup.
    """
    # Import models so SQLModel collects table metadata before create_all.
    import models  # noqa: F401

    log_runtime_environment_summary(os.environ)

    if os.getenv("DATABASE_URL", "").startswith("sqlite") or not os.getenv(
        "DATABASE_URL"
    ):
        create_db_and_tables()


# ---------------------------------------------------------------------------
# Routers (imported after app creation to avoid circular imports)
# Uncomment each line as the corresponding router is implemented.
# ---------------------------------------------------------------------------

from routes import auth, ai

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(ai.router, prefix="/api/v1/ai", tags=["AI"])
from routes import customers, finance, tickets, transactions, users
app.include_router(users.router,        prefix="/api/v1/users",        tags=["Users"])
app.include_router(customers.router,    prefix="/api/v1/customers",    tags=["Customers"])
app.include_router(tickets.router,      prefix="/api/v1/tickets",      tags=["Tickets"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["Transactions"])
app.include_router(finance.router,      prefix="/api/v1/finance",      tags=["Finance"])

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["System"])
async def health_check() -> dict:
    """Lightweight liveness probe for deployment platforms."""
    return {"status": "ok", "service": "bay-buddy-api"}
