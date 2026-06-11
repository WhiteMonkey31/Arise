from celery import Celery
from app.config import settings

celery_app = Celery(
    "rfp_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.extract", "app.tasks.match", "app.tasks.draft"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    result_expires=86400,
    task_track_started=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
    task_soft_time_limit=300,
    task_time_limit=600,
    task_routes={
        "tasks.extract.extract_rfp_text": {"queue": "extract"},
        "tasks.match.match_capabilities": {"queue": "match"},
        "tasks.draft.draft_proposals": {"queue": "draft"},
    },
    task_default_queue="celery",
)
