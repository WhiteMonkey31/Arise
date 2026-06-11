import sys
from loguru import logger
from app.config import settings


def setup_logging() -> None:
    logger.remove()
    if settings.ENVIRONMENT == "production":
        logger.add(
            sys.stdout,
            serialize=True,
            level="INFO",
            backtrace=False,
            diagnose=False,
        )
        logger.add(
            "logs/app.log",
            rotation="100 MB",
            retention="30 days",
            compression="gz",
            serialize=True,
            level="INFO",
        )
    else:
        logger.add(
            sys.stdout,
            colorize=True,
            format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> | <level>{message}</level>",
            level="DEBUG",
            backtrace=True,
            diagnose=True,
        )


def get_logger(name: str):
    return logger.bind(component=name)
