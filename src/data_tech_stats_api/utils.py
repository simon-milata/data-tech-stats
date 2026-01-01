import os
from datetime import datetime, date
from typing import Any, Literal
from io import BytesIO
from collections import defaultdict
import time
import logging
import functools
from datetime import datetime, timedelta, timezone

import boto3
import pandas as pd


def running_on_lambda() -> bool:
    return "AWS_LAMBDA_FUNCTION_NAME" in os.environ


def create_boto3_session(profile: str = "default", region: str = None):
    if running_on_lambda():
        return boto3.Session(region_name=region)
    return boto3.Session(profile_name=profile, region_name=region)


def create_s3_client(profile: str = "default", region: str = None):
    session = create_boto3_session(profile=profile, region=region)
    return session.client("s3")


def get_objects(s3_client, bucket: str, prefix: str) -> list[dict[str, Any]]:
    objects = s3_client.list_objects_v2(
        Bucket=bucket,
        Prefix=prefix
    )["Contents"][1:]
    return objects


def get_object_keys(objects: list[dict]) -> list:
    return [obj["Key"] for obj in objects]


def filter_object_keys(keys: list[str], suffix: str) -> list[str]:
    return [key for key in keys if key.endswith(suffix)]


def get_object(s3_client, bucket: str, key: str):
    obj = s3_client.get_object(
        Bucket=bucket,
        Key=key
    )
    return obj


def get_date_from_key(key: str) -> date:
    year, month, day = key.split("/")[1:-1:]
    return datetime(int(year), int(month), int(day)).date()


def parse_parquet(obj) -> pd.DataFrame:
    """Reads parquet S3 object and returns table as pandas DataFrame"""
    body = obj["Body"].read()
    return pd.read_parquet(BytesIO(body))


def group_keys_by_period(keys: list[str], period: Literal["week", "month"]) -> dict[str, list[str]]:
    """Groups S3 keys by period (month / week)"""
    grouped_dates = defaultdict(list)
    for key in keys:
        date = get_date_from_key(key)
        if period == "week":
            year_period = f"{date.year}-W{date.isocalendar().week:02}"
        elif period == "month":
            year_period = f"{date.year}-{date.month:02}"
        grouped_dates[year_period].append(key)
    return grouped_dates


def pick_latest_key_per_period(grouped_keys: dict[str, list[str]]) -> dict[str, str]:
    """Picks keys with the latest date for each group"""
    latest_key_per_period = {}
    for key, value in grouped_keys.items():
        latest_key = max(value, key=get_date_from_key)
        latest_key_per_period[key] = latest_key
    return latest_key_per_period


def setup_logging(logging_level) -> None:
    """Setups up the logging level and format for the logger running."""
    if running_on_lambda():
        logging.getLogger().setLevel(logging_level)
    else:
        logging.basicConfig(
            level=logging_level, datefmt="%H:%M:%S",
            format="%(asctime)s - %(levelname)s - %(message)s"
        )
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("s3transfer").setLevel(logging.WARNING)


def timer(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            duration = time.perf_counter() - start
            logging.debug(f"'{func.__name__}' took {duration:.2f}s")
    return wrapper


def get_seconds_until_midnight():
    now = datetime.now(timezone.utc)
    # UTC+1
    tz = timezone(timedelta(hours=1))
    now_tz = now.astimezone(tz)
    midnight = (now_tz + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((midnight - now_tz).total_seconds())