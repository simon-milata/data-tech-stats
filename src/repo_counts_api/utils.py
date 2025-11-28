import os
from datetime import datetime, date
from collections import defaultdict

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


def group_keys_by_week(keys: list[str]) -> dict[str, list[str]]:
    grouped_dates = defaultdict(list)
    for key in keys:
        date = get_date_from_key(key)
        year_week = f"{date.year}-W{date.isocalendar().week:02}"
        grouped_dates[year_week].append(key)

    return grouped_dates


def pick_latest_key_per_week(grouped_keys: dict[str, list[str]]) -> dict[str, str]:
    latest_key_per_week = {}
    for key, value in grouped_keys.items():
        latest_key = max(value, key=get_date_from_key)
        latest_key_per_week[key] = latest_key
    return latest_key_per_week