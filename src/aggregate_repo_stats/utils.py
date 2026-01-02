import os
from datetime import datetime, date
from collections import defaultdict
import json
from typing import Literal
from io import BytesIO

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


def get_all_objects(s3_client, bucket: str, prefix: str):
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


def get_iso_year_week(date: date) -> str:
    """Formats a date into iso {year}-{week} (2025-W48)."""
    iso_year, iso_week, _ = date.isocalendar()
    year_period = f"{iso_year}-W{iso_week:02}"
    return year_period


def group_keys_by_interval(keys: list[str], interval: Literal["weekly", "monthly"]) -> dict[str, list[str]]:
    """Groups S3 keys by period (month / week)"""
    grouped_dates = defaultdict(list)
    for key in keys:
        date = get_date_from_key(key)
        if interval == "weekly":
            year_period = get_iso_year_week(date)
        elif interval == "monthly":
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


def save_data_to_s3(s3_client, bucket: str, path: str, body: dict[str, str]):
    s3_client.put_object(
        Bucket=bucket,
        Key=path,
        Body=json.dumps(body)
    )


def parse_parquet(obj) -> pd.DataFrame:
    """Reads parquet S3 object and returns table as pandas DataFrame"""
    body = obj["Body"].read()
    return pd.read_parquet(BytesIO(body))


def get_latest_date_key(keys: list[str], suffix: str) -> str:
    """Finds the key with the latest date for the suffix"""
    latest = None
    latest_key = None

    for key in keys:
        if not key.endswith(suffix):
            continue

        parts = key.split("/")
        y, m, d = map(int, parts[1:4])
        current = date(y, m, d)

        if latest is None or current > latest:
            latest = current
            latest_key = key

    return latest_key
