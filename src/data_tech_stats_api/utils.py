import os
from datetime import datetime, timedelta, timezone
import time
import logging
import functools

import boto3


def running_on_lambda() -> bool:
    return "AWS_LAMBDA_FUNCTION_NAME" in os.environ


def create_boto3_session(profile: str = "default", region: str = None):
    if running_on_lambda():
        return boto3.Session(region_name=region)
    return boto3.Session(profile_name=profile, region_name=region)


def create_s3_client(profile: str = "default", region: str = None):
    session = create_boto3_session(profile=profile, region=region)
    return session.client("s3")


def get_object(s3_client, bucket: str, key: str):
    obj = s3_client.get_object(
        Bucket=bucket,
        Key=key
    )
    return obj


def setup_logging(logging_level) -> None:
    """Sets up the logging level and format for the logger."""
    if running_on_lambda():
        logging.getLogger().setLevel(logging_level)
    else:
        logging.basicConfig(
            level=logging_level, datefmt="%H:%M:%S",
            format="%(asctime)s - %(levelname)s - %(message)s"
        )

    for logger_name in ["requests", "boto3", "urllib3", "botocore", "s3transfer"]:
        logging.getLogger(logger_name).setLevel(logging.WARNING)


def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            duration = time.perf_counter() - start
            logging.debug(f"'{func.__name__}' took {duration:.2f}s.")
    return wrapper


def get_seconds_until_midnight():
    now = datetime.now(timezone.utc)
    # UTC+1
    tz = timezone(timedelta(hours=1))
    now_tz = now.astimezone(tz)
    midnight = (now_tz + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now_tz).total_seconds())