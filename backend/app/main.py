from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.database import create_tables
from app.logger import get_logger, setup_logging
from app.middleware.cost_tracker import CostTrackerMiddleware

from app.api.analytics import router as analytics_router
from app.api.capabilities import router as capabilities_router
from app.api.compliance import router as compliance_router
from app.api.export import router as export_router
from app.api.jobs import router as jobs_router
from app.api.proposals import router as proposals_router
from app.api.upload import router as upload_router
from app.api.win_score import router as win_score_router
from app.api.workspaces import router as workspaces_router
from app.api.ai_providers import router as ai_providers_router
from app.api.iso_compliance import router as iso_router
from app.auth.users import router as auth_router

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    logger.info("Starting up", version=settings.APP_VERSION, env=settings.ENVIRONMENT)
    try:
        await create_tables()
    except Exception as exc:
        logger.error("DB init failed", error=str(exc))
        raise
    yield
    logger.info("Shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(CostTrackerMiddleware)

    routers = [
        auth_router, workspaces_router, upload_router, compliance_router,
        proposals_router, export_router, capabilities_router, jobs_router,
        win_score_router, analytics_router, ai_providers_router, iso_router,
    ]
    for router in routers:
        app.include_router(router)

    @app.get("/health", tags=["system"])
    async def health():
        return {"status": "ok", "version": settings.APP_VERSION}

    @app.get("/ready", tags=["system"])
    async def ready():
        from app.db.database import engine
        import sqlalchemy
        try:
            async with engine.connect() as conn:
                await conn.execute(sqlalchemy.text("SELECT 1"))
            return {"status": "ready"}
        except Exception as exc:
            logger.error("Readiness check failed", error=str(exc))
            return JSONResponse(status_code=503, content={"status": "not_ready"})

    return app


app = create_app()
